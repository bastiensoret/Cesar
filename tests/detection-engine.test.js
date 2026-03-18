import { describe, it, expect, vi } from 'vitest';
import { DetectionEngine } from '../src/content/engine/detection-engine.js';

// Create a minimal mock DOM element
function createMockPost(text, authorName = 'Jean Dupont', subtitle = 'CEO at MyStartup') {
  const el = document.createElement('div');
  const textSpan = document.createElement('span');
  textSpan.className = 'break-words';
  textSpan.innerText = text;
  el.appendChild(textSpan);

  // Author info
  const actorName = document.createElement('span');
  actorName.innerText = authorName;
  const actorWrap = document.createElement('div');
  actorWrap.className = 'update-components-actor__name';
  actorWrap.appendChild(actorName);
  el.appendChild(actorWrap);

  const actorDesc = document.createElement('div');
  actorDesc.className = 'update-components-actor__description';
  actorDesc.innerText = subtitle;
  el.appendChild(actorDesc);

  return el;
}

describe('DetectionEngine', () => {
  it('initializes with clean stats', () => {
    const engine = new DetectionEngine();
    expect(engine.stats.postsScanned).toBe(0);
    expect(engine.stats.postsFlagged).toBe(0);
  });

  it('returns score 0 for short text', () => {
    const engine = new DetectionEngine();
    const post = createMockPost('Hi');
    const result = engine.fullAnalysis(post, 'Hi', { name: 'Test', subtitle: '' });
    expect(result.score).toBe(0);
    expect(result.flagged).toBe(false);
  });

  it('returns score 0 for empty text', () => {
    const engine = new DetectionEngine();
    const post = createMockPost('');
    const result = engine.fullAnalysis(post, '', { name: 'Test', subtitle: '' });
    expect(result.score).toBe(0);
  });

  it('detects parasitic post with both axes', () => {
    const engine = new DetectionEngine();
    const text =
      "Google vient de lancer un outil incroyable pour les développeurs. Commente 🔥 et je t'envoie le lien par MP. C'est une dinguerie absolue, un vrai game-changer pour la productivité.";
    const post = createMockPost(text);
    const result = engine.fullAnalysis(post, text, {
      name: 'Jean Dupont',
      subtitle: 'CEO at MyStartup',
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.flagged).toBe(true);
    expect(result.layer).toBeGreaterThanOrEqual(1);
  });

  it('does not flag a post with only CTA (own content)', () => {
    const engine = new DetectionEngine();
    const text =
      "J'ai créé un guide complet pour apprendre le marketing digital. Commente 🔥 pour le recevoir. C'est mon propre contenu que j'ai passé 3 mois à écrire.";
    const post = createMockPost(text);
    const result = engine.fullAnalysis(post, text, {
      name: 'Jean Dupont',
      subtitle: 'Marketing consultant',
    });
    expect(result.score).toBe(0);
    expect(result.flagged).toBe(false);
    expect(result.reason).toContain('not parasitic');
  });

  it('caps L1 score at 50', () => {
    const engine = new DetectionEngine();
    // Many matching patterns to push score high
    const text =
      "Google vient de lancer ChatGPT Copilot Claude Code. OpenAI just released Gemini. Anthropic a créé un outil. Commente 🔥 commente \"PROMPT\" je t'envoie le lien laisse un commentaire DM me.";
    const post = createMockPost(text);
    const result = engine.fullAnalysis(post, text, {
      name: 'Test',
      subtitle: 'Independent',
    });
    // L1 score should be capped at 50, combined capped at 75
    expect(result.layers.l1.score).toBeLessThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(75);
  });

  it('updates stats correctly', () => {
    const engine = new DetectionEngine();
    engine.updateStats(false);
    expect(engine.stats.postsScanned).toBe(1);
    expect(engine.stats.postsFlagged).toBe(0);

    engine.updateStats(true);
    expect(engine.stats.postsScanned).toBe(2);
    expect(engine.stats.postsFlagged).toBe(1);
  });
});
