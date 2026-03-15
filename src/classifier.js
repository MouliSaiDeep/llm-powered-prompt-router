// ─────────────────────────────────────────────────────────────
// classifier.js — Intent classification via LLM
// ─────────────────────────────────────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CLASSIFIER_PROMPT, SUPPORTED_INTENTS } from './prompts.js';

// Lazily initialised Gemini client
let model = null;

function getModel() {
  if (!model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use a fast, inexpensive model for classification
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return model;
}

/**
 * Detect a manual intent override prefix like "@code", "@data", etc.
 * Returns { intent, strippedMessage } or null if no override found.
 */
function detectManualOverride(message) {
  const match = message.match(/^@(\w+)\s+(.*)$/s);
  if (match) {
    const label = match[1].toLowerCase();
    if (SUPPORTED_INTENTS.includes(label) && label !== 'unclear') {
      return { intent: label, strippedMessage: match[2].trim() };
    }
  }
  return null;
}

/**
 * Extract JSON from a string that may contain markdown code fences.
 */
function extractJSON(text) {
  // Try to extract from ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }
  // Try direct parse (model may return raw JSON)
  return JSON.parse(text.trim());
}

/**
 * Classify the intent of a user message.
 *
 * @param {string} message - The user's raw message.
 * @returns {Promise<{ intent: string, confidence: number, overridden: boolean, originalMessage: string }>}
 */
export async function classifyIntent(message) {
  // 1. Check for manual override
  const override = detectManualOverride(message);
  if (override) {
    return {
      intent: override.intent,
      confidence: 1.0,
      overridden: true,
      originalMessage: override.strippedMessage,
    };
  }

  // 2. Call the LLM classifier
  try {
    const classifierModel = getModel();
    const result = await classifierModel.generateContent([
      { role: 'user', parts: [{ text: `${CLASSIFIER_PROMPT}\n\nUser message:\n"${message}"` }] },
    ]);
    const responseText = result.response.text();
    const parsed = extractJSON(responseText);

    // Validate the parsed response
    const intent = SUPPORTED_INTENTS.includes(parsed.intent) ? parsed.intent : 'unclear';
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.0;

    return { intent, confidence, overridden: false, originalMessage: message };
  } catch (error) {
    console.error('[classifier] Error classifying intent:', error.message);
    // Graceful fallback — never crash
    return { intent: 'unclear', confidence: 0.0, overridden: false, originalMessage: message };
  }
}
