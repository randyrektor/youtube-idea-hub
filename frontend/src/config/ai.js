// AI Configuration and API Keys
export const AI_CONFIG = {
  // OpenAI Configuration
  openai: {
    model: 'gpt-4o-mini', // Faster and cheaper than gpt-4
    maxTokens: 1000,
    temperature: 0.7,
  },
  
  // YouTube Trends API (placeholder for future implementation)
  youtubeTrends: {
    enabled: false,
    apiKey: '', // Will be implemented when backend is ready
  },
  
  // Content Analysis Settings
  contentAnalysis: {
    maxIdeasToAnalyze: 50,
    scoringCriteria: ['trending', 'uniqueness', 'audience_appeal', 'production_feasibility'],
    minScoreThreshold: 60,
  },

  // Channel Context for Better Title Suggestions - UPDATED TO MATCH SYNTAX.FM
  channelContext: {
    name: 'Syntax.fm',
    niche: 'Web Development, JavaScript, and Modern Programming',
    audience: 'Web developers, JavaScript developers, and programming enthusiasts',
    contentStyle: 'Educational, practical, and community-focused tutorials and discussions',
    tone: 'Friendly, knowledgeable, and approachable - like learning from a friend',
    commonTopics: [
      'JavaScript', 'React', 'Vue', 'Node.js', 'CSS', 'HTML', 
      'web development', 'programming tips', 'developer tools', 
      'frontend frameworks', 'backend development', 'API development',
      'developer productivity', 'coding best practices', 'new web technologies'
    ],
    titlePatterns: [
      'How to [Action] in [Framework]',
      '[Number] [Framework] Tips You Need',
      'The [Framework] Guide You Need',
      '[Topic] in [Timeframe] - Tutorial',
      'Why [Technology] is Changing [Industry]',
      'Building [Project] with [Technology]',
      '[Framework] vs [Alternative] - Which?',
      'The Ultimate [Topic] Guide [Year]',
      'Reacting to [New Technology]',
      'How I Built [Project] in [Time]'
    ],
    powerWords: [
      'ultimate', 'complete', 'essential', 'comprehensive', 'practical', 
      'hands-on', 'real-world', 'production-ready', 'modern', 'efficient',
      'scalable', 'maintainable', 'professional', 'expert', 'master'
    ]
  }
};

// Helper function to check if AI is configured
export const isAIConfigured = () => {
  try {
    console.log('🚨 isAIConfigured() called');
    
    // Check if we have a local API key
    const localKey = localStorage.getItem('youtube-idea-hub-openai-key');
    if (localKey) {
      console.log('🚨 Local API key found:', !!localKey, 'Length:', localKey ? localKey.length : 0);
      return true;
    }
    
    // Check if backend URL is configured (either from env or localStorage fallback)
    const backendUrl = process.env.REACT_APP_API_URL || localStorage.getItem('youtube-idea-hub-backend-url');
    if (backendUrl) {
      console.log('🚨 Backend URL configured:', backendUrl);
      console.log('🚨 Allowing AI features (backend will handle AI calls)');
      return true; // Allow AI features to run, backend will handle the actual AI calls
    }
    
    // If no local key and no backend URL, AI is not configured
    console.log('🚨 No local API key and no backend URL configured');
    return false;
    
  } catch (error) {
    console.log('🚨 isAIConfigured() error:', error.message);
    return false;
  }
};

// Helper function to get API key with validation
export const getOpenAIKey = () => {
  // Try to get from localStorage first
  const key = localStorage.getItem('youtube-idea-hub-openai-key');
  
  // Fallback to environment variable for development (not recommended for production)
  if (!key && process.env.NODE_ENV === 'development') {
    const envKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (envKey) {
      console.warn('⚠️ Using environment variable for OpenAI API key. This is not secure for production use.');
      return envKey;
    }
  }
  
  if (!key) {
    throw new Error('OpenAI API key not configured. Please configure it in Settings.');
  }
  
  return key;
};

// Helper function to set API key
export const setOpenAIKey = (apiKey) => {
  if (apiKey) {
    localStorage.setItem('youtube-idea-hub-openai-key', apiKey);
  } else {
    localStorage.removeItem('youtube-idea-hub-openai-key');
  }
};

// Helper function to clear API key
export const clearOpenAIKey = () => {
  localStorage.removeItem('youtube-idea-hub-openai-key');
  localStorage.removeItem('youtube-idea-hub-ai-config');
};

// Helper function to get AI configuration info
export const getAIConfigInfo = () => {
  try {
    const config = localStorage.getItem('youtube-idea-hub-ai-config');
    return config ? JSON.parse(config) : null;
  } catch (error) {
    console.error('Failed to parse AI config:', error);
    return null;
  }
};

// Helper function to check if key needs to be refreshed from file
export const shouldRefreshKeyFromFile = () => {
  const config = getAIConfigInfo();
  return config && config.keySource === 'file' && config.filePath;
};



// Helper function to validate API key format
export const validateAPIKeyFormat = (apiKey) => {
  console.log('Validating API key format:', {
    hasKey: !!apiKey,
    type: typeof apiKey,
    length: apiKey?.length,
    startsWithSk: apiKey?.startsWith('sk-'),
    trimmedLength: apiKey?.trim().length
  });
  
  if (!apiKey || typeof apiKey !== 'string') {
    console.log('Validation failed: No key or wrong type');
    return false;
  }
  
  // OpenAI API keys start with 'sk-' and are typically 51 characters long
  const openaiKeyPattern = /^sk-[a-zA-Z0-9]{48}$/;
  const isValid = openaiKeyPattern.test(apiKey.trim());
  
  console.log('Pattern test result:', isValid);
  console.log('Key being tested:', apiKey.trim());
  
  return isValid;
};

// Helper function to test API key validity
export const testAPIKey = async (apiKey) => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return { valid: true, message: 'API key is valid' };
    } else {
      return { valid: false, message: 'Invalid API key or insufficient permissions' };
    }
  } catch (error) {
    return { valid: false, message: 'Failed to validate API key: ' + error.message };
  }
};
