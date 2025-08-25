const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.warn('⚠️  WARNING: Supabase environment variables not configured');
  console.warn('   Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY in your .env file');
}

// Create Supabase client with anon key for user token verification
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create separate client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to get user from JWT token
const getUserFromToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};

// Helper function to verify JWT token
const verifyToken = async (token) => {
  try {
    console.log('🔍 Verifying token:', token.substring(0, 20) + '...');
    console.log('🔍 Supabase URL:', supabaseUrl);
    console.log('🔍 Service key present:', !!supabaseServiceKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.log('❌ Token verification error:', error.message);
      throw error;
    }
    
    console.log('✅ Token verified successfully for user:', user?.id);
    return { valid: true, user };
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return { valid: false, user: null };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  getUserFromToken,
  verifyToken
};
