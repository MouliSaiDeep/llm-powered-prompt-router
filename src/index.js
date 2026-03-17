// ─────────────────────────────────────────────────────────────
// index.js — Main orchestrator: classify → route → log
// ─────────────────────────────────────────────────────────────
import { classifyIntent } from './classifier.js';
import { routeAndRespond } from './router.js';
import { logRoute } from './logger.js';

/**
 * Process a single user message end-to-end.
 *
 * @param {string} message - Raw user message.
 * @returns {Promise<{ intent: string, confidence: number, response: string }>}
 */
export async function handleMessage(message) {
  // Step 1 — Classify the intent
  const classification = await classifyIntent(message);

  // Step 2 — Route to the expert and generate a response
  const response = await routeAndRespond(message, classification);

  // Step 3 — Log the routing decision
  await logRoute({
    intent: classification.intent,
    confidence: classification.confidence,
    user_message: message,
    final_response: response,
  });

  return {
    intent: classification.intent,
    confidence: classification.confidence,
    response,
  };
}
