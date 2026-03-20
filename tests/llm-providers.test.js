import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAnthropic } from '../src/background/llm/anthropic.js';
import { callOpenAICompat } from '../src/background/llm/openai-compat.js';
import { callGemini } from '../src/background/llm/gemini.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

const VALID_LLM_RESULT = {
  parasitic: true,
  confidence: 85,
  reason: 'Repackaged official docs',
  original_source: 'Google Docs',
  gated_content: 'CLI installation guide',
  is_original: 'Not original content',
  suggested_comment: 'The docs are here: docs.google.com',
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('callAnthropic', () => {
  it('parses a valid response', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        content: [{ text: JSON.stringify(VALID_LLM_RESULT) }],
        usage: { cache_read_input_tokens: 100 },
      })
    );

    const result = await callAnthropic('sk-ant-test', 'claude-haiku-4-5-20251001', 'test message');
    expect(result.parasitic).toBe(true);
    expect(result.confidence).toBe(85);
  });

  it('throws on 401 (invalid key)', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({ error: { message: 'Invalid API key' } }, false, 401)
    );

    await expect(callAnthropic('bad-key', 'model', 'msg')).rejects.toThrow('INVALID_API_KEY');
  });

  it('throws on 429 (rate limited)', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 429));

    await expect(callAnthropic('key', 'model', 'msg')).rejects.toThrow('RATE_LIMITED');
  });

  it('sends correct headers', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({ content: [{ text: JSON.stringify(VALID_LLM_RESULT) }] })
    );

    await callAnthropic('sk-ant-test', 'claude-haiku-4-5-20251001', 'test');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('sk-ant-test');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');
  });
});

describe('callOpenAICompat', () => {
  it('parses a valid response', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        choices: [{ message: { content: JSON.stringify(VALID_LLM_RESULT) } }],
      })
    );

    const result = await callOpenAICompat(
      'sk-test',
      'gpt-5-mini',
      'https://api.openai.com/v1/chat/completions',
      'test message'
    );
    expect(result.parasitic).toBe(true);
    expect(result.confidence).toBe(85);
  });

  it('throws on API error', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({ error: { message: 'Server error' } }, false, 500)
    );

    await expect(
      callOpenAICompat('key', 'model', 'https://api.openai.com/v1/chat/completions', 'msg')
    ).rejects.toThrow('API_ERROR_500');
  });
});

describe('callGemini', () => {
  it('parses a valid response', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: JSON.stringify(VALID_LLM_RESULT) }] } }],
      })
    );

    const result = await callGemini('AIza-test', 'gemini-3-flash', 'test message');
    expect(result.parasitic).toBe(true);
  });

  it('includes API key in URL', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: JSON.stringify(VALID_LLM_RESULT) }] } }],
      })
    );

    await callGemini('AIza-test-key', 'gemini-3-flash', 'test');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('key=AIza-test-key');
  });

  it('throws on 401', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({ error: { message: 'Bad key' } }, false, 401)
    );

    await expect(callGemini('bad', 'model', 'msg')).rejects.toThrow('INVALID_API_KEY');
  });
});
