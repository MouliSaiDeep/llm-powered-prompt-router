// ─────────────────────────────────────────────────────────────
// groq-client.js — Shared Groq Chat Completions client helpers
// ─────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function getClassifierModel() {
  return process.env.GROQ_CLASSIFIER_MODEL || 'llama-3.1-8b-instant';
}

export function getGenerationModel() {
  return process.env.GROQ_GENERATION_MODEL || 'llama-3.1-8b-instant';
}

/**
 * Execute a chat completion request against Groq's OpenAI-compatible API.
 *
 * @param {{
 *   model: string,
 *   messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
 *   temperature?: number,
 *   maxTokens?: number,
 *   responseFormat?: { type: string }
 * }} params
 * @returns {Promise<string>}
 */
export async function groqChatCompletion(params) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable');
  }

  const body = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
  };

  if (typeof params.maxTokens === 'number') {
    body.max_tokens = params.maxTokens;
  }

  if (params.responseFormat) {
    body.response_format = params.responseFormat;
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Groq response did not contain message content');
  }

  return content;
}
