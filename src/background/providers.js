export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    model: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    cost: '$1 / $5 per 1M tokens',
    endpoint: 'https://api.anthropic.com/v1/messages',
    detect: (key) => key.startsWith('sk-ant-'),
  },
  openai: {
    name: 'OpenAI',
    model: 'gpt-5-mini',
    label: 'GPT-5 mini',
    cost: '$0.25 / $2 per 1M tokens',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    detect: (key) => key.startsWith('sk-') && !key.startsWith('sk-ant-'),
  },
  gemini: {
    name: 'Google',
    model: 'gemini-3-flash',
    label: 'Gemini 3 Flash',
    cost: '$0.50 / $3 per 1M tokens',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent',
    detect: (key) => key.startsWith('AIza'),
  },
  grok: {
    name: 'xAI',
    model: 'grok-4.1',
    label: 'Grok 4.1 Fast',
    cost: '$0.20 / $0.50 per 1M tokens',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    detect: (key) => key.startsWith('xai-'),
  },
};

/**
 * Auto-detect provider from key prefix (best effort).
 * Returns null if ambiguous — user should select manually.
 */
export function autoDetectProvider(key) {
  if (!key) return null;
  for (const [id, config] of Object.entries(PROVIDERS)) {
    if (config.detect(key)) return id;
  }
  return null;
}
