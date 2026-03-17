// ─────────────────────────────────────────────────────────────
// classifier.js — Intent classification via LLM
// ─────────────────────────────────────────────────────────────
import { CLASSIFIER_PROMPT, SUPPORTED_INTENTS } from './prompts.js';
import { getClassifierModel, groqChatCompletion } from './groq-client.js';

/**
 * Parse classifier JSON response text.
 * Handles both raw JSON and fenced JSON blocks.
 */
function extractClassifierJSON(text) {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

function normalizeClassification(parsed) {
  const normalizedIntent = typeof parsed?.intent === 'string'
    ? parsed.intent.toLowerCase()
    : '';

  const intent = SUPPORTED_INTENTS.includes(normalizedIntent)
    ? normalizedIntent
    : 'unclear';

  const confidence = typeof parsed?.confidence === 'number'
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.0;

  return { intent, confidence };
}

function countMatchedGroups(text, groups) {
  return groups.reduce((count, patterns) => {
    const matched = patterns.some((pattern) => pattern.test(text));
    return count + (matched ? 1 : 0);
  }, 0);
}

/**
 * Enforce assignment-specific classification behavior for known ambiguous cases.
 * The classifier LLM still runs first; these guards only adjust edge outcomes.
 */
function enforceRequirementAlignment(message, classification) {
  const text = message.toLowerCase();

  const creativeGenerationPatterns = [
    /\bwrite\b.*\bpoem\b/i,
    /\bpoem\b/i,
    /\b(haiku|lyrics|song|story|fiction)\b/i,
    /\b(write|generate|create|compose|draft)\b.*\b(poem|haiku|lyrics|song|story|fiction)\b/i,
  ];

  const asksForCreativeGeneration = creativeGenerationPatterns.some((pattern) => pattern.test(text));
  if (asksForCreativeGeneration) {
    return { intent: 'unclear', confidence: 0.0 };
  }

  const intentSignals = [
    [
      /\b(code|coding|function|bug|debug|python|javascript|typescript|java|rust|sql|query|api|loop)\b/i,
    ],
    [
      /\b(data|dataset|average|mean|median|statistics|pivot table|correlation|outlier|distribution)\b/i,
    ],
    [
      /\b(writing|paragraph|sentence|grammar|tone|awkward|verbose|passive voice|professional)\b/i,
    ],
    [
      /\b(career|interview|resume|cv|cover letter|job|professional development)\b/i,
    ],
  ];

  // If multiple intent domains are clearly present, require clarification.
  if (countMatchedGroups(text, intentSignals) >= 2) {
    return { intent: 'unclear', confidence: 0.0 };
  }

  return classification;
}

/**
 * Classify the intent of a user message.
 *
 * @param {string} message - The user's raw message.
 * @returns {Promise<{ intent: string, confidence: number }>}
 */
export async function classifyIntent(message) {
  try {
    const responseText = await groqChatCompletion({
      model: getClassifierModel(),
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0,
      responseFormat: { type: 'json_object' },
      maxTokens: 120,
    });
    const parsed = extractClassifierJSON(responseText);
    const normalized = normalizeClassification(parsed);
    return enforceRequirementAlignment(message, normalized);
  } catch (error) {
    console.error('[classifier] Failed to classify message:', error.message);
    return { intent: 'unclear', confidence: 0.0 };
  }
}

// Snake_case alias for requirements parity/documentation consistency.
export const classify_intent = classifyIntent;
