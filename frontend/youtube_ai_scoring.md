# 🎬 YouTube Title Scoring Guide (for Cursor Agent)

This document describes how to analyze and score YouTube video titles with the OpenAI API using a weighted rubric. It is designed so you can copy-paste directly into Cursor to guide the agent when implementing features.

---

## ⚖️ Weighted Scoring Framework (30/30/40)

### 30% Topic Momentum (Trend Proxy)

- Uses model prior knowledge (no live browsing).
- Factors: evergreen vs seasonal topics, audience demand, competitive saturation.

### 30% Channel Fit (History / Analytics)

- Similarity to top-performing past videos (views, CTR, retention).
- Audience alignment (beginner vs advanced).
- Consistency with your proven formats.

### 40% Title & Idea Strength

- **CTR Potential (20%)**: clarity, curiosity gap, benefit-driven phrasing.
- **Clarity/Scope (10%)**: sharply defined, not vague.
- **Novelty/Angle (5%)**: fresh vs your back catalog.
- **Feasibility (5%)**: realistic to produce with your usual effort.

---

## 📝 Prompt Template

```text
SYSTEM:
You are an assistant that scores YouTube video titles for likely success using a weighted rubric.
Only return valid JSON. No prose. Use integers 0–100 for all sub-scores.
We'll compute totals client-side.

RUBRIC (weights):
- Topic Momentum (30%): model prior on general interest/seasonality + competitiveness (no live browsing).
- Channel Fit (30%): similarity to the user's past top performers and audience preferences.
- Title & Idea Strength (40% total):
  - CTR Potential 20% (clarity, specificity, curiosity gap, value prop)
  - Clarity/Scope 10% (focused, not vague)
  - Novelty/Angle 5% (fresh vs back catalog)
  - Feasibility 5% (can be produced with typical effort)

OUTPUT JSON:
{
  "scores": [
    {
      "title": "<title>",
      "topicMomentum": <0-100>,
      "channelFit": <0-100>,
      "ctrPotential": <0-100>,
      "clarityScope": <0-100>,
      "noveltyAngle": <0-100>,
      "feasibility": <0-100>,
      "notes": "<<=20 words>>"
    }
  ]
}

USER CONTEXT (channel summary):
<paste 5–10 bullet lines: top video titles + why they worked (views/CTR/retention),
audience level, preferred lengths, successful formats>

**Example for Syntax.fm:**
- Top: "How to Build a React App in 10 Minutes" — 150K views, high engagement
- Top: "React vs Vue: Which Should You Learn in 2024?" — 200K views, comparison format
- Top: "Building a Full-Stack App with React and Node.js" — 180K views, comprehensive tutorial
- Audience: Web developers, JavaScript developers, programming enthusiasts
- Content Style: Educational, practical, community-focused tutorials and discussions
- Successful Formats: Tutorials, comparisons, building projects, tech discussions

TITLES TO SCORE (100 lines, one per line):
<title 1>
<title 2>
...
<title 100>
```

---

## 🧮 Final Score Calculation (done client-side)

```js
function computeScore(entry) {
  const titleStrength = 0.20*entry.ctrPotential
                      + 0.10*entry.clarityScope
                      + 0.05*entry.noveltyAngle
                      + 0.05*entry.feasibility;

  return 0.30*entry.topicMomentum + 0.30*entry.channelFit + 0.40*titleStrength;
}
```

---

## 💰 Token/Cost Estimates (gpt-4o-mini)

- Input: ~2–3k tokens (rubric + 100 titles + channel summary).
- Output: ~2–3k tokens (JSON scores + short notes).
- Cost: **< $0.01 per 100 titles**.

Use batching (all titles at once) to avoid paying for duplicate instructions.

---

## 🔧 Implementation Tips

- **Batch** all 100 titles in one request.
- **Clamp** `max_tokens` (~1500–2500).
- **Short notes only**: instruct model `<= 20 words`.
- **Do weighting math client-side** so you can tweak weights without re-running.
- **Cache** results so reloading the app doesn't re-trigger costs.

---

## ✅ Example Output

```json
{
  "scores": [
    {
      "title": "How to Edit Faster in DaVinci Resolve",
      "topicMomentum": 72,
      "channelFit": 81,
      "ctrPotential": 78,
      "clarityScope": 85,
      "noveltyAngle": 60,
      "feasibility": 90,
      "notes": "Strong fit with past editing tutorials; clear benefit; slightly common topic."
    }
  ]
}
```

---

## 🚀 Performance Optimizations (Current Implementation)

### Backend Integration
- **HTTP Keep-Alive**: Reuses TCP connections (saves 100-300ms per request)
- **No CORS/OPTIONS**: Eliminates browser overhead
- **Parallel Processing**: Up to 4 batches running simultaneously
- **Smart Batching**: 1-4 batches max for optimal performance

### Caching Strategy
- **LRU Cache**: Stores scored results with 24-hour TTL
- **Change Detection**: Only re-scores modified ideas
- **Incremental Updates**: Processes only changed content
- **Smart Scoring**: Automatically chooses optimal strategy

### Guardrails & Knobs
- **Max Tokens**: Tightly controlled (100) for title generation
- **JSON Mode**: Enforced for faster, reliable responses
- **Temperature**: Balanced at 0.7 (bump to 0.8 if results look bland)
- **Presence Penalty**: 0.3 to reduce repeats without bloating output
- **Model Selection**: gpt-4o-mini for fastest available performance

### Expected Performance
- **100 titles scoring**: ~1-6 seconds (backend) vs 30-40 seconds (frontend)
- **50 titles scoring**: ~0.5-3 seconds (backend) vs 15-20 seconds (frontend)
- **10 titles scoring**: ~0.2-1 second (backend) vs 5-8 seconds (frontend)
- **5 title variations**: ~0.1-0.5 seconds (backend) vs 2-3 seconds (frontend)

---

## 🔄 Fallback Strategy

The system automatically tries backend first, then falls back to frontend scoring if the backend is unavailable. This ensures maximum performance while maintaining reliability.
