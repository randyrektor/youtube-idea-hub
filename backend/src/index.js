// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fetch = require('node-fetch');
const { supabase } = require('./supabase');
const { authenticateUser, checkRateLimit, trackAIUsage } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// HTTP Keep-Alive agent for faster OpenAI API calls
const agent = new https.Agent({ keepAlive: true });

// Environment variable configuration
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Function to get the current API key from environment variables only
const getOpenAIAPIKey = () => {
  return process.env.OPENAI_API_KEY;
};

// Validate required environment variables
if (!getOpenAIAPIKey()) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY not configured');
  console.warn('   AI features will not work until this is configured');
  console.warn('   Set it in your .env file, environment, or via the frontend settings');
}

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow ANY Vercel deployment
    if (origin.includes('vercel.app') || origin.includes('vercel.com')) {
      return callback(null, true);
    }
    
    // Allow your custom domain if you have one
    if (origin.includes('youtube-idea-hub')) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('🚫 CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Apply AI usage tracking to all API routes
app.use('/api', trackAIUsage);

// User preferences endpoint
app.get('/api/user/preferences', authenticateUser, async (req, res) => {
  try {
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json(preferences || { 
      user_id: req.user.id,
      theme: 'light',
      ai_enabled: true,
      notification_preferences: {}
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

app.put('/api/user/preferences', authenticateUser, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: req.user.id,
        ...updates
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// Routes
app.get('/health', (req, res) => {
  // Health check endpoint - updated to trigger Render deployment
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/ideas', '/api/score-titles', '/api/generate-titles', '/api/alt-titles', '/api/settings'],
    hasApiKey: !!getOpenAIAPIKey()
  });
});

// Get user's ideas from Supabase
app.get('/api/ideas', authenticateUser, async (req, res) => {
  try {
    const { data: ideas, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(ideas || []);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// Create new idea in Supabase
app.post('/api/ideas', authenticateUser, async (req, res) => {
  try {
    const newIdea = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ideas')
      .insert([newIdea])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// Update idea in Supabase
app.put('/api/ideas/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id) // Ensure user owns the idea
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Idea not found or access denied' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

// Delete idea from Supabase
app.delete('/api/ideas/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id); // Ensure user owns the idea

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// NEW: Optimized AI Scoring Endpoint with HTTP Keep-Alive and Parallel Processing
app.post('/api/score-titles', authenticateUser, checkRateLimit, async (req, res) => {
  try {
    const { titles = [], channelSummary = "", forceBatchSize = 0 } = req.body;
    
    if (!Array.isArray(titles) || titles.length === 0) {
      return res.status(400).json({ error: "Provide titles: string[]" });
    }
    
    if (!getOpenAIAPIKey()) {
      return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
    }

    console.log(`🚀 Starting optimized scoring for ${titles.length} titles`);

    // ---- OPTIMIZED BATCHING STRATEGY ----
    // Prefer 1 shot; if payload is too big, split into 2–4 chunks
    const batchSize = forceBatchSize || (titles.length > 60 ? Math.ceil(titles.length / 3) : titles.length);
    const chunks = [];
    
    for (let i = 0; i < titles.length; i += batchSize) {
      chunks.push(titles.slice(i, i + batchSize));
    }

    console.log(`📦 Using ${chunks.length} chunks of size ${batchSize}`);

    // CHANNEL-SPECIFIC CONTEXT for accurate scoring
    const channelContext = `
CHANNEL CONTEXT (Syntax.fm - Web Development & JavaScript):
- Top: "We Built an App with 1-Star NPM Packages" — 450K+ views, highly engaging, creative development
- Top: "Reacting to Most Downloaded NPM Packages" — 380K+ views, tech commentary, trend analysis  
- Top: "JavaScript Tips Every Developer Should Know" — 320K+ views, practical tutorials, evergreen
- Top: "Building a Full-Stack App with React and Node.js" — 280K+ views, comprehensive tutorials
- Top: "This Or That: Web Tech Edition" — 250K+ views, interactive content, decision-making
- Retention proxy: top 10 average view duration ~10-15 min.
- Frequent title keywords: javascript, react, web development, npm, packages, tips, building, app.
- Median video baseline: ~150K views (use to calibrate Channel Fit).
- Top 10 concentrate ~2M+ hours of watch time (focus on practical development content).

SCORING RULES: Creative development projects=95, Tech reactions/commentary=90, Tutorials/tips=85, Interactive content=88, Nostalgic/fun tech=85+`;

    const makePrompt = (ts) => {
      const numbered = ts.map((t, i) => `${i + 1}) ${t}`).join("\n");
      return `
SYSTEM: Return ONLY valid JSON: {"scores":[ints]} where length=${ts.length}. No text. ${channelContext}

USER:
You score YouTube titles 0–100 using this OPTIMISTIC rubric (aim for 70-95 range for good content):
- Topic Momentum (25%) — trending topics, evergreen value, developer interest level
- Channel Fit (35%) — alignment with Syntax.fm's successful content (creative projects, reactions, tutorials)  
- Title & Idea Strength (40%) — CTR potential, clarity, novelty, entertainment value

BASELINE SCORING GUIDANCE:
- Creative/unique projects (like 1-star NPM, Hot Wheels computer): 85-95
- Tech reactions/commentary (like "Reacting to NPM packages"): 80-90  
- Interactive content (like "This or That"): 80-88
- Nostalgic/fun tech content: 80-85
- Standard tutorials with good hooks: 75-85
- Basic tutorials without hooks: 65-75

Channel summary (1–5 lines, optional):
${channelSummary || "(none)"}

Titles:
${numbered}

Return exactly:
{"scores":[...]} (length=${ts.length})
`;
    };

    // Run up to 4 chunks in parallel for speed; adjust if you hit rate limits
    const concurrency = Math.min(4, chunks.length);
    const out = new Array(titles.length);

    // Helper to run one batch
    const runBatch = async (ts, offset) => {
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          agent,
          headers: {
            "Authorization": `Bearer ${getOpenAIAPIKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: makePrompt(ts) }],
            // TIGHT output: integers only, fast + cheap
            max_tokens: 80,               // important: tiny completion
            temperature: 0.1,             // deterministic, faster
            response_format: { type: "json_object" } // JSON mode
          }),
        });

        if (!r.ok) {
          const err = await r.text();
          throw new Error(`OpenAI error ${r.status}: ${err}`);
        }
        
        const data = await r.json();
        const content = data?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content);
        const scores = parsed?.scores || [];
        
        if (!Array.isArray(scores) || scores.length !== ts.length) {
          throw new Error(`Bad JSON length: expected ${ts.length}, got ${scores.length}`);
        }
        
        for (let i = 0; i < scores.length; i++) {
          out[offset + i] = scores[i];
        }
        
        console.log(`✅ Batch completed: ${ts.length} titles scored`);
      } catch (error) {
        console.error(`❌ Batch failed:`, error.message);
        // Fill with fallback scores on error
        for (let i = 0; i < ts.length; i++) {
          out[offset + i] = 75; // Fallback score
        }
      }
    };

    // Simple windowed parallelization
    let i = 0;
    while (i < chunks.length) {
      const slice = chunks.slice(i, i + concurrency);
      console.log(`🚀 Processing batch ${Math.floor(i / concurrency) + 1}: ${slice.length} chunks in parallel`);
      
      await Promise.all(slice.map((ts, idx) => runBatch(ts, (i + idx) * batchSize)));
      i += concurrency;
      
      // Small delay between concurrency groups to respect rate limits
      if (i < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎉 Scoring completed! Processed ${titles.length} titles in ${chunks.length} batches`);
    res.json({ scores: out });
    
  } catch (e) {
    console.error('Scoring endpoint error:', e);
    res.status(500).json({ error: e.message || "Scoring failed" });
  }
});

// NEW: Fast Title Generation Endpoint - Micro tokens, deterministic output
app.post('/api/generate-titles', authenticateUser, checkRateLimit, async (req, res) => {
  try {
    const { title, context = "" } = req.body || {};
    
    if (!title) {
      return res.status(400).json({ error: "title required" });
    }
    
    if (!getOpenAIAPIKey()) {
      return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
    }

    console.log(`🚀 Generating titles for: "${title}"`);

    // OPTIMIZED PROMPT - Focus on preserving core concept and clickability
    const prompt = `Here's my YouTube idea: "${title}"

Can you make 5 variations of this title for me based on current trends, what works well on www.youtube.com/@syntaxfm, and what feels like something you'd want to click?

Keep the core concept and heart of the video. Make them punchy, clear benefit, non-clickbait, 10-65 characters.
Return exactly: {"titles":[...]}`;

    try {
      const completion = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        agent,
        headers: {
          "Authorization": `Bearer ${getOpenAIAPIKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { 
              role: 'system', 
              content: 'Return ONLY valid JSON: {"titles":[string,string,string,string,string]}. No prose.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 100,            // tight - 5 titles × ~10-12 words each
          temperature: 0.7,           // creative but consistent
          response_format: { type: 'json_object' }, // JSON mode = no explanations
          presence_penalty: 0.3       // reduce repeats without bloating output
        }),
      });

      if (!completion.ok) {
        const err = await completion.text();
        return res.status(completion.status).json({ error: err });
      }
      
      const data = await completion.json();
      const content = data?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const titles = parsed?.titles || [];
      
      if (!Array.isArray(titles) || titles.length === 0) {
        throw new Error('Invalid title format from OpenAI');
      }
      
      console.log(`✅ Generated ${titles.length} titles in ${data.usage?.total_tokens || 'unknown'} tokens`);
      res.json({ titles: titles });
      
    } catch (error) {
      console.error('Title generation error:', error);
      res.status(500).json({ error: error.message || "Title generation failed" });
    }
    
  } catch (e) {
    console.error('Title generation endpoint error:', e);
    res.status(500).json({ error: e.message || "Title generation failed" });
  }
});

// ALIAS: Alternative titles endpoint for compatibility
app.post('/api/alt-titles', authenticateUser, checkRateLimit, async (req, res) => {
  try {
    const { title, context = "" } = req.body || {};
    
    if (!title) {
      return res.status(400).json({ error: "title required" });
    }
    
    if (!getOpenAIAPIKey()) {
      return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
    }

    console.log(`🚀 Generating alt titles for: "${title}"`);

    // OPTIMIZED PROMPT - Focus on preserving core concept and clickability
    const prompt = `Here's my YouTube idea: "${title}"

Can you make 5 variations of this title for me based on current trends, what works well on www.youtube.com/@syntaxfm, and what feels like something you'd want to click?

Keep the core concept and heart of the video. Make them punchy, clear benefit, non-clickbait, 10-65 characters.
Return exactly: {"titles":[...]}`;

    try {
      const completion = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        agent,
        headers: {
          "Authorization": `Bearer ${getOpenAIAPIKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { 
              role: 'system', 
              content: 'Return ONLY valid JSON: {"titles":[string,string,string,string,string]}. No prose.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 100,            // tight - 5 titles × ~10-12 words each
          temperature: 0.7,           // creative but consistent
          response_format: { type: 'json_object' }, // JSON mode = no explanations
          presence_penalty: 0.3       // reduce repeats without bloating output
        }),
      });

      if (!completion.ok) {
        const err = await completion.text();
        return res.status(completion.status).json({ error: err });
      }
      
      const data = await completion.json();
      const content = data?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const titles = parsed?.titles || [];
      
      if (!Array.isArray(titles) || titles.length === 0) {
        throw new Error('Invalid title format from OpenAI');
      }
      
      console.log(`✅ Generated ${titles.length} alt titles in ${data.usage?.total_tokens || 'unknown'} tokens`);
      res.json({ titles: titles });
      
    } catch (error) {
      console.error('Alt title generation error:', error);
      res.status(500).json({ error: error.message || "Alt title generation failed" });
    }
    
  } catch (e) {
    console.error('Alt title generation endpoint error:', e);
    res.status(500).json({ error: e.message || "Alt title generation failed" });
  }
});

// NEW: AI Idea Generation Endpoint
app.post('/api/generate-ideas', authenticateUser, checkRateLimit, async (req, res) => {
  try {
    const { ideaPrompt, channelFocus = "", count = 3 } = req.body || {};
    
    if (!ideaPrompt) {
      return res.status(400).json({ error: "ideaPrompt required" });
    }
    
    if (!getOpenAIAPIKey()) {
      return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
    }

    console.log(`🚀 Generating ${count} ideas for: "${ideaPrompt}"`);

    // OPTIMIZED PROMPT - Focus on generating creative content ideas with Syntax.fm-optimized titles
    const prompt = `You are a creative content strategist for Syntax.fm, a successful YouTube channel focused on web development and JavaScript.

Here's what the creator wants to make: "${ideaPrompt}"

${channelFocus ? `Additional context: ${channelFocus}` : ''}

CHANNEL CONTEXT (Syntax.fm - Web Development & JavaScript):
- Top: "We Built an App with 1-Star NPM Packages" — 450K+ views, highly engaging, creative development
- Top: "Reacting to Most Downloaded NPM Packages" — 380K+ views, tech commentary, trend analysis  
- Top: "JavaScript Tips Every Developer Should Know" — 320K+ views, practical tutorials, evergreen
- Top: "Building a Full-Stack App with React and Node.js" — 280K+ views, comprehensive tutorials
- Top: "This Or That: Web Tech Edition" — 250K+ views, interactive content, decision-making
- Retention proxy: top 10 average view duration ~10-15 min.
- Frequent title keywords: javascript, react, web development, npm, packages, tips, building, app.
- Median video baseline: ~150K views (use to calibrate Channel Fit).
- Top 10 concentrate ~2M+ hours of watch time (focus on practical development content).

TITLE OPTIMIZATION RULES:
- Use the same title patterns that work well on Syntax.fm
- Focus on creative development projects, tech reactions, and practical tutorials
- Make titles punchy, clear benefit, non-clickbait
- Aim for 10-65 characters
- Use keywords that resonate with the Syntax.fm audience

Generate ${count} creative video ideas that match this concept. Each idea should include:
- A compelling title (10-65 characters) optimized for Syntax.fm's audience
- A brief description of the video content
- Content type (e.g., Tutorial, Challenge, Review, Reaction, Build, Comparison)
- Lift level (Low, Mid, or Huge - based on potential impact and effort)

Return exactly: {"ideas":[{"title":"...","description":"...","type":"...","lift":"..."}]}`;

    try {
      const completion = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        agent,
        headers: {
          "Authorization": `Bearer ${getOpenAIAPIKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { 
              role: 'system', 
              content: 'Return ONLY valid JSON with the exact structure requested. No prose or explanations.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,            // enough for multiple ideas with descriptions
          temperature: 0.8,           // creative but consistent
          response_format: { type: 'json_object' }, // JSON mode = no explanations
          presence_penalty: 0.3       // reduce repeats without bloating output
        }),
      });

      if (!completion.ok) {
        const err = await completion.text();
        return res.status(completion.status).json({ error: err });
      }
      
      const data = await completion.json();
      const content = data?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const ideas = parsed?.ideas || [];
      
      if (!Array.isArray(ideas) || ideas.length === 0) {
        throw new Error('Invalid idea format from OpenAI');
      }
      
      console.log(`✅ Generated ${ideas.length} ideas in ${data.usage?.total_tokens || 'unknown'} tokens`);
      
      // Score the generated ideas using the existing scoring endpoint
      try {
        console.log('🔍 Starting to score ideas...');
        const titles = ideas.map(idea => idea.title);
        console.log('🔍 Titles to score:', titles);
        
        const scoringResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          agent,
          headers: {
            "Authorization": `Bearer ${getOpenAIAPIKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ 
              role: "user", 
              content: `Score these ${titles.length} YouTube titles 0-100 using this OPTIMISTIC rubric (aim for 70-95 range for good content):
- Topic Momentum (25%) — trending topics, evergreen value, developer interest level
- Channel Fit (35%) — alignment with Syntax.fm's successful content (creative projects, reactions, tutorials)  
- Title & Idea Strength (40%) — CTR potential, clarity, novelty, entertainment value

CHANNEL CONTEXT (Syntax.fm - Web Development & JavaScript):
- Top: "We Built an App with 1-Star NPM Packages" — 450K+ views, highly engaging, creative development
- Top: "Reacting to Most Downloaded NPM Packages" — 380K+ views, tech commentary, trend analysis  
- Top: "JavaScript Tips Every Developer Should Know" — 320K+ views, practical tutorials, evergreen
- Top: "Building a Full-Stack App with React and Node.js" — 280K+ views, comprehensive tutorials
- Top: "This Or That: Web Tech Edition" — 250K+ views, interactive content, decision-making
- Retention proxy: top 10 average view duration ~10-15 min.
- Frequent title keywords: javascript, react, web development, npm, packages, tips, building, app.
- Median video baseline: ~150K views (use to calibrate Channel Fit).
- Top 10 concentrate ~2M+ hours of watch time (focus on practical development content).

SCORING RULES: Creative development projects=95, Tech reactions/commentary=90, Tutorials/tips=85, Interactive content=88, Nostalgic/fun tech=85+

Return a JSON response with this exact format: {"scores":[ints]} with length=${titles.length}. Nothing else.

${titles.map((title, i) => `${i + 1}) ${title}`).join('\n')}`
            }],
            max_tokens: 80,
            temperature: 0.1,
            response_format: { type: "json_object" }
          }),
        });

        if (scoringResponse.ok) {
          const scoringData = await scoringResponse.json();
          const scoringContent = scoringData?.choices?.[0]?.message?.content ?? "{}";
          console.log('🔍 Scoring response content:', scoringContent);
          
          const scoringParsed = JSON.parse(scoringContent);
          const scores = scoringParsed?.scores || [];
          console.log('🔍 Parsed scores:', scores);
          console.log('🔍 Scores length:', scores.length);
          console.log('🔍 Ideas length:', ideas.length);
          
          // Add scores to ideas
          const scoredIdeas = ideas.map((idea, index) => {
            const score = scores[index] || 75;
            console.log(`🔍 Idea ${index} "${idea.title}" gets score: ${score}`);
            return {
              ...idea,
              aiScore: score
            };
          });
          
          console.log(`✅ Generated and scored ${scoredIdeas.length} ideas in ${data.usage?.total_tokens || 'unknown'} tokens`);
          res.json({ ideas: scoredIdeas });
        } else {
          // If scoring fails, return ideas without scores
          console.log(`⚠️ Scoring failed with status: ${scoringResponse.status}`);
          const errorText = await scoringResponse.text();
          console.log(`⚠️ Scoring error response: ${errorText}`);
          res.json({ ideas: ideas });
        }
      } catch (scoringError) {
        console.error('Scoring error:', scoringError);
        console.error('Scoring error stack:', scoringError.stack);
        // Return ideas without scores if scoring fails
        res.json({ ideas: ideas });
      }
      
    } catch (error) {
      console.error('Idea generation error:', error);
      res.status(500).json({ error: error.message || "Idea generation failed" });
    }
    
  } catch (e) {
    console.error('Idea generation endpoint error:', e);
    res.status(500).json({ error: e.message || "Idea generation failed" });
  }
});

// Environment status endpoint
app.get('/api/settings', (req, res) => {
  res.json({
    hasApiKey: !!getOpenAIAPIKey(),
    model: MODEL,
    status: 'ok',
    message: getOpenAIAPIKey() ? 'API key configured' : 'No API key configured'
  });
});

// SECURITY: API key management is disabled for production safety
// API keys should only be set via environment variables or secure secret management
app.post('/api/settings/api-key', (req, res) => {
  res.status(403).json({ 
    error: 'API key management via HTTP is disabled for security',
    message: 'Please set OPENAI_API_KEY environment variable instead',
    instructions: [
      '1. Create a .env file in the backend directory',
      '2. Add: OPENAI_API_KEY=sk-your-actual-key-here',
      '3. Restart the backend server',
      '4. Never commit .env files to version control'
    ]
  });
});

app.delete('/api/settings/api-key', (req, res) => {
  res.status(403).json({ 
    error: 'API key removal via HTTP is disabled for security',
    message: 'Please remove OPENAI_API_KEY from environment variables and restart'
  });
});

// Environment info page
app.get('/settings', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Backend Environment Status</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .status { padding: 15px; margin: 15px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>🔧 Backend Environment Status</h1>
      
      <div class="form-group">
        <label>Current Status:</label>
        <div id="status" class="status info">Loading...</div>
      </div>
      
      <div class="form-group">
        <h3>📋 Setup Instructions:</h3>
        <div class="status warning">
          <strong>To configure OpenAI API key:</strong><br>
          1. Create a <code>.env</code> file in the backend directory<br>
          2. Add: <code>OPENAI_API_KEY=sk-your-key-here</code><br>
          3. Restart the backend server<br>
          <br>
          <strong>Or set environment variable:</strong><br>
          <code>export OPENAI_API_KEY="sk-your-key-here"</code>
        </div>
      </div>
      
      <div class="form-group">
        <h3>🧪 Quick Test:</h3>
        <button onclick="testApiKey()">Test API Key</button>
        <div id="testResult"></div>
      </div>
      
      <script>
        // Load current status
        loadStatus();
        
        async function loadStatus() {
          try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            const statusDiv = document.getElementById('status');
            
            if (data.hasApiKey) {
              statusDiv.className = 'status success';
              statusDiv.innerHTML = '✅ API Key is configured and ready to use<br><small>Configured via environment variable</small>';
            } else {
              statusDiv.className = 'status error';
              statusDiv.innerHTML = '❌ No API Key configured<br><small>Set OPENAI_API_KEY environment variable</small>';
            }
          } catch (error) {
            document.getElementById('status').className = 'status error';
            document.getElementById('status').textContent = '❌ Error loading status';
          }
        }
        
        async function testApiKey() {
          const resultDiv = document.getElementById('testResult');
          resultDiv.innerHTML = '🔄 Testing...';
          
          try {
            const response = await fetch('/api/alt-titles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                title: 'Test Title', 
                context: 'Test Context' 
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              resultDiv.innerHTML = '✅ Success! API is working. Response: ' + JSON.stringify(data, null, 2);
            } else {
              const error = await response.text();
              resultDiv.innerHTML = '❌ Error: ' + error;
            }
          } catch (error) {
            resultDiv.innerHTML = '❌ Network Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`�� Frontend should be running on http://localhost:3000`);
});