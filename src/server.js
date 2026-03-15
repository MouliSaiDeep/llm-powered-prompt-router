// ─────────────────────────────────────────────────────────────
// server.js — Express API server
// ─────────────────────────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import { handleMessage } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// ── API Routes ──────────────────────────────────────────────

/**
 * POST /api/chat
 * Body: { "message": "user message here" }
 * Response: { "intent", "confidence", "overridden", "response" }
 */
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty "message" field is required.' });
  }

  try {
    const result = await handleMessage(message.trim());
    res.json(result);
  } catch (error) {
    console.error('[server] Unhandled error in /api/chat:', error);
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Prompt Router is running at  http://localhost:${PORT}\n`);
});
