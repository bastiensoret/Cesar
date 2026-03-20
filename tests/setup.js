import { vi } from 'vitest';

// Mock chrome.storage.local with lastError support
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, cb) => {
        if (cb) cb({});
        return Promise.resolve({});
      }),
      set: vi.fn((items, cb) => {
        if (cb) cb();
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    lastError: null,
  },
};
