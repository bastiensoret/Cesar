import { describe, it, expect } from 'vitest';
import { escapeHTML } from '../src/shared/sanitize.js';

describe('escapeHTML', () => {
  it('escapes HTML tags', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', () => {
    expect(escapeHTML("it's")).toBe('it&#39;s');
  });

  it('escapes double quotes', () => {
    expect(escapeHTML('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
    expect(escapeHTML('')).toBe('');
  });

  it('handles strings with no special characters', () => {
    expect(escapeHTML('hello world')).toBe('hello world');
  });

  it('handles complex XSS payloads', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const escaped = escapeHTML(payload);
    expect(escaped).not.toContain('<img');
    expect(escaped).not.toContain('<');
    expect(escaped).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('escapes mixed content', () => {
    expect(escapeHTML('1 < 2 & 3 > 0')).toBe('1 &lt; 2 &amp; 3 &gt; 0');
  });

  it('converts non-string input to string', () => {
    expect(escapeHTML(42)).toBe('42');
  });
});
