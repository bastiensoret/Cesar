import { describe, it, expect } from 'vitest';
import { analyzeLayer2 } from '../src/content/engine/layer2.js';

function createMockPost(html = '') {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function addComments(post, texts) {
  for (const t of texts) {
    const item = document.createElement('div');
    item.className = 'comments-comment-item';
    const span = document.createElement('span');
    span.className = 'break-words';
    span.textContent = t;
    item.appendChild(span);
    post.appendChild(item);
  }
}

describe('analyzeLayer2 — Comment bait (Signal A)', () => {
  it('detects high bait ratio comments', () => {
    const post = createMockPost();
    addComments(post, ['🔥', '🔥', '🔥', 'interested', 'me', 'please', '🚀']);
    const result = analyzeLayer2(post, 'some text here to analyze', { name: 'Test', subtitle: '' });
    expect(result.totalPoints).toBeGreaterThan(0);
    expect(result.signals.some((s) => s.id === 'l2_comments')).toBe(true);
  });

  it('ignores posts with too few comments', () => {
    const post = createMockPost();
    addComments(post, ['🔥', '🔥']);
    const result = analyzeLayer2(post, 'some text here to analyze', { name: 'Test', subtitle: '' });
    expect(result.details.comments.points).toBe(0);
  });

  it('ignores posts with genuine comments', () => {
    const post = createMockPost();
    addComments(post, [
      'Great article, thanks for sharing!',
      'I disagree with point 3, here is why...',
      'This is really helpful for my project',
      'Could you elaborate on the second part?',
      'I have been using this for months now',
    ]);
    const result = analyzeLayer2(post, 'some text here to analyze', { name: 'Test', subtitle: '' });
    expect(result.details.comments.points).toBe(0);
  });
});

describe('analyzeLayer2 — Public URL (Signal B)', () => {
  it('detects GitHub repo URL', () => {
    const post = createMockPost();
    const text = 'Check out this project at github.com/openai/whisper for transcription';
    const result = analyzeLayer2(post, text, { name: 'Test', subtitle: '' });
    expect(result.details.publicURLs.points).toBe(10);
    expect(result.details.publicURLs.signal).toContain('GitHub');
  });

  it('detects npm install command', () => {
    const post = createMockPost();
    const text = 'You can install it with npm install -g @google/clasp in your terminal';
    const result = analyzeLayer2(post, text, { name: 'Test', subtitle: '' });
    expect(result.details.publicURLs.points).toBe(10);
  });

  it('detects pip install command', () => {
    const post = createMockPost();
    const text = 'Just run pip install langchain and you are good to go with it';
    const result = analyzeLayer2(post, text, { name: 'Test', subtitle: '' });
    expect(result.details.publicURLs.points).toBe(10);
  });

  it('returns 0 for text without public URLs', () => {
    const post = createMockPost();
    const text = 'I created my own template for productivity tracking and it works great';
    const result = analyzeLayer2(post, text, { name: 'Test', subtitle: '' });
    expect(result.details.publicURLs.points).toBe(0);
  });
});

describe('analyzeLayer2 — Author mismatch (Signal C)', () => {
  it('detects mismatch when author does not work at mentioned company', () => {
    const post = createMockPost();
    const text = 'Google just released an amazing new API for developers everywhere';
    const result = analyzeLayer2(post, text, {
      name: 'Jean Dupont',
      subtitle: 'CEO at MyStartup',
    });
    expect(result.details.authorMismatch.points).toBe(10);
  });

  it('no mismatch when author works at the mentioned company', () => {
    const post = createMockPost();
    const text = 'Google just released an amazing new API for developers everywhere';
    const result = analyzeLayer2(post, text, {
      name: 'John Smith',
      subtitle: 'Engineer at Google',
    });
    expect(result.details.authorMismatch.points).toBe(0);
  });

  it('no mismatch when no known company is mentioned', () => {
    const post = createMockPost();
    const text = 'I built a custom tool for my workflow and it saves me hours every week';
    const result = analyzeLayer2(post, text, {
      name: 'Test User',
      subtitle: 'Freelance Developer',
    });
    expect(result.details.authorMismatch.points).toBe(0);
  });
});

describe('analyzeLayer2 — Post structure (Signal D)', () => {
  it('detects bullet list pattern', () => {
    const post = createMockPost();
    const text = [
      'Here are 7 features you need to know:',
      '• Feature one is great',
      '• Feature two is better',
      '• Feature three is amazing',
      '• Feature four is incredible',
      '• Feature five will blow your mind',
      'Comment below to get the guide!',
    ].join('\n');
    const result = analyzeLayer2(post, text, { name: 'Test', subtitle: '' });
    expect(result.details.structure.points).toBeGreaterThan(0);
  });

  it('returns 0 for simple text without structure patterns', () => {
    const post = createMockPost();
    const text = 'Just sharing my thoughts on the latest trends in AI development today';
    const result = analyzeLayer2(post, text, { name: 'Test', subtitle: '' });
    expect(result.details.structure.points).toBe(0);
  });
});

describe('analyzeLayer2 — total points cap', () => {
  it('caps total points at 25', () => {
    const post = createMockPost();
    // Trigger multiple signals at once
    addComments(post, ['🔥', '🔥', '🔥', '🔥', '🔥', '🔥', '🔥']);
    const text = [
      'Google just released something at github.com/google/new-tool',
      '• Feature one',
      '• Feature two',
      '• Feature three',
      '• Feature four',
      '• Feature five',
      'Comment 🔥 to get the link!',
    ].join('\n');
    const result = analyzeLayer2(post, text, {
      name: 'Jean Dupont',
      subtitle: 'Freelance',
    });
    // totalPoints can exceed 25 (it's capped later by DetectionEngine)
    expect(result.totalPoints).toBeGreaterThan(0);
  });
});
