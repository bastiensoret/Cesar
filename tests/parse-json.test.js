import { describe, it, expect } from 'vitest';
import { parseJSON } from '../src/background/utils.js';

describe('parseJSON', () => {
  it('parses valid JSON directly', () => {
    const input = '{"parasitic": true, "confidence": 85}';
    const result = parseJSON(input);
    expect(result.parasitic).toBe(true);
    expect(result.confidence).toBe(85);
  });

  it('handles JSON with whitespace', () => {
    const input = '  { "parasitic": false }  ';
    const result = parseJSON(input);
    expect(result.parasitic).toBe(false);
  });

  it('strips markdown code fences', () => {
    const input = '```json\n{"parasitic": true, "confidence": 90}\n```';
    const result = parseJSON(input);
    expect(result.parasitic).toBe(true);
    expect(result.confidence).toBe(90);
  });

  it('extracts JSON from surrounding text', () => {
    const input =
      'Here is my analysis:\n{"parasitic": true, "confidence": 75}\nHope that helps!';
    const result = parseJSON(input);
    expect(result.parasitic).toBe(true);
    expect(result.confidence).toBe(75);
  });

  it('handles truncated JSON (missing closing brace)', () => {
    const input = '{"parasitic": true, "confidence": 80';
    const result = parseJSON(input);
    expect(result.parasitic).toBe(true);
    expect(result.confidence).toBe(80);
  });

  it('throws on completely invalid input', () => {
    expect(() => parseJSON('this is not json at all')).toThrow('PARSE_ERROR');
  });

  it('throws on empty input', () => {
    expect(() => parseJSON('')).toThrow();
  });

  it('handles nested JSON objects', () => {
    const input = '{"parasitic": true, "confidence": 85, "details": {"source": "GitHub"}}';
    const result = parseJSON(input);
    expect(result.details.source).toBe('GitHub');
  });
});
