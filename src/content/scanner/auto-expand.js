import { CONFIG } from '../config.js';

/**
 * Try to auto-expand a truncated LinkedIn post ("voir plus" / "see more").
 */
export function tryAutoExpand(postElement) {
  // Strategy 1: Known CSS selectors
  const selectorBtn = postElement.querySelector(
    'button.feed-shared-inline-show-more-text, button[aria-label*="more"], button[aria-label*="plus"], .feed-shared-text__see-more'
  );
  if (selectorBtn) {
    selectorBtn.click();
    return true;
  }

  // Strategy 2: Find any button containing "voir plus" or "see more" text
  const allButtons = postElement.querySelectorAll('button');
  for (const btn of allButtons) {
    const text = btn.textContent?.toLowerCase().trim() || '';
    if (
      text.includes('voir plus') ||
      text.includes('see more') ||
      text.includes('…plus') ||
      text === '…voir plus'
    ) {
      btn.click();
      if (CONFIG.DEBUG) console.log('[César] Auto-expanded post (text match)');
      return true;
    }
  }

  // Strategy 3: Find any clickable span/element with "voir plus" text
  const allSpans = postElement.querySelectorAll('span, a');
  for (const el of allSpans) {
    const text = el.textContent?.toLowerCase().trim() || '';
    if (
      (text === 'voir plus' ||
        text === '…voir plus' ||
        text === 'see more' ||
        text === '...see more') &&
      el.offsetParent !== null
    ) {
      el.click();
      if (CONFIG.DEBUG) console.log('[César] Auto-expanded post (span match)');
      return true;
    }
  }

  return false;
}

/**
 * Watch for manual "voir plus" clicks — re-scan when post text changes.
 */
export function watchForExpansion(post, engine, overlayManager, verifyWithLLM) {
  const textContainer = post.querySelector(
    '.feed-shared-text, .update-components-text, span.break-words'
  );
  if (!textContainer) return;

  const observer = new MutationObserver(() => {
    // Text changed (user clicked "voir plus"), re-analyze
    observer.disconnect();
    post.removeAttribute(CONFIG.PROCESSED_ATTR);
    post.removeAttribute(CONFIG.FLAGGED_ATTR);
    post.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());

    setTimeout(() => {
      const text = engine.extractPostText(post);
      if (!text) return;
      const author = engine.extractAuthorInfo(post);
      const result = engine.fullAnalysis(post, text, author);

      if (CONFIG.DEBUG) {
        console.log(
          `%c[César] RE-SCAN after expand — L${result.layer} Score: ${result.score}% | ${result.reason}`,
          result.flagged ? 'color: #ff4757; font-weight: bold' : 'color: #ffa502'
        );
      }

      if (result.flagged) {
        post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
        post.setAttribute(CONFIG.PROCESSED_ATTR, 'true');
        overlayManager.injectPendingOverlay(post);
        verifyWithLLM(post, text, author, result);
      }
    }, CONFIG.EXPAND_RESCAN_DELAY);
  });

  observer.observe(textContainer, { childList: true, subtree: true, characterData: true });
}
