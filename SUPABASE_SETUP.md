# YouTube Idea Hub - Supabase Setup Guide

This guide will walk you through setting up Supabase for your YouTube Idea Hub application, enabling multiplayer functionality with user authentication and database storage.

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `youtube-idea-hub` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

### 2. Get Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

### 3. Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database-schema.sql` from this project
3. Paste and run the SQL commands
4. Verify tables are created in **Table Editor**

### 4. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, add your domain (for production) or `http://localhost:3000` (for development)
3. **Email/Password authentication is enabled by default** - no additional setup needed!

### 5. Set Environment Variables

#### Backend (.env file)
```bash
# Copy backend/env.example to backend/.env
cp backend/env.example backend/.env

# Edit backend/.env with your values:
OPENAI_API_KEY=sk-your-openai-api-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3001
NODE_ENV=development
```

#### Frontend (.env.local file)
```bash
# Copy frontend/env.example to frontend/.env.local
cp frontend/env.example frontend/.env.local

# Edit frontend/.env.local with your values:
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
```

## 🔧 Development Setup

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 3. Test Authentication
1. Open `http://localhost:3000`
2. You should see the sign-in screen
3. Click "Need an account? Sign Up" to create an account
4. Enter your email and password
5. Check your email for confirmation link (if required)
6. Sign in with your credentials
7. You should see the main app

## 🌐 Production Deployment

### Option 1: Vercel (Recommended - Free)

#### Frontend Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. In `frontend` directory: `vercel`
3. Follow prompts to deploy
4. Set environment variables in Vercel dashboard

#### Backend Deployment
1. In `backend` directory: `vercel`
2. Set environment variables in Vercel dashboard
3. Update frontend `REACT_APP_API_URL` to your backend URL

### Option 2: Railway
1. Connect your GitHub repo to Railway
2. Set environment variables
3. Deploy automatically on push

### Option 3: Heroku
1. Create Heroku app
2. Set environment variables
3. Deploy with Git

## 🔒 Security Features

### Rate Limiting
- **Per User**: 100 requests per 15 minutes
- **AI Endpoints**: Protected with authentication
- **Token Tracking**: Monitors OpenAI usage per user

### Row Level Security (RLS)
- Users can only access their own data
- Automatic profile creation on signup
- Secure API key management

### Environment Variables
- Never commit `.env` files
- Use different keys for development/production
- Rotate keys regularly

## 📊 Database Tables

### `profiles`
- User profile information
- Extends Supabase auth.users
- Auto-created on signup

### `ideas`
- Video idea cards
- User-specific data
- AI scores and metadata

### `user_preferences`
- Theme settings
- AI feature toggles
- Notification preferences

### `ai_usage`
- Usage tracking for rate limiting
- Cost estimation
- Per-user analytics

## 🧪 Testing

### Test Database Connection
```bash
# Backend health check
curl http://localhost:3001/health

# Should return:
{
  "status": "ok",
  "hasApiKey": true,
  "endpoints": ["/api/ideas", "/api/score-titles", ...]
}
```

### Test Authentication
1. Sign in with Google
2. Check browser console for auth state
3. Verify user profile created in database

### Test API Endpoints
```bash
# Get user's ideas (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/ideas
```

## 🚨 Troubleshooting

### Common Issues

#### "Supabase environment variables not configured"
- Check `.env` files exist
- Verify variable names match exactly
- Restart development servers

#### "Authentication failed"
- Check email/password credentials
- Verify site URLs in Supabase settings
- Check browser console for errors
- Ensure email confirmation is completed (if required)

#### "Database connection failed"
- Verify Supabase project is active
- Check service role key permissions
- Ensure schema is properly created

#### "Rate limit exceeded"
- Check user's request count
- Verify rate limiting middleware
- Check AI usage tracking

### Debug Mode
Enable detailed logging:
```bash
# Backend
DEBUG=* npm run dev

# Frontend
REACT_APP_DEBUG=true npm start
```

## 📈 Monitoring

### Supabase Dashboard
- **Database**: Monitor table sizes and performance
- **Authentication**: Track user signups and sessions
- **Logs**: View API request logs

### Application Metrics
- AI usage per user
- Rate limit violations
- Error rates and response times

## 🔄 Updates & Maintenance

### Database Migrations
1. Create new SQL files for schema changes
2. Test in development environment
3. Apply to production via Supabase dashboard

### Security Updates
1. Regularly rotate API keys
2. Monitor for security advisories
3. Update dependencies regularly

### Performance Optimization
1. Monitor database query performance
2. Optimize RLS policies
3. Add database indexes as needed

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Authentication Providers](https://supabase.com/docs/guides/auth/auth-providers)

## 🆘 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review Supabase documentation
3. Check application logs
4. Create an issue in the project repository

---

**Happy coding! 🎉**
