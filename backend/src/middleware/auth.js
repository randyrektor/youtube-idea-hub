const { verifyToken } = require('../supabase');

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const { valid, user } = await verifyToken(token);
    
    if (!valid || !user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Please sign in again'
      });
    }

    // Add user info to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

// Rate limiting middleware
const rateLimiter = new Map();

const checkRateLimit = (req, res, next) => {
  const userId = req.user?.id;
  const endpoint = req.path;
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const key = `${userId}:${endpoint}`;
  const userRequests = rateLimiter.get(key) || [];

  // Remove old requests outside the window
  const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

  if (validRequests.length >= maxRequests) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${Math.ceil((validRequests[0] + windowMs - now) / 1000)} seconds.`
    });
  }

  // Add current request
  validRequests.push(now);
  rateLimiter.set(key, validRequests);

  next();
};

// AI usage tracking middleware
const trackAIUsage = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Track AI usage after response is sent
    if (req.user && req.path.includes('/api/')) {
      const { supabase } = require('../supabase');
      
      // Extract token count from OpenAI response if available
      let tokensUsed = 0;
      let costEstimate = 0;
      
      try {
        if (data && typeof data === 'string') {
          const parsed = JSON.parse(data);
          if (parsed.usage && parsed.usage.total_tokens) {
            tokensUsed = parsed.usage.total_tokens;
            // Rough cost estimate (GPT-4o-mini: $0.00015 per 1K tokens)
            costEstimate = (tokensUsed / 1000) * 0.00015;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }

      // Record usage asynchronously (don't block response)
      supabase
        .from('ai_usage')
        .insert({
          user_id: req.user.id,
          endpoint: req.path,
          tokens_used: tokensUsed,
          cost_estimate: costEstimate
        })
        .then(() => console.log(`AI usage tracked for user ${req.user.id}`))
        .catch(err => console.error('Failed to track AI usage:', err));
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  authenticateUser,
  checkRateLimit,
  trackAIUsage
};
