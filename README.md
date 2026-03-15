# 🧠 LLM-Powered Prompt Router

An intelligent Node.js service that classifies user intent via an LLM and routes requests to specialized AI expert personas. Built with **Google Gemini**, **Express**, and a two-step **Classify → Route** architecture.

---

## How It Works

The system implements a two-step process for every user message:

1. **Classify** — A lightweight LLM call detects the user's intent and returns a JSON object with an `intent` label and a `confidence` score.
2. **Route & Respond** — The classified intent selects a specialized system prompt from a predefined collection of expert personas. A second LLM call generates a high-quality, context-aware response using that persona.

```
User Message
    │
    ▼
┌──────────────────────┐
│  classify_intent()   │  ← Gemini Flash (fast, cheap)
│  Returns JSON:       │
│  { intent, confidence}│
└──────────┬───────────┘
           │
     ┌─────┴──────┐
     │ Intent Router│
     └─────┬──────┘
           │
    ┌──────┼──────────┬──────────┬──────────┐
    ▼      ▼          ▼          ▼          ▼
  code   data     writing    career    unclear
    │      │          │          │          │
    ▼      ▼          ▼          ▼          ▼
┌──────────────────────┐
│ route_and_respond()  │  ← Expert System Prompt + Gemini
└──────────┬───────────┘
           │
           ▼
   Final Response + Log to route_log.jsonl
```

---

## Expert Personas

| Intent | Persona | Description |
|--------|---------|-------------|
| `code` | 🧑‍💻 Code Expert | Production-quality code with error handling and idiomatic style |
| `data` | 📊 Data Analyst | Statistical reasoning, distributions, correlations, visualizations |
| `writing` | ✍️ Writing Coach | Feedback on clarity, structure, tone — never rewrites text |
| `career` | 💼 Career Advisor | Concrete, actionable advice with clarifying questions |
| `unclear` | 🤔 Clarifier | Asks the user to specify their intent among supported categories |

---

## Project Structure

```
LLM-Powered-Prompt-Generator/
├── .env.example            # Environment variable template
├── .gitignore
├── Dockerfile              # Production container image
├── docker-compose.yml      # Docker Compose config
├── package.json
├── src/
│   ├── prompts.js          # All expert system prompts + classifier prompt
│   ├── classifier.js       # classify_intent() — LLM classification
│   ├── router.js           # route_and_respond() — expert generation
│   ├── logger.js           # JSONL logging to route_log.jsonl
│   ├── index.js            # handleMessage() orchestrator
│   └── server.js           # Express API server
├── tests/
│   ├── router.test.js      # Vitest test suite
│   └── test-messages.js    # 20 test messages with expected intents
└── route_log.jsonl         # Generated at runtime (gitignored)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- A **Google Gemini API Key** ([get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/MouliSaiDeep/llm-powered-prompt-router.git
cd llm-powered-prompt-router

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
CONFIDENCE_THRESHOLD=0.7
```

### Run the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

The server starts at **http://localhost:3000**.

### Run with Docker

```bash
docker compose up --build
```

### Run Tests

```bash
npm test
```

---

## API Endpoints

### `POST /api/chat`

Classifies the user's intent and returns an expert-generated response.

**Request Body:**

```json
{
  "message": "your message here"
}
```

**Response (200 OK):**

```json
{
  "intent": "code",
  "confidence": 0.95,
  "overridden": false,
  "response": "Here's how to sort a list in Python..."
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "A non-empty \"message\" field is required."
}
```

---

## Testing with cURL

### 1. Code Intent

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How do I sort a list of objects in Python?\"}"
```

### 2. Data Intent

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What is the average of these numbers: 12, 45, 23, 67, 34\"}"
```

### 3. Writing Intent

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"This paragraph sounds awkward, can you help me fix it?\"}"
```

### 4. Career Intent

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I'm preparing for a job interview, any tips?\"}"
```

### 5. Unclear Intent (triggers clarification)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"hey\"}"
```

### 6. Manual Override (skip classifier)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"@code Fix this bug: for i in range(10) print(i)\"}"
```

### 7. SQL Query (Code)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Explain this SQL query for me\"}"
```

### 8. Poem Request (Unclear)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Can you write me a poem about clouds?\"}"
```

### 9. Cover Letter (Career)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How do I structure a cover letter?\"}"
```

### 10. Verbose Writing (Writing)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"My boss says my writing is too verbose.\"}"
```

### 11. Pivot Table (Data)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What is a pivot table?\"}"
```

### 12. Mixed Intent (Unclear)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I need to write a function that takes a user id and returns their profile, but also I need help with my resume.\"}"
```

### 13. Empty Message (400 Error)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"\"}"
```

---

## Key Features

### Confidence Threshold

If the classifier returns a confidence score below **0.7** (configurable via `CONFIDENCE_THRESHOLD` in `.env`), the system automatically treats the intent as `unclear` and asks a clarifying question — even if a specific intent was returned.

### Manual Override

Users can bypass the classifier by prefixing their message with `@<intent>`:

```
@code Fix this bug in my loop
@data Analyze this dataset
@writing Review my paragraph
@career Help with my resume
```

The system detects the prefix, strips it, and routes directly to the specified persona with `confidence: 1.0`.

### Graceful Error Handling

If the classifier LLM returns malformed or non-JSON output, the system **does not crash**. It defaults to:

```json
{ "intent": "unclear", "confidence": 0.0 }
```

### JSONL Logging

Every request is logged to `route_log.jsonl`. Each line is a valid JSON object:

```json
{
  "timestamp": "2026-03-15T08:25:00.123Z",
  "intent": "code",
  "confidence": 0.95,
  "user_message": "How do I sort a list in Python?",
  "final_response": "Here's how to sort a list..."
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | *(required)* | Your Google Gemini API key |
| `PORT` | `3000` | Server port |
| `CONFIDENCE_THRESHOLD` | `0.7` | Minimum confidence to trust the classifier's intent |

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **LLM**: Google Gemini Flash (`@google/generative-ai`)
- **Testing**: Vitest
- **Containerization**: Docker + Docker Compose
