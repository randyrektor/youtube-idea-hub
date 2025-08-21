# Backend Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual API key
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key (starts with `sk-`)
- `OPENAI_MODEL` - AI model to use (default: `gpt-4o-mini`)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (default: `development`)

**Example .env file:**
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=3001
NODE_ENV=development
```

### 3. Start the Server
```bash
npm run dev
```

The backend will start on `http://localhost:3001`

## 🔒 Security Features

### **API Key Management (Environment Variables Only)**
- **No HTTP endpoints** for API key management (disabled for security)
- **Environment variables only** - no runtime modification
- **No memory storage** - keys are read directly from environment
- **Production ready** - follows security best practices

### **Why This Approach?**
1. **Prevents API key exposure** through HTTP requests
2. **Follows 12-factor app principles** for configuration
3. **Eliminates runtime security risks** from memory manipulation
4. **Industry standard** for production deployments
5. **Audit trail** - configuration changes require server restart

## 🔧 Environment Variable Setup

### Option A: .env File (Recommended for Development)
1. Copy `.env.example` to `.env`
2. Add your actual OpenAI API key
3. Restart the server

### Option B: System Environment Variables
```bash
export OPENAI_API_KEY="sk-your-key-here"
export OPENAI_MODEL="gpt-4o-mini"
cd backend
npm run dev
```

### Option C: Inline Environment Variables
```bash
OPENAI_API_KEY="sk-your-key-here" npm run dev
```

## 🌐 API Endpoints

### Health Check
- `GET /health` - Server status and configuration

### AI Scoring
- `POST /api/score-titles` - Score multiple titles with AI
- `POST /api/generate-titles` - Generate alternative titles
- `POST /api/alt-titles` - Alias for generate-titles

### Settings
- `GET /api/settings` - Current environment configuration status

### Web Interface
- `GET /settings` - Environment status and setup instructions

## 🚨 Troubleshooting

### "Server missing OPENAI_API_KEY"
- Check that your `.env` file exists and contains `OPENAI_API_KEY`
- Verify the API key format (starts with `sk-`)
- Restart the server after changing environment variables

### "Port already in use"
```bash
# Kill existing processes
pkill -f "nodemon.*backend"
lsof -ti:3001 | xargs kill -9
```

### Test Environment Variables
```bash
# Check if environment variables are loaded
curl http://localhost:3001/health

# Test AI endpoint (should work if API key is set)
curl -X POST http://localhost:3001/api/alt-titles \
  -H "Content-Type: application/json" \
  -d '{"title":"test","context":"test"}'
```

## 📚 Production Deployment

For production deployment:

1. **Use proper environment management** (Docker, Kubernetes, etc.)
2. **Never commit .env files** to version control
3. **Use secure secret management** (AWS Secrets Manager, etc.)
4. **Enable HTTPS** for all endpoints
5. **Implement proper authentication/authorization**

## 🔄 Performance Features

- **HTTP Keep-Alive** - Reuses connections for faster API calls
- **Micro Tokens** - Optimized AI prompts for speed
- **JSON Response Format** - Structured, deterministic outputs
- **Background Precompute** - Async title generation
- **LRU Cache** - Intelligent caching with TTL
- **Concurrency Control** - Managed parallel processing
