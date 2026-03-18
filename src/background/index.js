/**
 * César v0.6 — Background Service Worker
 * Multi-LLM support with prompt caching and comment drafting.
 */

import { PROVIDERS, autoDetectProvider } from './providers.js';
import { verifyPost } from './verify.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'cesar-verify') {
    verifyPost(message.postText, message.authorName)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'cesar-get-providers') {
    const list = Object.entries(PROVIDERS).map(([id, c]) => ({
      id,
      name: c.name,
      model: c.model,
      keyPlaceholder: c.keyPlaceholder,
    }));
    sendResponse({ providers: list });
    return true;
  }

  if (message.type === 'cesar-check-key') {
    chrome.storage.local.get(['cesar_api_key', 'cesar_provider'], (data) => {
      const key = data.cesar_api_key;
      const provider = data.cesar_provider || autoDetectProvider(key);
      const info = provider ? PROVIDERS[provider] : null;
      sendResponse({
        hasKey: !!key,
        provider: provider,
        providerName: info?.name || null,
        model: info?.model || null,
      });
    });
    return true;
  }
});
