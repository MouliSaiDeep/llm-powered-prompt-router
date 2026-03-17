import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const mockState = {
  classifierText: '{"intent":"code","confidence":0.92}',
  routerText: 'Mocked expert response',
  throwClassifier: false,
  throwRouter: false,
  classifierCalls: [],
  routerCalls: [],
};

vi.mock('../src/groq-client.js', () => {
  async function groqChatCompletion(params) {
    const systemPrompt = String(params?.messages?.[0]?.content || '');
    const isClassifierCall = systemPrompt.includes('intent-classification engine');

    if (isClassifierCall) {
      mockState.classifierCalls.push(params);
      if (mockState.throwClassifier) {
        throw new Error('classifier failed');
      }
      return mockState.classifierText;
    }

    mockState.routerCalls.push(params);
    if (mockState.throwRouter) {
      throw new Error('router failed');
    }
    return mockState.routerText;
  }

  function getClassifierModel() {
    return 'test-classifier-model';
  }

  function getGenerationModel() {
    return 'test-generation-model';
  }

  return { groqChatCompletion, getClassifierModel, getGenerationModel };
});

import { SUPPORTED_INTENTS, EXPERT_PROMPTS, CLASSIFIER_PROMPT } from '../src/prompts.js';
import { classifyIntent, classify_intent } from '../src/classifier.js';
import { routeAndRespond, route_and_respond } from '../src/router.js';
import { logRoute } from '../src/logger.js';
import { handleMessage } from '../src/index.js';

const logFile = join(process.cwd(), 'route_log.jsonl');

function resetMockState() {
  mockState.classifierText = '{"intent":"code","confidence":0.92}';
  mockState.routerText = 'Mocked expert response';
  mockState.throwClassifier = false;
  mockState.throwRouter = false;
  mockState.classifierCalls.length = 0;
  mockState.routerCalls.length = 0;
}

async function clearLogFile() {
  try {
    await unlink(logFile);
  } catch {
    // Log file may not exist yet.
  }
}

beforeEach(async () => {
  resetMockState();
  await clearLogFile();
});

describe('Prompts Configuration', () => {
  it('defines at least four expert prompts', () => {
    expect(Object.keys(EXPERT_PROMPTS).length).toBeGreaterThanOrEqual(4);
  });

  it('stores prompts by intent label', () => {
    for (const intent of SUPPORTED_INTENTS) {
      expect(typeof EXPERT_PROMPTS[intent]).toBe('string');
      expect(EXPERT_PROMPTS[intent].length).toBeGreaterThan(50);
    }
  });

  it('contains a classifier prompt that requests JSON output', () => {
    expect(typeof CLASSIFIER_PROMPT).toBe('string');
    expect(CLASSIFIER_PROMPT).toContain('JSON');
  });
});

describe('classifyIntent', () => {
  it('returns structured intent and confidence from JSON classifier output', async () => {
    mockState.classifierText = '{"intent":"data","confidence":0.81}';

    const result = await classifyIntent('What is the average of 10, 20, 30?');

    expect(result).toEqual({ intent: 'data', confidence: 0.81 });
    expect(mockState.classifierCalls).toHaveLength(1);
    expect(mockState.classifierCalls[0].responseFormat).toEqual({ type: 'json_object' });
  });

  it('falls back to unclear/0.0 for malformed JSON', async () => {
    mockState.classifierText = 'not valid json';

    const result = await classifyIntent('hello');

    expect(result).toEqual({ intent: 'unclear', confidence: 0.0 });
  });

  it('falls back to unclear/0.0 if classifier call throws', async () => {
    mockState.throwClassifier = true;

    const result = await classifyIntent('how do i sort a list');

    expect(result).toEqual({ intent: 'unclear', confidence: 0.0 });
  });

  it('exposes classify_intent alias', async () => {
    mockState.classifierText = '{"intent":"writing","confidence":0.75}';

    const result = await classify_intent('My paragraph sounds awkward.');

    expect(result).toEqual({ intent: 'writing', confidence: 0.75 });
  });

  it('forces poem-style creative generation requests to unclear', async () => {
    mockState.classifierText = '{"intent":"writing","confidence":0.95}';

    const result = await classifyIntent('Can you write me a poem about clouds?');

    expect(result).toEqual({ intent: 'unclear', confidence: 0.0 });
  });

  it('forces mixed-intent messages to unclear', async () => {
    mockState.classifierText = '{"intent":"code","confidence":0.91}';

    const result = await classifyIntent('I need a function for user profiles, and I also need resume help.');

    expect(result).toEqual({ intent: 'unclear', confidence: 0.0 });
  });
});

describe('routeAndRespond', () => {
  it('routes a supported intent to the matching expert prompt and generates text', async () => {
    mockState.routerText = 'Code expert response';

    const result = await routeAndRespond('Write a function in JS', {
      intent: 'code',
      confidence: 0.9,
    });

    expect(result).toBe('Code expert response');
    expect(mockState.routerCalls).toHaveLength(1);
    expect(mockState.routerCalls[0].messages[0].content).toContain(EXPERT_PROMPTS.code);
    expect(mockState.routerCalls[0].messages[1].content).toContain('Write a function in JS');
  });

  it('asks for clarification when intent is unclear', async () => {
    const result = await routeAndRespond('help me', {
      intent: 'unclear',
      confidence: 0.2,
    });

    expect(result).toMatch(/coding|data analysis|writing feedback|career advice/i);
    expect(mockState.routerCalls).toHaveLength(0);
  });

  it('asks for clarification for unsupported intent labels', async () => {
    const result = await routeAndRespond('do a thing', {
      intent: 'music',
      confidence: 1,
    });

    expect(result).toMatch(/clarify|coding|data analysis|writing feedback|career advice/i);
    expect(mockState.routerCalls).toHaveLength(0);
  });

  it('exposes route_and_respond alias', async () => {
    mockState.routerText = 'Career response';

    const result = await route_and_respond('Interview tips?', {
      intent: 'career',
      confidence: 0.88,
    });

    expect(result).toBe('Career response');
  });
});

describe('logRoute', () => {
  it('appends valid JSON lines with required keys', async () => {
    await logRoute({
      intent: 'code',
      confidence: 0.93,
      user_message: 'How to reverse a linked list?',
      final_response: 'Use two pointers',
    });

    const content = await readFile(logFile, 'utf-8');
    const line = content.trim();
    const parsed = JSON.parse(line);

    expect(parsed).toHaveProperty('intent', 'code');
    expect(parsed).toHaveProperty('confidence', 0.93);
    expect(parsed).toHaveProperty('user_message', 'How to reverse a linked list?');
    expect(parsed).toHaveProperty('final_response', 'Use two pointers');
  });
});

describe('handleMessage integration', () => {
  it('classifies, routes, and logs one request', async () => {
    mockState.classifierText = '{"intent":"writing","confidence":0.84}';
    mockState.routerText = 'Writing coach response';

    const result = await handleMessage('My writing is too verbose.');

    expect(result).toEqual({
      intent: 'writing',
      confidence: 0.84,
      response: 'Writing coach response',
    });

    const content = await readFile(logFile, 'utf-8');
    const parsed = JSON.parse(content.trim());
    expect(parsed).toHaveProperty('intent', 'writing');
    expect(parsed).toHaveProperty('confidence', 0.84);
    expect(parsed).toHaveProperty('user_message', 'My writing is too verbose.');
    expect(parsed).toHaveProperty('final_response', 'Writing coach response');
  });
});
