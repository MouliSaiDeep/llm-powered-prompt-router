// ─────────────────────────────────────────────────────────────
// router.test.js — Vitest tests for the Prompt Router
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';
import { SUPPORTED_INTENTS, EXPERT_PROMPTS, CLASSIFIER_PROMPT } from '../src/prompts.js';
import { classifyIntent } from '../src/classifier.js';
import { routeAndRespond } from '../src/router.js';
import { logRoute } from '../src/logger.js';
import { handleMessage } from '../src/index.js';
import { TEST_MESSAGES } from './test-messages.js';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// ── Prompts configuration tests ────────────────────────────
describe('Prompts Configuration', () => {
  it('should have at least 4 expert prompts', () => {
    const keys = Object.keys(EXPERT_PROMPTS);
    expect(keys.length).toBeGreaterThanOrEqual(4);
  });

  it('should have prompts keyed by supported intents', () => {
    for (const intent of SUPPORTED_INTENTS) {
      expect(EXPERT_PROMPTS).toHaveProperty(intent);
      expect(typeof EXPERT_PROMPTS[intent]).toBe('string');
      expect(EXPERT_PROMPTS[intent].length).toBeGreaterThan(50);
    }
  });

  it('each prompt should establish a distinct persona', () => {
    const prompts = Object.values(EXPERT_PROMPTS);
    // All prompts should be unique
    const unique = new Set(prompts);
    expect(unique.size).toBe(prompts.length);
  });

  it('should have a classifier prompt', () => {
    expect(typeof CLASSIFIER_PROMPT).toBe('string');
    expect(CLASSIFIER_PROMPT.length).toBeGreaterThan(50);
    expect(CLASSIFIER_PROMPT).toContain('JSON');
  });
});

// ── Classifier tests ───────────────────────────────────────
describe('classifyIntent', () => {
  it('should return an object with intent and confidence keys', async () => {
    const result = await classifyIntent('How do I sort a list in Python?');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');
    expect(SUPPORTED_INTENTS).toContain(result.intent);
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }, 15000);

  it('should classify a code message as "code"', async () => {
    const result = await classifyIntent('Write a function to reverse a string in JavaScript');
    expect(result.intent).toBe('code');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  }, 15000);

  it('should classify a data message as "data"', async () => {
    const result = await classifyIntent('What is the median of 5, 10, 15, 20, 25?');
    expect(result.intent).toBe('data');
  }, 15000);

  it('should classify a writing message as "writing"', async () => {
    const result = await classifyIntent('My paragraph has too much passive voice, help me fix it');
    expect(result.intent).toBe('writing');
  }, 15000);

  it('should classify a career message as "career"', async () => {
    const result = await classifyIntent('How should I prepare for a software engineering interview?');
    expect(result.intent).toBe('career');
  }, 15000);

  it('should handle manual override @code', async () => {
    const result = await classifyIntent('@code Fix this bug in my loop');
    expect(result.intent).toBe('code');
    expect(result.confidence).toBe(1.0);
    expect(result.overridden).toBe(true);
    expect(result.originalMessage).toBe('Fix this bug in my loop');
  });

  it('should handle manual override @data', async () => {
    const result = await classifyIntent('@data Analyze this dataset');
    expect(result.intent).toBe('data');
    expect(result.confidence).toBe(1.0);
    expect(result.overridden).toBe(true);
  });

  it('should not override for unsupported prefix like @unknown', async () => {
    const result = await classifyIntent('@unknown Do something');
    expect(result.overridden).toBeFalsy();
  }, 15000);

  it('should default to unclear for very vague input', async () => {
    const result = await classifyIntent('hey');
    expect(['unclear']).toContain(result.intent);
  }, 15000);
});

// ── Router tests ───────────────────────────────────────────
describe('routeAndRespond', () => {
  it('should return a string response for a code intent', async () => {
    const response = await routeAndRespond('Write a hello world in Python', {
      intent: 'code',
      confidence: 0.95,
    });
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(10);
  }, 30000);

  it('should ask a clarifying question for unclear intent', async () => {
    const response = await routeAndRespond('Help me', {
      intent: 'unclear',
      confidence: 0.3,
    });
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(10);
    // Should be a question / contain question-like language
    expect(response).toMatch(/\?|help|clarif|looking for|assist|need|coding|writing|data|career/i);
  }, 30000);

  it('should treat low confidence as unclear', async () => {
    const response = await routeAndRespond('Something', {
      intent: 'code',
      confidence: 0.3,
    });
    // Low confidence → unclear persona
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(5);
  }, 30000);
});

// ── Logger tests ───────────────────────────────────────────
describe('logRoute', () => {
  const logFile = join(process.cwd(), 'route_log.jsonl');

  it('should append a valid JSON line to the log file', async () => {
    const entry = {
      intent: 'code',
      confidence: 0.95,
      user_message: 'test message for logger',
      final_response: 'test response',
    };

    await logRoute(entry);

    const content = await readFile(logFile, 'utf-8');
    const lines = content.trim().split('\n');
    const lastLine = JSON.parse(lines[lines.length - 1]);

    expect(lastLine).toHaveProperty('intent', 'code');
    expect(lastLine).toHaveProperty('confidence', 0.95);
    expect(lastLine).toHaveProperty('user_message', 'test message for logger');
    expect(lastLine).toHaveProperty('final_response', 'test response');
    expect(lastLine).toHaveProperty('timestamp');
  });
});

// ── End-to-end integration tests ───────────────────────────
describe('handleMessage (end-to-end)', () => {
  it('should process a message and return intent, confidence, and response', async () => {
    const result = await handleMessage('How do I reverse a linked list?');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('response');
    expect(typeof result.response).toBe('string');
    expect(result.response.length).toBeGreaterThan(10);
  }, 30000);

  it('should process a manual override message', async () => {
    const result = await handleMessage('@writing My sentence is too wordy');
    expect(result.intent).toBe('writing');
    expect(result.confidence).toBe(1.0);
    expect(result.overridden).toBe(true);
    expect(typeof result.response).toBe('string');
  }, 30000);
});
