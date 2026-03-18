import { describe, it, expect } from 'vitest';
import { PROVIDERS, autoDetectProvider } from '../src/background/providers.js';

describe('PROVIDERS', () => {
  it('has all 4 providers configured', () => {
    expect(Object.keys(PROVIDERS)).toEqual(['anthropic', 'openai', 'gemini', 'grok']);
  });

  it('each provider has required fields', () => {
    for (const [_id, config] of Object.entries(PROVIDERS)) {
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('endpoint');
      expect(config).toHaveProperty('detect');
      expect(typeof config.detect).toBe('function');
    }
  });
});

describe('autoDetectProvider', () => {
  it('detects Anthropic from sk-ant- prefix', () => {
    expect(autoDetectProvider('sk-ant-api03-abc123')).toBe('anthropic');
  });

  it('detects OpenAI from sk- prefix (not sk-ant-)', () => {
    expect(autoDetectProvider('sk-proj-abc123')).toBe('openai');
  });

  it('detects Gemini from AIza prefix', () => {
    expect(autoDetectProvider('AIzaSyB-abc123')).toBe('gemini');
  });

  it('detects Grok from xai- prefix', () => {
    expect(autoDetectProvider('xai-abc123')).toBe('grok');
  });

  it('returns null for unknown key format', () => {
    expect(autoDetectProvider('unknown-key')).toBeNull();
  });

  it('returns null for empty key', () => {
    expect(autoDetectProvider('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(autoDetectProvider(undefined)).toBeNull();
  });
});
