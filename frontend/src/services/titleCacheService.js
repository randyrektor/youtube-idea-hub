// Title Cache Service - Prefetch and cache title suggestions for instant feel
import { TITLE_GENERATION_CONFIG } from '../config/titleGenerationConfig';
import { getSessionToken, forceReAuth } from '../config/supabase';

// Helper function to get backend URL with fallback
const getBackendUrl = () => {
  return process.env.REACT_APP_API_URL || localStorage.getItem('youtube-idea-hub-backend-url') || 'http://localhost:3001';
};

// Simple LRU cache implementation
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  size() {
    return this.cache.size;
  }

  clear() {
    this.cache.clear();
  }
}

// Main cache instance
const altCache = new LRUCache(TITLE_GENERATION_CONFIG.maxCacheSize);

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const getAuthHeaders = async () => {
  try {
    const token = await getSessionToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Validate token format and length
    if (token && typeof token === 'string' && token.length > 20) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔧 Auth headers: WITH token (length:', token.length, ')');
    } else {
      console.log('🔧 Auth headers: NO token (invalid/expired token)');
    }
    
    return headers;
  } catch (error) {
    console.log('⚠️ Error getting auth headers, proceeding without authentication:', error.message);
    return {
      'Content-Type': 'application/json'
    };
  }
};

// Get cached alternates or fetch from API
export async function getAlternates(title, context = "") {
  if (!title || title.trim().length === 0) {
    return [];
  }

  const cacheKey = `${title.toLowerCase().trim()}|${context.toLowerCase().trim()}`;
  const hit = altCache.get(cacheKey);
  
  // Check if cache is still valid (configurable TTL)
  if (hit && Date.now() - hit.ts < TITLE_GENERATION_CONFIG.cacheTTL) {
    console.log(`📋 Cache hit for: "${title}"`);
    return hit.titles;
  }

  console.log(`🔄 Cache miss for: "${title}", fetching from API...`);
  
  try {
          const backendUrl = getBackendUrl();
          console.log(`🌐 Making API call to: ${backendUrl}/api/alt-titles`);
    console.log(`📤 Request payload:`, { title, context });
    
    let response;
    try {
      // Try backend first
      response = await fetch(`${backendUrl}/api/alt-titles`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ title, context })
      });
      console.log(`✅ Backend API call successful`);
    } catch (backendError) {
      console.warn(`⚠️ Backend API call failed, trying relative URL:`, backendError);
      // Fallback to relative URL (in case backend is not available)
      response = await fetch("/api/alt-titles", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ title, context })
      });
      console.log(`⚠️ Using fallback API call`);
    }

    console.log(`📥 Response status:`, response.status);
    console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Handle 401 authentication errors
      if (response.status === 401) {
        console.log('🔐 Authentication failed (401) - likely backend API key issue, not auth problem');
        console.log('💡 Waiting for Render deployment to complete...');
        throw new Error('Backend temporarily unavailable. Please wait for deployment to complete.');
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const { titles } = await response.json();
    
    // Cache the result
    altCache.set(cacheKey, { titles, ts: Date.now() });
    console.log(`💾 Cached ${titles.length} titles for: "${title}"`);
    
    return titles;
  } catch (error) {
    console.error('Failed to fetch alternates:', error);
    return []; // Return empty array on error
  }
}

// Cooldown tracking to prevent rapid retries
let lastBackendError = 0;
const BACKEND_ERROR_COOLDOWN = 30000; // 30 seconds

// Prefetch titles for visible ideas
export async function prefetchTitlesForIdeas(ideas, maxPrefetch = TITLE_GENERATION_CONFIG.maxPrefetch) {
  if (!ideas || ideas.length === 0) return;

  // Check cooldown to prevent rapid retries
  const now = Date.now();
  if (now - lastBackendError < BACKEND_ERROR_COOLDOWN) {
    console.log('⏳ Backend error cooldown active, skipping prefetch');
    return;
  }

  const ideasToPrefetch = ideas.slice(0, maxPrefetch);
  console.log(`🚀 Prefetching titles for ${ideasToPrefetch.length} ideas...`);

  // Check if backend is available first
  try {
    const backendUrl = getBackendUrl();
    const healthCheck = await fetch(`${backendUrl}/health`);
    if (!healthCheck.ok) {
      console.log('⚠️ Backend not available, skipping prefetch');
      lastBackendError = now;
      return;
    }
    
    const healthData = await healthCheck.json();
    if (!healthData.hasApiKey) {
      console.log('⚠️ Backend has no API key, skipping prefetch');
      lastBackendError = now;
      return;
    }
  } catch (error) {
    console.log('⚠️ Cannot reach backend, skipping prefetch:', error.message);
    lastBackendError = now;
    return;
  }

  // Use concurrency control for better performance
  const tasks = ideasToPrefetch.map(idea => {
    const context = `Web development, JavaScript, modern programming - ${idea.contentType || 'friendly and educational'}`;
    return () => getAlternates(idea.title, context).catch(() => []);
  });

  try {
    await runWithConcurrency(tasks, TITLE_GENERATION_CONFIG.prefetchWorkers);
    console.log(`✅ Prefetching completed for ${ideasToPrefetch.length} ideas`);
  } catch (error) {
    console.warn('Prefetching encountered errors:', error);
  }
}

// Prefetch on hover (for better UX)
export function setupHoverPrefetch() {
  let hoverTimeout;
  
  return {
    onMouseEnter: (idea) => {
      // Clear any existing timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      
      // Prefetch after configurable delay (user intent)
      hoverTimeout = setTimeout(async () => {
        if (!altCache.has(`${idea.title.toLowerCase().trim()}|${idea.contentType || 'friendly and educational'}`.toLowerCase().trim())) {
          const context = `Web development, JavaScript, modern programming - ${idea.contentType || 'friendly and educational'}`;
          try {
            await getAlternates(idea.title, context);
          } catch (error) {
            console.warn(`Hover prefetch failed for "${idea.title}":`, error);
          }
        }
      }, TITLE_GENERATION_CONFIG.hoverDelay);
    },
    
    onMouseLeave: () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
    }
  };
}

// Debounced title generation for editing
export const debouncedGetAlternates = debounce(async (title, context, callback) => {
  try {
    const titles = await getAlternates(title, context);
    callback(titles);
  } catch (error) {
    console.error('Debounced title generation failed:', error);
    callback([]);
  }
}, TITLE_GENERATION_CONFIG.debounceDelay);

// Cache statistics
export function getCacheStats() {
  return {
    size: altCache.size(),
    maxSize: altCache.maxSize,
    hitRate: 'N/A' // Could implement hit rate tracking if needed
  };
}

// Clear cache (useful for testing or memory management)
export function clearTitleCache() {
  altCache.clear();
  console.log('🗑️ Title cache cleared');
}

// Background precompute with concurrency control
async function runWithConcurrency(tasks, n = 3) {
  const queue = tasks.slice();
  const workers = Array.from({ length: n }, async function worker() {
    while (queue.length) {
      const job = queue.shift();
      if (job) await job();
    }
  });
  await Promise.all(workers);
}

// Warm up cache with background precompute
export async function warmAlternates(ideas, context = "") {
  if (!ideas || ideas.length === 0) return;
  
  const firstFold = ideas.slice(0, 10); // Focus on first 10 visible ideas
  console.log(`🔥 Warming cache for ${firstFold.length} ideas...`);
  
  const tasks = firstFold.map(idea => {
    const ideaContext = context || `Web development, JavaScript, modern programming - ${idea.contentType || 'friendly and educational'}`;
    return () => getAlternates(idea.title, ideaContext).catch(() => []);
  });
  
  try {
    await runWithConcurrency(tasks, TITLE_GENERATION_CONFIG.warmingWorkers);
    console.log(`✅ Cache warming completed for ${firstFold.length} ideas`);
  } catch (error) {
    console.warn('Cache warming encountered errors:', error);
  }
}
