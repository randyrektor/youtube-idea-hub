// Title Generation Service - Handles fallback title generation when AI is not available
import { TITLE_GENERATION_CONFIG } from '../config/titleGenerationConfig';

const CHANNEL_CONTEXT = {
  niche: 'Web Development, JavaScript, and Modern Programming',
  tone: 'Friendly, knowledgeable, and approachable - like learning from a friend',
  powerWords: TITLE_GENERATION_CONFIG.powerWords || ['ultimate', 'complete', 'essential', 'comprehensive', 'practical', 'hands-on', 'real-world', 'production-ready', 'modern', 'efficient'],
  frameworks: ['CSS', 'JavaScript', 'HTML', 'React', 'Vue', 'Node.js', 'Next.js', 'Express', 'TypeScript'],
  // Syntax.fm specific content types that perform well
  topPerformers: ['JavaScript Tutorials', 'React Development', 'Web Development Tips', 'Programming Discussions', 'Tech Reviews'],
  // Keywords that work well for your channel
  provenKeywords: ['javascript', 'react', 'web development', 'programming', 'tutorial', 'tips', 'development', 'coding', 'web', 'tech']
};

// Title patterns by content type
const TITLE_PATTERNS = {
  tutorial: {
    patterns: [
      'How to {keywords} with {framework}',
      'Build {keywords} - {framework} Tutorial',
      '{keyword} Development Guide',
      'Step-by-Step: {keywords} in {framework}',
      'Master {keywords} with Modern JavaScript'
    ],
    fallbacks: [
      'How to Build a Web App with React',
      'Complete JavaScript Development Guide',
      'Step-by-Step Web Development Tutorial',
      'Master Modern Web Technologies',
      'Build Your First React Project'
    ]
  },
  reaction: {
    patterns: [
      'Reacting to {keywords}',
      'My Thoughts on {keywords}',
      '{keyword} - My Take',
      'Dev Community Reacts to {keywords}',
      'Why Devs Need {keywords}'
    ],
    fallbacks: [
      'Reacting to JavaScript Trends',
      'My Thoughts on Web Dev',
      'What I Think About This',
      'Dev Community Reacts',
      'Why Devs Need This'
    ]
  },
  challenge: {
    patterns: [
      'Can I Build {keywords} with {framework}?',
      'The Ultimate {keywords} Challenge',
      '{framework} vs {keywords}',
      'I Built {keywords} with {framework}',
      'The Most Complex {keywords} Project'
    ],
    fallbacks: [
      'Can I Build This with React?',
      'The Ultimate JavaScript Challenge',
      'React vs Vanilla JavaScript',
      'I Built Something with Node.js',
      'The Most Complex Web App'
    ]
  },
  review: {
    patterns: [
      '{keywords} - Honest Review',
      'Is {keywords} Worth Learning?',
      'The Truth About {keywords}',
      '{keywords} vs Competition',
      'Why I Love/Hate {keywords}'
    ],
    fallbacks: [
      'Honest JavaScript Tool Review',
      'Is This Worth Learning?',
      'The Truth About This Tech',
      'JavaScript Tool vs Competition',
      'Why I Love/Hate This'
    ]
  },
  general: {
    patterns: [
      '{keywords} - Everything You Need',
      'Why {keywords} Matters in 2024',
      'The Truth About {keywords}',
      '5 {keywords} Tips',
      'The {powerWord} Secrets of {keywords}'
    ],
    fallbacks: [
      'Everything Web Devs Need to Know',
      'Why This Matters in 2024',
      'The Truth About This Tech',
      '5 JavaScript Developer Tips',
      'The Hidden Secrets Revealed'
    ]
  }
};

// Extract key concepts from title and description
function extractKeyWords(currentTitle, description) {
  const titleWords = (currentTitle || '').toLowerCase().split(' ').filter(word => word.length > 3);
  const descWords = (description || '').toLowerCase().split(' ').filter(word => word.length > 3);
  return [...titleWords, ...descWords].slice(0, 5);
}

// Get content type category
function getContentCategory(type) {
  if (!type) return 'general';
  
  if (type.includes('Tutorial') || type.includes('Build')) return 'tutorial';
  if (type.includes('Reaction') || type.includes('Commentary')) return 'reaction';
  if (type.includes('Challenge') || type.includes('Competition')) return 'challenge';
  if (type.includes('Review') || type.includes('Comparison')) return 'review';
  
  return 'general';
}

// Generate fallback title suggestions
export function generateFallbackTitles(currentTitle, description, type, lift) {
  console.log('generateFallbackTitles called with:', { currentTitle, description, type, lift });
  
  const category = getContentCategory(type);
  const patterns = TITLE_PATTERNS[category];
  const keyWords = extractKeyWords(currentTitle, description);
  
  const suggestions = [];
  
  if (keyWords.length > 0) {
    // Generate contextual suggestions using patterns
    for (const pattern of patterns.patterns) {
      if (suggestions.length >= 5) break;
      let suggestion = pattern;
      if (pattern.includes('{keywords}')) {
        const keywordText = keyWords.slice(0, 2).join(' ');
        suggestion = suggestion.replace('{keywords}', keywordText);
      }
      if (pattern.includes('{keyword}')) {
        const keywordText = keyWords[0].charAt(0).toUpperCase() + keyWords[0].slice(1);
        suggestion = suggestion.replace('{keyword}', keywordText);
      }
      if (pattern.includes('{framework}')) {
        const framework = CHANNEL_CONTEXT.frameworks.find(f => 
          keyWords.some(word => word.includes(f.toLowerCase()))
        ) || 'JavaScript';
        suggestion = suggestion.replace('{framework}', framework);
      }
      if (pattern.includes('{powerWord}')) {
        const powerWord = CHANNEL_CONTEXT.powerWords[0];
        suggestion = suggestion.replace('{powerWord}', powerWord);
      }
      suggestions.push(suggestion);
    }
  }
  // Fill remaining slots with fallbacks
  while (suggestions.length < 5) {
    const fallback = patterns.fallbacks[suggestions.length];
    if (fallback && !suggestions.includes(fallback)) {
      suggestions.push(fallback);
    } else {
      break;
    }
  }
  console.log('generateFallbackTitles returning:', suggestions);
  return suggestions.slice(0, 5);
}

// Get channel context for external use
export function getChannelContext() {
  return { ...CHANNEL_CONTEXT };
}
