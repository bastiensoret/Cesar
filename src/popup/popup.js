/**
 * César v0.6 — Popup Script
 * Minimal UI: parasite count, web search toggle, reveal menu for settings.
 */

import { getStorage, setStorage } from '../shared/storage.js';

const PROVIDER_NAMES = {
  anthropic: 'Anthropic — Haiku 4.5',
  openai: 'OpenAI — GPT-5 mini',
  gemini: 'Google — Gemini 3 Flash',
  grok: 'xAI — Grok 4.1 Fast',
};

function autoDetect(key) {
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('xai-')) return 'grok';
  if (key.startsWith('sk-')) return 'openai';
  return null;
}

function updateApiStatus(key, providerSetting) {
  const status = document.getElementById('api-status');
  const provider =
    !providerSetting || providerSetting === 'auto' ? autoDetect(key) : providerSetting;
  const name = PROVIDER_NAMES[provider];
  if (name) {
    status.innerHTML = `<span style="color:#7bed9f">●</span> ${name}`;
    status.style.color = '#7bed9f';
  } else {
    status.textContent = 'Unknown provider';
    status.style.color = '#ff6b81';
  }
}

async function updateSetting(key, value) {
  const data = await getStorage(['cesar_settings']);
  const s = data.cesar_settings || {};
  s[key] = value;
  await setStorage({ cesar_settings: s });
}

async function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (!key || key.includes('...')) return;

  const providerSelect = document.getElementById('provider-select').value;
  const detected = autoDetect(key);
  const effective = providerSelect !== 'auto' ? providerSelect : detected;

  if (!effective) {
    document.getElementById('api-status').textContent = 'Unknown key — select a provider manually';
    document.getElementById('api-status').style.color = '#ff6b81';
    return;
  }

  await setStorage({ cesar_api_key: key, cesar_provider: effective });
  input.value = key.substring(0, 10) + '...' + key.substring(key.length - 4);
  document.getElementById('provider-select').value = effective;
  updateApiStatus(key, effective);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load all saved state
  const data = await getStorage([
    'cesar_stats',
    'cesar_settings',
    'cesar_api_key',
    'cesar_provider',
  ]);

  const stats = data.cesar_stats || { postsScanned: 0, postsFlagged: 0 };
  const settings = data.cesar_settings || {
    active: true,
    debug: false,
    autoExpand: false,
    webSearch: false,
  };

  document.getElementById('posts-flagged').textContent = stats.postsFlagged;

  document.getElementById('toggle-active').checked = settings.active;
  document.getElementById('toggle-debug').checked = settings.debug;
  document.getElementById('toggle-expand').checked = settings.autoExpand;
  document.getElementById('toggle-websearch').checked = settings.webSearch || false;

  const provider = data.cesar_provider || 'auto';
  document.getElementById('provider-select').value = provider;

  const apiKey = data.cesar_api_key;
  if (apiKey) {
    document.getElementById('api-key-input').value =
      apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    updateApiStatus(apiKey, provider);
  }

  // Reveal menu toggle
  document.getElementById('reveal-btn').addEventListener('click', () => {
    const btn = document.getElementById('reveal-btn');
    const content = document.getElementById('reveal-content');
    btn.classList.toggle('open');
    content.classList.toggle('open');
  });

  // Web search toggle — requires API key
  document.getElementById('toggle-websearch').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const keyData = await getStorage(['cesar_api_key']);
      if (!keyData.cesar_api_key) {
        e.target.checked = false;
        const desc = document.querySelector('.web-search-desc');
        const originalText = desc.textContent;
        desc.textContent = 'An API key is required for web search. Add one in Settings below.';
        desc.style.color = '#ff6b81';
        setTimeout(() => {
          desc.textContent = originalText;
          desc.style.color = '';
        }, 3000);
        // Open settings panel
        const revealBtn = document.getElementById('reveal-btn');
        const revealContent = document.getElementById('reveal-content');
        if (!revealContent.classList.contains('open')) {
          revealBtn.classList.add('open');
          revealContent.classList.add('open');
        }
      } else {
        await updateSetting('webSearch', true);
      }
    } else {
      await updateSetting('webSearch', false);
    }
  });

  // Settings toggles
  document.getElementById('toggle-active').addEventListener('change', (e) =>
    updateSetting('active', e.target.checked)
  );
  document.getElementById('toggle-debug').addEventListener('change', (e) =>
    updateSetting('debug', e.target.checked)
  );
  document.getElementById('toggle-expand').addEventListener('change', (e) =>
    updateSetting('autoExpand', e.target.checked)
  );

  // Provider change
  document.getElementById('provider-select').addEventListener('change', async (e) => {
    const val = e.target.value;
    await setStorage({ cesar_provider: val === 'auto' ? null : val });
    const keyData = await getStorage(['cesar_api_key']);
    if (keyData.cesar_api_key) updateApiStatus(keyData.cesar_api_key, val);
  });

  // API key save
  document.getElementById('api-key-save').addEventListener('click', saveApiKey);
  document.getElementById('api-key-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveApiKey();
  });

  // Auto-refresh parasite count
  setInterval(async () => {
    const statsData = await getStorage(['cesar_stats']);
    if (statsData.cesar_stats) {
      document.getElementById('posts-flagged').textContent = statsData.cesar_stats.postsFlagged;
    }
  }, 2000);
});
