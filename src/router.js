// ─────────────────────────────────────────────────────────────
// router.js — Route to expert persona and generate response
// ─────────────────────────────────────────────────────────────
import { EXPERT_PROMPTS, SUPPORTED_INTENTS } from './prompts.js';
import { getGenerationModel, groqChatCompletion } from './groq-client.js';

/**
 * Route the user message to the correct expert persona and generate a response.
 *
 * @param {string} message  - The (possibly stripped) user message.
 * @param {{ intent: string, confidence: number }} classification
 * @returns {Promise<string>} - The final generated response text.
 */
export async function routeAndRespond(message, classification) {
  const requestedIntent = classification?.intent;
  const effectiveIntent = SUPPORTED_INTENTS.includes(requestedIntent)
    ? requestedIntent
    : 'unclear';

  if (effectiveIntent === 'unclear') {
    return 'Could you clarify what kind of help you want: coding, data analysis, writing feedback, or career advice?';
  }

  const systemPrompt = EXPERT_PROMPTS[effectiveIntent];

  if (!systemPrompt) {
    return 'Could you clarify what kind of help you want: coding, data analysis, writing feedback, or career advice?';
  }

  try {
    const responseText = await groqChatCompletion({
      model: getGenerationModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.4,
      maxTokens: 1200,
    });
    return responseText;
  } catch (error) {
    console.error('[router] Error generating response:', error.message);
    return 'I had trouble generating a response. Please try again.';
  }
}

// Snake_case alias for requirements parity/documentation consistency.
export const route_and_respond = routeAndRespond;
