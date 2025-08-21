// Title Generation Configuration - Guardrails and Knobs for optimal performance

export const TITLE_GENERATION_CONFIG = {
  // Token Management
  maxTokens: 100,           // tight - 5 titles × ~10-12 words each is plenty
  
  // Creativity Control
  temperature: 0.7,         // creative but consistent; bump to 0.8 if results look bland
  
  // Output Quality
  responseFormat: { type: 'json_object' }, // JSON mode = no explanations
  presencePenalty: 0.3,    // reduce repeats without bloating output (0.2-0.4 range)
  
  // Model Selection
  model: 'gpt-4o-mini',    // fastest available model
  
  // Cache Settings
  cacheTTL: 60 * 60 * 1000, // 1 hour cache expiration
  maxCacheSize: 100,        // LRU cache size
  
  // Prefetch Settings
  maxPrefetch: 12,          // maximum ideas to prefetch
  hoverDelay: 200,          // ms delay before hover prefetch
  debounceDelay: 400,       // ms delay for title editing
  
  // Concurrency Control
  warmingWorkers: 3,        // workers for cache warming
  prefetchWorkers: 4,       // workers for prefetching
  
  // Quality Thresholds
  minTitleLength: 10,       // minimum title length
  maxTitleLength: 65,       // maximum title length
  targetTitleCount: 5,      // number of titles to generate
  
  // Fallback Settings
  enableLocalFallbacks: true,  // use local title generation as fallback
  enableOptimisticRendering: true, // show local suggestions immediately
  
  // Power Words for Title Generation
  powerWords: [
    'ultimate', 'complete', 'essential', 'comprehensive', 'practical', 
    'hands-on', 'real-world', 'production-ready', 'modern', 'efficient',
    'scalable', 'maintainable', 'professional', 'expert', 'master'
  ],
  
  // Channel-Specific Settings
  channelName: 'Syntax.fm',
  channelNiche: 'Web Development, JavaScript, and Modern Programming',
  channelTone: 'Friendly, knowledgeable, and approachable - like learning from a friend'
};

// Helper function to get current config
export function getTitleGenerationConfig() {
  return { ...TITLE_GENERATION_CONFIG };
}

// Helper function to update config (for testing/tuning)
export function updateTitleGenerationConfig(updates) {
  Object.assign(TITLE_GENERATION_CONFIG, updates);
  console.log('🎛️ Title generation config updated:', TITLE_GENERATION_CONFIG);
}

// Helper function to get OpenAI parameters
export function getOpenAIParams() {
  return {
    max_tokens: TITLE_GENERATION_CONFIG.maxTokens,
    temperature: TITLE_GENERATION_CONFIG.temperature,
    response_format: TITLE_GENERATION_CONFIG.responseFormat,
    presence_penalty: TITLE_GENERATION_CONFIG.presencePenalty,
  };
}

// Quality monitoring functions
export function analyzeTitleQuality(titles) {
  const analysis = {
    count: titles.length,
    averageLength: 0,
    uniqueWords: new Set(),
    hasRepeats: false,
    qualityScore: 0,
  };
  
  if (titles.length === 0) return analysis;
  
  // Calculate average length
  const totalLength = titles.reduce((sum, title) => sum + title.length, 0);
  analysis.averageLength = Math.round(totalLength / titles.length);
  
  // Check for unique words and repeats
  const allWords = titles.join(' ').toLowerCase().split(/\s+/);
  analysis.uniqueWords = new Set(allWords);
  
  // Check for title repeats
  const uniqueTitles = new Set(titles);
  analysis.hasRepeats = uniqueTitles.size < titles.length;
  
  // Calculate quality score (0-100)
  let score = 0;
  score += Math.min(100, (titles.length / 5) * 20); // Count bonus
  score += Math.min(100, (analysis.averageLength / 30) * 20); // Length bonus
  score += Math.min(100, (analysis.uniqueWords.size / 50) * 20); // Variety bonus
  score += analysis.hasRepeats ? 0 : 20; // Uniqueness bonus
  score += Math.min(100, (analysis.averageLength >= 10 && analysis.averageLength <= 65) ? 20 : 0); // Range bonus
  
  analysis.qualityScore = Math.round(score);
  
  return analysis;
}

// Configuration presets for different use cases
export const CONFIG_PRESETS = {
  // High creativity, more variety
  creative: {
    temperature: 0.8,
    presencePenalty: 0.4,
    maxTokens: 120,
  },
  
  // Balanced performance and quality
  balanced: {
    temperature: 0.7,
    presencePenalty: 0.3,
    maxTokens: 100,
  },
  
  // Fast and consistent
  fast: {
    temperature: 0.6,
    presencePenalty: 0.2,
    maxTokens: 80,
  },
  
  // High quality, more tokens
  quality: {
    temperature: 0.7,
    presencePenalty: 0.4,
    maxTokens: 120,
  },
};

// Apply a preset configuration
export function applyConfigPreset(presetName) {
  const preset = CONFIG_PRESETS[presetName];
  if (preset) {
    updateTitleGenerationConfig(preset);
    console.log(`🎛️ Applied ${presetName} preset:`, preset);
  } else {
    console.warn(`⚠️ Unknown preset: ${presetName}`);
  }
}
