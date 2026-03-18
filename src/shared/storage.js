/**
 * Async wrappers for chrome.storage.local.
 */
export function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

export function setStorage(items) {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}
