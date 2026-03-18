import { vi } from 'vitest';

// Mock chrome.storage.local
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
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    lastError: null,
  },
};
