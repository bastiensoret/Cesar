/**
 * César v0.7 — Popup Script
 * Minimal UI: parasite count, web search toggle, reveal menu for settings.
 */

import { getStorage, setStorage } from '../shared/storage.js';

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

  // Fetch provider names from background to avoid duplication
  chrome.runtime.sendMessage({ type: 'cesar-get-providers' }, (resp) => {
    if (chrome.runtime.lastError || !resp) return;
    const match = resp.providers.find((p) => p.id === provider);
    status.classList.remove('api-status-success', 'api-status-error', 'api-status-warning');
    if (match) {
      status.textContent = `● ${match.name} — ${match.model}`;
      status.classList.add('api-status-success');
    } else {
      status.textContent = 'Unknown provider';
      status.classList.add('api-status-error');
    }
  });
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
    const statusEl = document.getElementById('api-status');
    statusEl.textContent = 'Unknown key — select a provider manually';
    statusEl.classList.remove('api-status-success');
    statusEl.classList.add('api-status-error');
    return;
  }

  await setStorage({ cesar_api_key: key, cesar_provider: effective });
  input.value = key.substring(0, 10) + '...' + key.substring(key.length - 4);
  document.getElementById('provider-select').value = effective;
  updateApiStatus(key, effective);

  // Brief save confirmation on the button
  const saveBtn = document.getElementById('api-key-save');
  const origText = saveBtn.textContent;
  saveBtn.textContent = 'Saved';
  saveBtn.classList.add('api-key-btn-saved');
  setTimeout(() => {
    saveBtn.textContent = origText;
    saveBtn.classList.remove('api-key-btn-saved');
  }, 1500);
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

  document.getElementById('posts-flagged').textContent = Number(stats.postsFlagged) || 0;

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
    const isOpen = content.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  // Web search toggle — requires API key
  let webSearchErrorTimer = null;
  document.getElementById('toggle-websearch').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const keyData = await getStorage(['cesar_api_key']);
      if (!keyData.cesar_api_key) {
        e.target.checked = false;
        const desc = document.querySelector('.web-search-desc');
        const originalText = desc.textContent;
        if (webSearchErrorTimer) clearTimeout(webSearchErrorTimer);
        desc.textContent = 'An API key is required for web search. Add one in Settings below.';
        desc.classList.add('web-search-desc-error');
        webSearchErrorTimer = setTimeout(() => {
          desc.textContent = originalText;
          desc.classList.remove('web-search-desc-error');
          webSearchErrorTimer = null;
        }, 3000);
        // Open settings panel
        const revealBtn = document.getElementById('reveal-btn');
        const revealContent = document.getElementById('reveal-content');
        if (!revealContent.classList.contains('open')) {
          revealBtn.classList.add('open');
          revealBtn.setAttribute('aria-expanded', 'true');
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

  // Update parasite count reactively via storage change events
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.cesar_stats) {
      const newStats = changes.cesar_stats.newValue;
      if (newStats) {
        document.getElementById('posts-flagged').textContent = Number(newStats.postsFlagged) || 0;
      }
    }
  });
});
