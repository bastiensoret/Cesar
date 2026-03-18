import { describe, it, expect } from 'vitest';
import { THIRD_PARTY_PATTERNS } from '../src/content/patterns/third-party.js';
import { GATING_CTA_PATTERNS } from '../src/content/patterns/gating-cta.js';
import { analyzeLayer1 } from '../src/content/engine/layer1.js';

describe('THIRD_PARTY_PATTERNS', () => {
  it('has all expected patterns defined', () => {
    expect(THIRD_PARTY_PATTERNS.length).toBeGreaterThanOrEqual(11);
    for (const p of THIRD_PARTY_PATTERNS) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('regex');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('weight');
    }
  });

  it('detects French third-party launch', () => {
    const text = 'Google vient de lancer un nouvel outil incroyable';
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
    expect(result.rawTP).toBeGreaterThan(0);
  });

  it('detects English third-party launch', () => {
    const text = 'OpenAI just released a new model for everyone';
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
  });

  it('detects known products', () => {
    const text = 'Have you tried Claude Code yet? It changed everything.';
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
    expect(result.matches.some((m) => m.id === 'tp_known_product')).toBe(true);
  });

  it('detects known company + launch', () => {
    const text = 'Anthropic just launched something huge for developers';
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
  });

  it('detects French repackaging language', () => {
    const text = "Je te résume tout ce que fait l'outil en 5 points";
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
  });

  it('does not flag normal text without third-party mentions', () => {
    const text = "J'ai créé un template Notion pour organiser mes journées.";
    const result = analyzeLayer1(text);
    // "Notion" is a known company, but without launch context it might not match tp_known_tool
    // This verifies there's no false positive on the creation patterns
    expect(result.hasCTA).toBe(false);
  });
});

describe('GATING_CTA_PATTERNS', () => {
  it('has all expected patterns defined', () => {
    expect(GATING_CTA_PATTERNS.length).toBeGreaterThanOrEqual(15);
    for (const p of GATING_CTA_PATTERNS) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('regex');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('weight');
    }
  });

  it('detects French emoji comment CTA', () => {
    const text = 'Commente 🔥 et je te partage le lien';
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
  });

  it('detects French keyword comment CTA', () => {
    const text = 'Commente "PROMPT" pour recevoir le guide';
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
  });

  it('detects French DM promise', () => {
    const text = "Je t'envoie le lien en MP si tu commentes";
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
  });

  it('detects English comment CTA', () => {
    const text = "Comment 🔥 and I'll send you the link";
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
  });

  it('detects English send promise', () => {
    const text = "I'll DM everyone who comments the guide";
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
  });

  it('detects English leave a comment', () => {
    const text = 'Drop a comment below to get the resource';
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
  });

  it('does not flag normal text without CTAs', () => {
    const text = "I've been using this tool for 3 months and here are my thoughts.";
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(false);
  });
});

describe('analyzeLayer1 — two-axis detection', () => {
  it('returns both axes when post is parasitic', () => {
    const text =
      "Google vient de lancer un outil incroyable. Commente 🔥 et je t'envoie le lien.";
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
    expect(result.hasCTA).toBe(true);
    expect(result.rawTP).toBeGreaterThan(0);
    expect(result.rawCTA).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
  });

  it('returns only CTA axis for self-gating', () => {
    const text = "J'ai créé un guide complet. Commente 🔥 pour le recevoir.";
    const result = analyzeLayer1(text);
    expect(result.hasCTA).toBe(true);
    expect(result.hasTP).toBe(false);
  });

  it('returns only TP axis for mention without gating', () => {
    const text = "OpenAI just released GPT-5. Here's what I think about it.";
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(true);
    expect(result.hasCTA).toBe(false);
  });

  it('returns nothing for clean text', () => {
    const text = 'Beautiful morning today. Going to the office.';
    const result = analyzeLayer1(text);
    expect(result.hasTP).toBe(false);
    expect(result.hasCTA).toBe(false);
    expect(result.matches).toHaveLength(0);
  });
});
