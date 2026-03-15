// ─────────────────────────────────────────────────────────────
// router.js — Route to expert persona and generate response
// ─────────────────────────────────────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EXPERT_PROMPTS } from './prompts.js';

// Lazily initialised Gemini client for generation
let model = null;

function getModel() {
  if (!model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use a capable model for high-quality generation
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return model;
}

/**
 * Route the user message to the correct expert persona and generate a response.
 *
 * @param {string} message  - The (possibly stripped) user message.
 * @param {{ intent: string, confidence: number }} classification
 * @returns {Promise<string>} - The final generated response text.
 */
export async function routeAndRespond(message, classification) {
  const threshold = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7;

  // Determine effective intent (apply confidence threshold)
  const effectiveIntent =
    classification.intent === 'unclear' || classification.confidence < threshold
      ? 'unclear'
      : classification.intent;

  const systemPrompt = EXPERT_PROMPTS[effectiveIntent];

  if (!systemPrompt) {
    // Safety net — should never happen if prompts.js is correct
    return `I'm sorry, I encountered an internal routing error. Could you try rephrasing your question?`;
  }

  try {
    const generationModel = getModel();
    const chat = generationModel.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow those instructions precisely.' }] },
      ],
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error('[router] Error generating response:', error.message);
    return `I'm sorry, something went wrong while generating your response. Please try again.`;
  }
}
