# 🧠 LLM-Powered Prompt Router

An intelligent Node.js service that classifies user intent via an LLM and routes requests to specialized AI expert personas. Built with **Groq**, **Express**, and a two-step **Classify → Route** architecture.

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
│  classify_intent()   │  ← Groq classifier model
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
│ route_and_respond()  │  ← Expert System Prompt + Groq
└──────────┬───────────┘
           │
           ▼
   Final Response + Log to route_log.jsonl
```

---

## Expert Personas

| Intent    | Persona           | Description                                                        |
| --------- | ----------------- | ------------------------------------------------------------------ |
| `code`    | 🧑‍💻 Code Expert    | Production-quality code with error handling and idiomatic style    |
| `data`    | 📊 Data Analyst   | Statistical reasoning, distributions, correlations, visualizations |
| `writing` | ✍️ Writing Coach  | Feedback on clarity, structure, tone — never rewrites text         |
| `career`  | 💼 Career Advisor | Concrete, actionable advice with clarifying questions              |
| `unclear` | 🤔 Clarifier      | Asks the user to specify their intent among supported categories   |

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
- A **Groq API Key** ([get one here](https://console.groq.com/keys))

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

Edit `.env` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_CLASSIFIER_MODEL=llama-3.1-8b-instant
GROQ_GENERATION_MODEL=llama-3.1-8b-instant
PORT=3000
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

### 6. SQL Query (Code)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Explain this SQL query for me\"}"
```

### 7. Poem Request (Unclear)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Can you write me a poem about clouds?\"}"
```

### 8. Cover Letter (Career)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How do I structure a cover letter?\"}"
```

### 9. Verbose Writing (Writing)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"My boss says my writing is too verbose.\"}"
```

### 10. Pivot Table (Data)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What is a pivot table?\"}"
```

### 11. Mixed Intent (Unclear)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I need to write a function that takes a user id and returns their profile, but also I need help with my resume.\"}"
```

### 12. Empty Message (400 Error)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"\"}"
```

---

## Key Features

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

| Variable                | Default                | Description                          |
| ----------------------- | ---------------------- | ------------------------------------ |
| `GROQ_API_KEY`          | _(required)_           | Your Groq API key                    |
| `GROQ_CLASSIFIER_MODEL` | `llama-3.1-8b-instant` | Model used for intent classification |
| `GROQ_GENERATION_MODEL` | `llama-3.1-8b-instant` | Model used for final response        |
| `PORT`                  | `3000`                 | Server port                          |

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **LLM**: Groq Chat Completions API
- **Testing**: Vitest
- **Containerization**: Docker + Docker Compose
