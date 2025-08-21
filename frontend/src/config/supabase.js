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
  const { data: { session }, error } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Database helper functions
export const getIdeas = async (userId) => {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createIdea = async (idea) => {
  console.log('🔧 createIdea called with:', idea);
  console.log('🔧 Supabase client:', supabase);
  console.log('🔧 Supabase URL:', supabaseUrl);
  
  try {
    const result = await supabase
      .from('ideas')
      .insert([idea])
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
