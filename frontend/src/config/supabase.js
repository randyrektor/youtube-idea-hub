import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  WARNING: Supabase environment variables not configured');
  console.warn('   Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file');
}

// Create Supabase client with anon key for frontend operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Debug: Log Supabase client status
console.log('🔧 Supabase client initialized:', {
  url: supabaseUrl ? '✅ Present' : '❌ Missing',
  key: supabaseAnonKey ? '✅ Present' : '❌ Missing',
  client: supabase ? '✅ Created' : '❌ Failed'
});

// Log the actual values (partially masked for security)
if (supabaseUrl) {
  console.log('🔧 Supabase URL:', supabaseUrl.substring(0, 30) + '...');
}
if (supabaseAnonKey) {
  console.log('🔧 Supabase Key:', supabaseAnonKey.substring(0, 20) + '...');
}

// Auth helper functions
export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
};

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSessionToken = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️ Session error:', error.message);
      return null;
    }
    
    if (!session) {
      console.log('🔧 No active session found');
      return null;
    }
    
    // Check if token is expired (with 5 minute buffer)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const buffer = 5 * 60; // 5 minutes
    
    if (expiresAt && (expiresAt - now) < buffer) {
      console.log('🔄 Token expired, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.log('❌ Token refresh failed:', refreshError.message);
        return null;
      }
      
      if (refreshedSession) {
        console.log('✅ Token refreshed successfully');
        return refreshedSession.access_token;
      }
    }
    
    return session.access_token;
  } catch (error) {
    console.log('⚠️ Error getting session token:', error.message);
    return null;
  }
};

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Force re-authentication when tokens are invalid
export const forceReAuth = async () => {
  try {
    console.log('🔄 Forcing re-authentication...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('⚠️ Error signing out:', error.message);
    }
    return { success: !error };
  } catch (error) {
    console.log('⚠️ Error in forceReAuth:', error.message);
    return { success: false };
  }
};

// Database helper functions
export const getIdeas = async (userId = null) => {
  // For team database, load all ideas regardless of user_id
  // userId parameter kept for backward compatibility but not used for filtering
  console.log('🔍 getIdeas called - checking database connection...');
  console.log('🔍 Supabase URL:', supabaseUrl);
  console.log('🔍 Supabase client:', supabase);
  
  try {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('🔍 Database query result:', { data, error });
    console.log('🔍 Data length:', data?.length || 0);
    
    if (error) {
      console.error('❌ Database error:', error);
    }
    
    return { data, error };
  } catch (err) {
    console.error('❌ Exception in getIdeas:', err);
    return { data: null, error: err };
  }
};

export const createIdea = async (idea) => {
  console.log('🔧 createIdea called with:', idea);
  console.log('🔧 Supabase client:', supabase);
  console.log('🔧 Supabase URL:', supabaseUrl);
  
  try {
    // For team database, always include user_id for attribution but don't restrict access
    const ideaWithUser = {
      ...idea,
      user_id: idea.user_id || 'team' // Fallback if no user_id provided
    };
    
    const result = await supabase
      .from('ideas')
      .insert([ideaWithUser])
      .select();
    
    console.log('🔧 createIdea raw result:', result);
    return result;
  } catch (error) {
    console.error('🔧 createIdea error:', error);
    return { data: null, error };
  }
};

export const updateIdea = async (id, updates) => {
  console.log('🔧 updateIdea called with:', { id, updates });
  console.log('🔧 Supabase client:', supabase);
  console.log('🔧 Supabase URL:', supabaseUrl);
  
  try {
    const result = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', id)
      .select();
    
    console.log('🔧 updateIdea raw result:', result);
    return result;
  } catch (error) {
    console.error('🔧 updateIdea error:', error);
    return { data: null, error };
  }
};

export const deleteIdea = async (id) => {
  const { error } = await supabase
    .from('ideas')
    .delete()
    .eq('id', id);
  return { error };
};
