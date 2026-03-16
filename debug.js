/**
 * César — Debug Bridge (MAIN world)
 * This script runs in the page's main JavaScript context,
 * making __cesar accessible from the DevTools console.
 * Communicates with content.js via CustomEvents.
 */

window.__cesar = {
  enableDebug: () => {
    document.dispatchEvent(new CustomEvent('cesar-cmd', { detail: JSON.stringify({ cmd: 'debug' }) }));
  },
  test: (text) => {
    document.dispatchEvent(new CustomEvent('cesar-cmd', { detail: JSON.stringify({ cmd: 'test', text }) }));
  },
  rescan: () => {
    document.dispatchEvent(new CustomEvent('cesar-cmd', { detail: JSON.stringify({ cmd: 'rescan' }) }));
  },
  stats: () => {
    document.dispatchEvent(new CustomEvent('cesar-cmd', { detail: JSON.stringify({ cmd: 'stats' }) }));
  },
};

console.log('[César] Debug API ready — __cesar.enableDebug() / __cesar.test("...") / __cesar.rescan()');
