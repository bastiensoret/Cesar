import { CONFIG } from '../config.js';
import { FeedScanner } from './feed-scanner.js';
import { analyzeLayer1 } from '../engine/layer1.js';

function waitForFeed(cb, maxAttempts = 20) {
  let attempts = 0;
  const check = () => {
    attempts++;
    const exists =
      document.querySelector('.feed-shared-update-v2') ||
      document.querySelector('[data-urn^="urn:li:activity"]') ||
      document.querySelector('.scaffold-finite-scroll__content');
    if (exists) cb();
    else if (attempts < maxAttempts) setTimeout(check, 1000);
    else cb();
  };
  check();
}

export function init() {
  waitForFeed(() => {
    const scanner = new FeedScanner();
    scanner.start();

    // Listen for commands from debug.js (MAIN world) via CustomEvents
    document.addEventListener('cesar-cmd', (e) => {
      try {
        const data = JSON.parse(e.detail);

        if (data.cmd === 'debug') {
          CONFIG.DEBUG = true;
          console.log('[César] Debug ON — Tiers = contenu tiers, CTA = gating');
        } else if (data.cmd === 'rescan') {
          document.querySelectorAll(`[${CONFIG.PROCESSED_ATTR}]`).forEach((el) => {
            el.removeAttribute(CONFIG.PROCESSED_ATTR);
            el.removeAttribute(CONFIG.FLAGGED_ATTR);
            el.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());
          });
          scanner.scanFeed();
          console.log('[César] Re-scan triggered');
        } else if (data.cmd === 'test') {
          const l1 = analyzeLayer1(data.text);
          const l1Score = Math.min(
            Math.round(((Math.min(l1.rawTP, 100) + Math.min(l1.rawCTA, 100)) / 2) * 0.5),
            CONFIG.L1_MAX_SCORE
          );
          console.table(
            l1.matches.map((m) => ({ axis: m.axis, signal: m.label, score: m.score }))
          );
          console.log(
            `→ L1 Score: ${l1Score}% (max 50%) | TP: ${l1.rawTP} | CTA: ${l1.rawCTA} | Both axes: ${l1.hasTP && l1.hasCTA}`
          );
          console.log(
            '  Note: L2 (behavioral) requires DOM, L3 (LLM) requires API. Use __cesar.rescan() to test full pipeline.'
          );
        } else if (data.cmd === 'stats') {
          console.log('[César] Stats:', scanner.engine.stats);
        }
      } catch (err) {
        console.error('[César] Command error:', err);
      }
    });
  });
}
