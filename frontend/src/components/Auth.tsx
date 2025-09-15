import React, { useState, useEffect } from 'react';
import { supabase, signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from '../config/supabase';
import './AIComponents.css';

interface AuthProps {
  onAuthChange: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthChange }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(({ user }) => {
      setUser(user);
      onAuthChange(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        onAuthChange(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [onAuthChange]);

  const handleEmailAuth = async () => {
    try {
      setLoading(true);
      setAuthError('');
      
      // Debug: Check if Supabase is configured
      console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      console.log('Supabase Anon Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
      
      if (isSignUp) {
        console.log('Attempting signup...');
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
        alert('Check your email for a confirmation link!');
      } else {
        console.log('Attempting signin...');
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <div className="user-avatar">
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt={localStorage.getItem('youtube-idea-hub-user-full-name') || user.user_metadata?.full_name || 'User'} 
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {localStorage.getItem('youtube-idea-hub-user-full-name')?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
              </div>
            )}
          </div>
          <div className="user-details">
            <h3>{localStorage.getItem('youtube-idea-hub-user-full-name') || user.user_metadata?.full_name || 'User'}</h3>
            <p>{user.email}</p>
          </div>
          <button 
            className="sign-out-button"
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h2>Welcome to YouTube Idea Hub</h2>
        <p>Sign in to start managing your video ideas with AI-powered insights.</p>
        
        <div className="auth-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              disabled={loading}
            />
          </div>
          
          {authError && (
            <div className="auth-error">
              {authError}
            </div>
          )}
          
          <button 
            className="auth-submit-button"
            onClick={handleEmailAuth}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
          
          <div className="auth-switch">
            <button 
              className="switch-button"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
        
        <div className="auth-features">
          <div className="feature">
            <span className="feature-icon">🤖</span>
            <span>AI-powered idea scoring</span>
          </div>
          <div className="feature">
            <span className="feature-icon">💡</span>
            <span>Generate creative titles</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <span>Track your ideas</span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Auth;
