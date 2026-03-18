import { PROVIDERS, autoDetectProvider } from './providers.js';
import { callAnthropic } from './llm/anthropic.js';
import { callOpenAICompat } from './llm/openai-compat.js';
import { callGemini } from './llm/gemini.js';

const LLM_MAX_INPUT_LENGTH = 3000;

export async function verifyPost(postText, authorName) {
  const data = await chrome.storage.local.get(['cesar_api_key', 'cesar_provider']);
  const apiKey = data.cesar_api_key;
  const providerId = data.cesar_provider || autoDetectProvider(apiKey);

  if (!apiKey) throw new Error('NO_API_KEY');
  if (!providerId || !PROVIDERS[providerId]) throw new Error('UNKNOWN_PROVIDER');

  const provider = PROVIDERS[providerId];
  const truncatedText = postText.substring(0, LLM_MAX_INPUT_LENGTH);

  const userMessage = `Analyse ce post LinkedIn de "${authorName}" :

---
${truncatedText}
---

Ce post est-il un lead magnet parasitaire (gate du contenu d'un tiers) ou légitime (gate du contenu original) ?`;

  switch (providerId) {
    case 'anthropic':
      return await callAnthropic(apiKey, provider.model, userMessage);
    case 'gemini':
      return await callGemini(apiKey, provider.model, userMessage);
    default:
      return await callOpenAICompat(apiKey, provider.model, provider.endpoint, userMessage);
  }
}
