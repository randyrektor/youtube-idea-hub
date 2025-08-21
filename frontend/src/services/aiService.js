import { AI_CONFIG } from '../config/ai';

class AIService {
  constructor() {
    this.scoreCache = new Map(); // Cache for storing scored results
    this.initializeOpenAI();
  }

  // Generate hash for idea content to detect changes
  generateIdeaHash(idea) {
    const content = `${idea.title}|${idea.description}|${idea.contentType}|${idea.liftLevel}`;
    return btoa(content).slice(0, 16); // Simple hash for change detection
  }

  // Check if idea has changed and needs re-scoring
  hasIdeaChanged(idea) {
    const currentHash = this.generateIdeaHash(idea);
    const cachedHash = this.scoreCache.get(idea.id)?.hash;
    return currentHash !== cachedHash;
  }

  // Get cached score if available and valid
  getCachedScore(idea) {
    const cached = this.scoreCache.get(idea.id);
    if (cached && !this.hasIdeaChanged(idea)) {
      console.log(`📋 Using cached score for "${idea.title}": ${cached.aiScore}`);
      return cached;
    }
    return null;
  }

  // Cache scored result with hash for change detection
  cacheScore(idea, score) {
    const hash = this.generateIdeaHash(idea);
    this.scoreCache.set(idea.id, {
      ...score,
      hash,
      cachedAt: new Date().toISOString()
    });
    console.log(`💾 Cached score for "${idea.title}": ${score.aiScore}`);
  }

  // Clear cache for specific idea or all ideas
  clearCache(ideaId = null) {
    if (ideaId) {
      this.scoreCache.delete(ideaId);
      console.log(`🗑️ Cleared cache for idea: ${ideaId}`);
    } else {
      this.scoreCache.clear();
      console.log('🗑️ Cleared entire score cache');
    }
  }

  // Get cache statistics
  getCacheStats() {
    const total = this.scoreCache.size;
    const valid = Array.from(this.scoreCache.values()).filter(cached => {
      // Consider cache valid if less than 24 hours old
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      return age < 24 * 60 * 60 * 1000;
    }).length;
    
    return { total, valid, expired: total - valid };
  }

  initializeOpenAI() {
    // Frontend no longer needs OpenAI initialization - all calls go to backend
    console.log('🔧 Frontend AI service initialized - using backend for all AI operations');
  }

  // Generate title variations for an idea - BACKEND ONLY VERSION
  async generateTitleVariations(idea, count = 5) {
    console.log('🚀 Using backend for title generation...');
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: idea.title,
          context: `Web development, JavaScript, modern programming - ${idea.contentType || 'friendly and educational'}`
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend title generation successful!');
        return result.titles || [];
      } else {
        throw new Error(`Backend failed: ${response.status}`);
      }
      
    } catch (error) {
      console.log('⚠️ Backend title generation failed, using frontend:', error.message);
      
      // Fallback to frontend OpenAI
      return this.generateTitleVariationsFrontend(idea, count);
    }
  }

  // Frontend fallback for title generation - now uses backend
  async generateTitleVariationsFrontend(idea, count = 5) {
    console.log('🔄 Frontend fallback using backend for title generation...');
    return this.generateTitleVariations(idea, count);
  }

  // Analyze and score an idea based on current trends and content - now uses backend
  async analyzeIdea(idea, existingIdeas = []) {
    console.log('🔍 Using backend for idea analysis...');
    
    try {
      // Use the backend scoring endpoint for single idea analysis
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/score-titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titles: [idea.title],
          channelSummary: 'Web development, JavaScript, modern programming - Syntax.fm focused',
          forceBatchSize: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Backend analysis failed: ${response.status}`);
      }

      const result = await response.json();
      const score = result.scores[0] || 75;
      
      // Return a structured analysis object
      return {
        overallScore: score,
        breakdown: {
          trendingPotential: Math.floor(score * 0.25),
          uniqueness: Math.floor(score * 0.25),
          audienceAppeal: Math.floor(score * 0.25),
          productionFeasibility: Math.floor(score * 0.25)
        },
        reasoning: `AI analysis completed via backend with score: ${score}`,
        suggestions: ["Review the idea description", "Consider current trends", "Evaluate production complexity"],
        trendingKeywords: ["content", "video", "youtube"],
        analyzedAt: new Date().toISOString(),
        ideaId: idea.id
      };
    } catch (error) {
      console.error('Error analyzing idea via backend:', error);
      // Return fallback analysis
      return {
        overallScore: 75,
        breakdown: {
          trendingPotential: 18,
          uniqueness: 19,
          audienceAppeal: 20,
          productionFeasibility: 18
        },
        reasoning: "AI analysis completed but backend was unavailable",
        suggestions: ["Review the idea description", "Consider current trends", "Evaluate production complexity"],
        trendingKeywords: ["content", "video", "youtube"],
        analyzedAt: new Date().toISOString(),
        ideaId: idea.id
      };
    }
  }

  // Generate new idea suggestions based on existing content and trends - now uses backend
  async generateNewIdeas(existingIdeas = [], ideaPrompt = '', channelFocus = '', count = 3) {
    console.log('💡 Using backend for new idea generation...');
    console.log('💡 Idea prompt:', ideaPrompt);
    console.log('💡 Channel focus:', channelFocus);
    
    try {
      // Use the new backend idea generation endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaPrompt,
          channelFocus,
          count
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend idea generation successful!');
        return result.ideas || [];
            } else {
        throw new Error(`Backend failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error generating new ideas:', error);
      throw new Error('Failed to generate new ideas');
    }
  }

  // Batch analyze multiple ideas for ranking - OPTIMIZED VERSION
  async batchAnalyzeIdeas(ideas) {
    console.log('🚨 batchAnalyzeIdeas called with:', ideas.length, 'ideas');
    console.log('🚨 First idea title:', ideas[0]?.title);
    


    const limitedIdeas = ideas.slice(0, AI_CONFIG.contentAnalysis.maxIdeasToAnalyze);
    
    // CHANNEL-SPECIFIC CONTEXT for accurate scoring
    const channelContext = `
CHANNEL CONTEXT (Syntax.fm - CSS/Code Challenges):
- Top: CSS Battles 3! Recreate an Image with CSS — 295,124 views, 20,786.4h watch time, avg view ~4 min.
- Top: CSS Battle - Re-create an Image with CSS in the Fewest Ch...Code Golf — 164,892 views, 15,436.7h watch time, avg view ~6 min.
- Top: We Recreated Space Invaders in CSS! CSS Battle — 89,686 views, 10,520.2h watch time, avg view ~7 min.
- Top: Coding Snake in CSS?! Kevin Powell Takes the Challenge — 64,665 views, 10,399.4h watch time, avg view ~10 min.
- Top: We play CLASH OF CODE! Shortest JavaScript challenge — 62,587 views, 12,144.2h watch time, avg view ~12 min.
- Retention proxy: top 10 average view duration ~7.8 min.
- Frequent title keywords among top videos: css, battles, recreate, battle, challenge, code.
- Median video baseline: ~19,444 views (use to calibrate Channel Fit).
- Top 10 concentrate ~96,231 hours of watch time (focus on similar topics/angles).

SCORING RULES: CSS battles/challenges=95, code golf=90, building games=90, tutorials=70, creative angles=85+`;

    // SUPER COMPACT PROMPT - Only asks for scores array, no prose
    const prompt = `Score the following ${limitedIdeas.length} titles using your rubric.
Return: {"scores":[...]} with length=${limitedIdeas.length}. Nothing else.

${limitedIdeas.map((idea, index) => `${index + 1}) ${idea.title}`).join('\n')}`;

    try {
      console.log('🚀 Using backend for AI scoring...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/score-titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titles: limitedIdeas.map(idea => idea.title),
          channelSummary: 'Web development, JavaScript, modern programming - Syntax.fm focused',
          forceBatchSize: 0
        })
      });

      if (!response.ok) {
        throw new Error(`Backend scoring failed: ${response.status}`);
      }

      const result = await response.json();
      const scores = result.scores;
      
      console.log('Backend returned scores:', scores);
      
      try {

        
        if (Array.isArray(scores) && scores.length === limitedIdeas.length) {
          // Use actual OpenAI scores
          return limitedIdeas.map((idea, index) => ({
            ...idea,
            aiScore: scores[index],
            analyzedAt: new Date().toISOString()
          }));
        } else {
          throw new Error('Invalid score format');
        }
      } catch (parseError) {
        // No fallback - if parsing fails, return ideas without scores
        return limitedIdeas.map(idea => ({
          ...idea,
          aiScore: undefined,
          analyzedAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error batch analyzing ideas:', error);
      throw new Error('Failed to batch analyze ideas');
    }
  }

  // NEW: Two-pass scoring - First pass gets scores quickly, second pass adds notes for top performers
  async twoPassScoring(ideas) {
    console.log('🚀 Starting two-pass scoring for', ideas.length, 'ideas');
    
    // CACHE CHECK: Separate ideas into cached (unchanged) and uncached (changed/new)
    const cachedIdeas = [];
    const uncachedIdeas = [];
    
    ideas.forEach(idea => {
      const cached = this.getCachedScore(idea);
      if (cached) {
        cachedIdeas.push(cached);
      } else {
        uncachedIdeas.push(idea);
      }
    });
    
    console.log(`📋 Cache hit: ${cachedIdeas.length} ideas, Cache miss: ${uncachedIdeas.length} ideas`);
    
    let scoredIdeas = [...cachedIdeas];
    
    // Only score uncached ideas
    if (uncachedIdeas.length > 0) {
      console.log('📊 PASS 1: Quick scoring for uncached ideas...');
      const newlyScoredIdeas = await this.fastBatchScore(uncachedIdeas);
      
      // Cache the new scores
      newlyScoredIdeas.forEach(idea => {
        if (idea.aiScore !== undefined) {
          this.cacheScore(idea, idea);
        }
      });
      
      scoredIdeas.push(...newlyScoredIdeas);
    }
    
    // Sort by score to identify top performers
    const sortedIdeas = scoredIdeas
      .filter(idea => idea.aiScore !== undefined)
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    
    console.log(`🏆 Top scores: ${sortedIdeas.slice(0, 5).map(i => `${i.title}: ${i.aiScore}`).join(', ')}`);
    
    // PASS 2: Add detailed notes only for top 15-20 ideas
    const topIdeasCount = Math.min(20, Math.ceil(ideas.length * 0.2)); // Top 20% or 20, whichever is smaller
    const topIdeas = sortedIdeas.slice(0, topIdeasCount);
    
    if (topIdeas.length > 0) {
      console.log(`📝 PASS 2: Adding detailed notes for top ${topIdeas.length} ideas...`);
      await this.addDetailedNotes(topIdeas);
    }
    
    console.log('✅ Two-pass scoring completed!');
    return scoredIdeas;
  }

  // Helper: Add detailed notes to top-performing ideas - simplified for backend
  async addDetailedNotes(topIdeas) {
    if (topIdeas.length === 0) return;
    
    console.log('📝 Adding improvement notes to top ideas...');
    
    // For now, add simple improvement notes since backend doesn't have detailed analysis yet
    topIdeas.forEach((idea, index) => {
      // Generate simple improvement suggestions based on score
      if (idea.aiScore >= 90) {
        idea.improvementNote = "High performer - consider expanding";
      } else if (idea.aiScore >= 80) {
        idea.improvementNote = "Good potential - refine title";
      } else if (idea.aiScore >= 70) {
        idea.improvementNote = "Solid idea - test variations";
      } else {
        idea.improvementNote = "Review and iterate";
      }
    });
    
    console.log(`📝 Added improvement notes to ${topIdeas.length} top ideas`);
  }

  // NEW: Fast batch scoring for multiple ideas - OPTIMIZED FOR FEWER, LARGER BATCHES
  async fastBatchScore(ideas) {
    console.log('🚨 fastBatchScore called with:', ideas.length, 'ideas');
    console.log('🚨 Ideas to score:', ideas.map(i => i.title));
    


    // OPTIMIZATION: Use fewer, larger batches (2-4 max) instead of many small ones
    let batchSize;
    if (ideas.length <= 50) {
      batchSize = ideas.length; // Single batch for 50 or fewer ideas
    } else if (ideas.length <= 100) {
      batchSize = Math.ceil(ideas.length / 2); // 2 batches max
    } else if (ideas.length <= 200) {
      batchSize = Math.ceil(ideas.length / 3); // 3 batches max
    } else {
      batchSize = Math.ceil(ideas.length / 4); // 4 batches max
    }
    
    console.log(`🚀 Using ${Math.ceil(ideas.length / batchSize)} batches of size ${batchSize} for faster processing`);
    
    // PARALLEL PROCESSING: Replace sequential loop with controlled concurrency
    const concurrency = 4; // Tune 3-6 depending on rate limits
    console.log(`⚡ Running up to ${concurrency} batches in parallel for maximum speed`);
    
    // Create chunks of ideas
    const chunks = [];
    for (let i = 0; i < ideas.length; i += batchSize) {
      chunks.push(ideas.slice(i, i + batchSize));
    }
    
    const results = [];
    let idx = 0;
    
    // Process chunks with controlled concurrency
    while (idx < chunks.length) {
      const slice = chunks.slice(idx, idx + concurrency);
      console.log(`🚀 Processing batch ${Math.floor(idx / concurrency) + 1}: ${slice.length} chunks in parallel`);
      
      const settled = await Promise.allSettled(slice.map(batch => this.batchAnalyzeIdeas(batch)));
      
      for (let i = 0; i < slice.length; i++) {
        const batch = slice[i];
        const r = settled[i];
        
        if (r.status === "fulfilled") {
          results.push(...r.value);
          console.log(`✅ Batch completed successfully with ${r.value.length} scored ideas`);
        } else {
          // Graceful fallback; don't block others
          console.warn(`⚠️ Batch failed, using fallback scores for ${batch.length} ideas:`, r.reason);
          results.push(...batch.map(idea => ({ 
            ...idea, 
            aiScore: undefined, 
            analyzedAt: new Date().toISOString() 
          })));
        }
      }
      
      idx += concurrency;
      
      // Minimal delay between concurrency groups to respect rate limits
      if (idx < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between concurrency groups
      }
    }
    
    console.log(`🎉 Parallel processing completed! Scored ${results.length} ideas in ${Math.ceil(chunks.length / concurrency)} concurrency groups`);
    return results;
  }

  // NEW: Incremental scoring - Only re-score specific changed ideas
  async incrementalScoring(ideas, changedIdeaIds = []) {
    console.log(`🔄 Incremental scoring for ${ideas.length} ideas, ${changedIdeaIds.length} changed`);
    
    if (changedIdeaIds.length === 0) {
      console.log('✅ No changes detected, using cached scores');
      return this.getCachedIdeas(ideas);
    }
    
    // Separate changed and unchanged ideas
    const changedIdeas = ideas.filter(idea => changedIdeaIds.includes(idea.id));
    const unchangedIdeas = ideas.filter(idea => !changedIdeaIds.includes(idea.id));
    
    console.log(`📝 Re-scoring ${changedIdeas.length} changed ideas, keeping ${unchangedIdeas.length} cached`);
    
    // Get cached scores for unchanged ideas
    const cachedIdeas = unchangedIdeas.map(idea => this.getCachedScore(idea)).filter(Boolean);
    
    // Score only the changed ideas
    let newlyScoredIdeas = [];
    if (changedIdeas.length > 0) {
      newlyScoredIdeas = await this.fastBatchScore(changedIdeas);
      
      // Cache the new scores
      newlyScoredIdeas.forEach(idea => {
        if (idea.aiScore !== undefined) {
          this.cacheScore(idea, idea);
        }
      });
    }
    
    // Combine cached and newly scored ideas
    const allScoredIdeas = [...cachedIdeas, ...newlyScoredIdeas];
    
    console.log(`✅ Incremental scoring completed: ${cachedIdeas.length} cached + ${newlyScoredIdeas.length} new`);
    return allScoredIdeas;
  }

  // Helper: Get all cached ideas (for unchanged ideas)
  getCachedIdeas(ideas) {
    return ideas.map(idea => this.getCachedScore(idea)).filter(Boolean);
  }

  // NEW: Detect changes by comparing current ideas with previous state
  detectChanges(currentIdeas, previousIdeas = []) {
    const changedIds = [];
    
    // Create a map of previous ideas for quick lookup
    const previousMap = new Map(previousIdeas.map(idea => [idea.id, idea]));
    
    currentIdeas.forEach(idea => {
      const previous = previousMap.get(idea.id);
      
      if (!previous) {
        // New idea
        changedIds.push(idea.id);
        console.log(`🆕 New idea detected: "${idea.title}"`);
      } else if (this.hasIdeaChanged(idea)) {
        // Changed idea
        changedIds.push(idea.id);
        console.log(`📝 Idea changed: "${idea.title}"`);
      }
    });
    
    // Check for deleted ideas
    const currentIds = new Set(currentIdeas.map(idea => idea.id));
    previousIdeas.forEach(idea => {
      if (!currentIds.has(idea.id)) {
        console.log(`🗑️ Idea deleted: "${idea.title}"`);
        this.clearCache(idea.id); // Clean up cache for deleted ideas
      }
    });
    
    console.log(`🔍 Change detection: ${changedIds.length} ideas modified out of ${currentIdeas.length} total`);
    return changedIds;
  }

  // NEW: Smart scoring that automatically chooses between full, incremental, or cached
  /**
   * @param {Array} ideas - Current ideas to score
   * @param {Array} previousIdeas - Previous state for change detection
   * @returns {Promise<Array>} Scored ideas
   */
  async smartScoring(ideas, previousIdeas = []) {
    console.log('🧠 Smart scoring analysis...');
    
    // Check cache hit rate
    const cacheStats = this.getCacheStats();
    const cacheHitRate = ideas.length > 0 ? cacheStats.valid / ideas.length : 0;
    
    console.log(`📊 Cache stats: ${cacheStats.valid}/${ideas.length} valid (${(cacheHitRate * 100).toFixed(1)}% hit rate)`);
    
    // Detect what changed
    const changedIds = this.detectChanges(ideas, previousIdeas);
    
    // Choose optimal scoring strategy
    if (changedIds.length === 0 && cacheHitRate > 0.8) {
      console.log('🚀 High cache hit rate, using cached scores only');
      return this.getCachedIdeas(ideas);
    } else if (changedIds.length <= Math.ceil(ideas.length * 0.1)) {
      console.log('🔄 Few changes detected, trying backend scoring first...');
      
      // Try backend for incremental scoring
      const backendResult = await this.tryBackendScoring(ideas);
      if (backendResult) {
        return backendResult;
      }
      
      console.log('🔄 Backend failed, using frontend incremental scoring');
      return this.incrementalScoring(ideas, changedIds);
    } else {
      console.log('🔄 Many changes detected, trying backend scoring first...');
      
      // Try backend for full scoring
      const backendResult = await this.tryBackendScoring(ideas);
      if (backendResult) {
        return backendResult;
      }
      
      console.log('🔄 Backend failed, using frontend two-pass scoring');
      return this.twoPassScoring(ideas);
    }
  }

  // NEW: Try backend scoring first, fallback to frontend
  async tryBackendScoring(ideas) {
    try {
      console.log('🚀 Attempting backend scoring for maximum performance...');
      
      const titles = ideas.map(idea => idea.title);
      const channelSummary = `Syntax.fm - Web Development/JavaScript with 1.2M+ views on JavaScript tutorials, React development, and web dev tips`;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/score-titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titles,
          channelSummary,
          forceBatchSize: 0 // Let backend decide optimal batching
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend scoring failed: ${response.status}`);
      }
      
      const result = await response.json();
      const scores = result.scores;
      
      if (Array.isArray(scores) && scores.length === ideas.length) {
        console.log('✅ Backend scoring successful!');
        
        // Convert to our format and cache results
        const scoredIdeas = ideas.map((idea, index) => {
          const scoredIdea = {
            ...idea,
            aiScore: scores[index],
            analyzedAt: new Date().toISOString()
          };
          
          // Cache the result
          this.cacheScore(idea, scoredIdea);
          
          return scoredIdea;
        });
        
        return scoredIdeas;
      } else {
        throw new Error('Invalid backend response format');
      }
      
    } catch (error) {
      console.log('⚠️ Backend scoring failed, falling back to frontend:', error.message);
      return null; // Signal to use frontend fallback
    }
  }

  // Get YouTube trends analysis (placeholder for future API integration)
  async getYouTubeTrends() {
    // This would integrate with YouTube Trends API in the future
    return {
      trendingTopics: ['AI tools', 'Remote work', 'Sustainability', 'Mental health', 'Tech reviews'],
      trendingKeywords: ['how to', 'tutorial', 'review', 'comparison', 'challenge'],
      seasonalTrends: ['New Year resolutions', 'Summer activities', 'Holiday content', 'Back to school'],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
