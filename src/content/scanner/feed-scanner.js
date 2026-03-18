import { CONFIG } from '../config.js';
import { DetectionEngine } from '../engine/detection-engine.js';
import { OverlayManager } from '../ui/overlay-manager.js';
import { tryAutoExpand, watchForExpansion } from './auto-expand.js';
import { getStorage } from '../../shared/storage.js';

export class FeedScanner {
  constructor() {
    this.engine = new DetectionEngine();
    this.overlayManager = new OverlayManager();
    this.isRunning = false;
  }

  getPostElements() {
    const selectors = [
      '.feed-shared-update-v2',
      '[data-urn^="urn:li:activity"]',
      '.occludable-update',
    ];
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) return Array.from(found);
    }
    return [];
  }

  scanFeed() {
    const posts = this.getPostElements();
    let processed = 0;

    for (const post of posts) {
      if (processed >= CONFIG.MAX_POSTS_PER_SCAN) break;
      if (post.hasAttribute(CONFIG.PROCESSED_ATTR)) continue;

      post.setAttribute(CONFIG.PROCESSED_ATTR, 'true');
      processed++;

      tryAutoExpand(post);

      // Watch for manual expansion too
      watchForExpansion(
        post,
        this.engine,
        this.overlayManager,
        this.verifyWithLLM.bind(this)
      );

      setTimeout(async () => {
        const text = this.engine.extractPostText(post);
        if (!text) return;

        if (CONFIG.DEBUG) {
          const preview =
            text.substring(0, 80).replace(/\n/g, ' ') + (text.length > 80 ? '...' : '');
          console.log(`[César] Text extracted (${text.length} chars): "${preview}"`);
        }

        const author = this.engine.extractAuthorInfo(post);
        const result = this.engine.fullAnalysis(post, text, author);
        this.engine.updateStats(result.flagged);

        if (CONFIG.DEBUG) {
          const style = result.flagged
            ? 'color: #ff4757; font-weight: bold'
            : result.matches.length > 0 || result.signals.length > 0
              ? 'color: #ffa502'
              : 'color: #747d8c';
          const layerTag = `L${result.layer}`;
          console.log(
            `%c[César] ${layerTag} Score: ${result.score}% (cap ${result.layers.cap || '50%'}) | ${result.reason}`,
            style
          );
          if (result.layers.l1) {
            console.log(
              `  L1 regex: TP=${result.layers.l1.rawTP} CTA=${result.layers.l1.rawCTA} → ${result.layers.l1.score}%`
            );
          }
          if (result.layers.l2 && result.layers.l2.points > 0) {
            console.log(
              `  L2 behavioral: +${result.layers.l2.points}pts → ${result.layers.l2.score}%`,
              result.layers.l2.details
            );
          }
        }

        // Check if user has an API key configured
        let hasApiKey = false;
        try {
          const data = await getStorage(['cesar_api_key']);
          hasApiKey = !!data.cesar_api_key;
        } catch (_e) {
          // Ignore
        }

        this.engine.updateStats(result.flagged || (hasApiKey && result.score >= CONFIG.LLM_SCORE_THRESHOLD_LOW));

        if (hasApiKey) {
          // WITH API KEY: lower threshold, LLM confirms ambiguous cases
          if (result.score >= CONFIG.LLM_SCORE_THRESHOLD_HIGH) {
            post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
            if (CONFIG.DEBUG)
              console.log(
                `%c[César] Score ${result.score}% + API key — badge shown, LLM enriching...`,
                'color: #ff4757'
              );
            this.overlayManager.injectOverlay(post, result, author, null);
            this.verifyWithLLM(post, text, author, result);
          } else if (result.score >= CONFIG.LLM_SCORE_THRESHOLD_LOW) {
            post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
            if (CONFIG.DEBUG)
              console.log(
                `%c[César] Score ${result.score}% + API key — LLM must confirm...`,
                'color: #ffa502'
              );
            this.overlayManager.injectPendingOverlay(post);
            this.verifyWithLLM(post, text, author, result);
          }
        } else {
          // WITHOUT API KEY: only show badge for higher confidence
          if (result.flagged && result.score >= CONFIG.DETECTION_THRESHOLD) {
            post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
            if (CONFIG.DEBUG)
              console.log(
                `%c[César] Score ${result.score}% (no API) — badge shown, capped at ${result.layers.cap}`,
                'color: #ff4757'
              );
            this.overlayManager.injectOverlay(post, result, author, null);
          }
        }
      }, CONFIG.SCAN_DELAY);
    }
    return processed;
  }

  /**
   * Send flagged post to background for LLM verification.
   */
  async verifyWithLLM(post, text, author, regexResult) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'cesar-verify', postText: text, authorName: author.name },
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(resp);
            }
          }
        );
      });

      // Remove pending overlay
      post.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());

      if (!response.success) {
        if (response.error === 'NO_API_KEY') {
          if (CONFIG.DEBUG)
            console.log(
              '%c[César] No API key — falling back to regex-only',
              'color: #ffa502'
            );
          this.overlayManager.injectOverlay(post, regexResult, author, null);
          return;
        }
        if (CONFIG.DEBUG)
          console.log(`%c[César] LLM error: ${response.error}`, 'color: #ff4757');
        this.overlayManager.injectOverlay(post, regexResult, author, null);
        return;
      }

      const llmResult = response.result;

      if (CONFIG.DEBUG) {
        const style = llmResult.parasitic
          ? 'color: #ff4757; font-weight: bold'
          : 'color: #2ed573; font-weight: bold';
        console.log(
          `%c[César] LLM verdict: ${llmResult.parasitic ? 'PARASITIC' : 'LEGITIMATE'} (${llmResult.confidence}%) — ${llmResult.reason || llmResult.reason_fr}`,
          style
        );
      }

      if (llmResult.parasitic) {
        this.overlayManager.injectOverlay(post, regexResult, author, llmResult);
      } else {
        post.removeAttribute(CONFIG.FLAGGED_ATTR);
        this.overlayManager.injectClearedOverlay(post, llmResult);
        if (CONFIG.DEBUG) {
          console.log(
            `%c[César] Post cleared by LLM: ${llmResult.reason || llmResult.reason_fr}`,
            'color: #2ed573'
          );
        }
      }
    } catch (err) {
      post.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());
      if (CONFIG.DEBUG)
        console.log(`%c[César] LLM fallback: ${err.message}`, 'color: #ffa502');
      this.overlayManager.injectOverlay(post, regexResult, author, null);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[César] v0.6 — Parasitic lead magnet detector started (LLM-powered)');

    this.scanFeed();
    this.intervalId = setInterval(() => this.scanFeed(), CONFIG.SCAN_INTERVAL);

    this.observer = new MutationObserver((mutations) => {
      const hasNew = mutations.some(
        (m) =>
          m.addedNodes.length > 0 &&
          Array.from(m.addedNodes).some(
            (n) => n.nodeType === 1 && n.querySelector?.('.feed-shared-update-v2')
          )
      );
      if (hasNew) this.scanFeed();
    });

    const container =
      document.querySelector('.scaffold-finite-scroll__content') ||
      document.querySelector('main') ||
      document.body;
    this.observer.observe(container, { childList: true, subtree: true });
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.observer) this.observer.disconnect();
    console.log('[César] Stopped.');
  }
}
