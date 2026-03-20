import { CONFIG } from '../config.js';
import { ICONS } from './icons.js';
import { prefillComment } from './comment-prefill.js';
import { escapeHTML } from '../../shared/sanitize.js';

export class OverlayManager {
  injectPendingOverlay(postElement) {
    postElement.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());

    const overlay = document.createElement('div');
    overlay.className = 'sourceit-overlay sourceit-severity-medium';

    overlay.innerHTML = `
      <div class="sourceit-badge">
        <div class="sourceit-badge-header">
          <span class="sourceit-icon">${ICONS.shield}</span>
          <span class="sourceit-title">César</span>
          <span style="font-size:11px;color:#a4b0be;flex:1;">Analyzing...</span>
          <span class="sourceit-score sourceit-pending-score">...</span>
          <button class="sourceit-dismiss" title="Close">${ICONS.x}</button>
        </div>
        <div class="sourceit-badge-body">
          <p class="sourceit-explanation" style="font-size:11px;color:#a4b0be;margin:0;">AI verification in progress</p>
        </div>
      </div>
    `;

    overlay.querySelector('.sourceit-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.add('sourceit-hidden');
    });

    const target =
      postElement.querySelector('.feed-shared-update-v2__content') || postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  /**
   * Show a "cleared" badge when LLM determined the post is legitimate.
   */
  injectClearedOverlay(postElement, llmResult) {
    postElement.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());

    const overlay = document.createElement('div');
    overlay.className = 'sourceit-overlay sourceit-cleared';

    const reason = escapeHTML(llmResult.reason || 'Original content');

    overlay.innerHTML = `
      <div class="sourceit-badge sourceit-badge-cleared">
        <div class="sourceit-badge-header" style="border-bottom:none;">
          <span class="sourceit-icon sourceit-icon-cleared">${ICONS.check}</span>
          <span class="sourceit-title">César</span>
          <span class="sourceit-llm-badge">AI</span>
          <button class="sourceit-dismiss" title="Close">${ICONS.x}</button>
        </div>
        <div style="display:block;font-size:12px;color:#c8d0da;padding:4px 12px 8px;line-height:1.4;word-wrap:break-word;">${reason}</div>
      </div>
    `;

    overlay.querySelector('.sourceit-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.add('sourceit-hidden');
    });

    // Auto-fade after 8 seconds
    setTimeout(() => {
      overlay.style.opacity = '0.4';
    }, CONFIG.CLEARED_FADE_DELAY);

    const target =
      postElement.querySelector('.feed-shared-update-v2__content') || postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  injectOverlay(postElement, regexResult, authorInfo, llmResult) {
    postElement.querySelectorAll('.sourceit-overlay').forEach((o) => o.remove());

    const overlay = document.createElement('div');
    overlay.className = 'sourceit-overlay';

    const isLLM = llmResult !== null && llmResult !== undefined;
    const confidence = isLLM ? llmResult.confidence : regexResult.score;
    const severity = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
    overlay.classList.add(`sourceit-severity-${severity}`);
    overlay.setAttribute('data-score', confidence);

    const tpMatch = regexResult.matches.find((m) => m.axis === 'third-party');
    const ctaMatch = regexResult.matches.find((m) => m.axis === 'gating');

    let explanationHTML = '';
    if (isLLM) {
      const gatedContent = escapeHTML(llmResult.gated_content);
      const originalSource = escapeHTML(llmResult.original_source);
      const suggestedComment = escapeHTML(llmResult.suggested_comment);

      explanationHTML = `
        <div class="sourceit-details">
          ${gatedContent ? `
          <div class="sourceit-detail-row">
            <span class="sourceit-detail-icon">${ICONS.lock}</span>
            <span class="sourceit-detail-label">Gated</span>
            <span class="sourceit-detail-value">${gatedContent}</span>
          </div>` : ''}
          ${originalSource && originalSource !== 'null' ? `
          <div class="sourceit-detail-row">
            <span class="sourceit-detail-icon">${ICONS.link}</span>
            <span class="sourceit-detail-label">Source</span>
            <span class="sourceit-detail-value">${originalSource}</span>
          </div>` : ''}
        </div>
        ${suggestedComment ? `
        <div class="sourceit-comment-draft sourceit-collapsed">
          <button class="sourceit-comment-toggle">
            <span>${ICONS.comment} Comment with source</span>
            <span class="sourceit-toggle-arrow">▼</span>
          </button>
          <div class="sourceit-comment-body">
            <div class="sourceit-comment-text-row">
              <p class="sourceit-comment-text">${suggestedComment}</p>
              <button class="sourceit-btn-copy" title="Copy">${ICONS.copy}</button>
            </div>
            <button class="sourceit-btn sourceit-btn-post-comment">${ICONS.comment} Post comment</button>
          </div>
        </div>` : ''}`;
    } else {
      const l2Signals = regexResult.signals || [];
      explanationHTML = `
        <div class="sourceit-details">
          ${tpMatch ? `<div class="sourceit-detail-row"><span class="sourceit-detail-icon">${ICONS.box}</span> <span class="sourceit-detail-label">Third-party</span> <span class="sourceit-detail-value">${escapeHTML(tpMatch.label)}</span></div>` : ''}
          ${ctaMatch ? `<div class="sourceit-detail-row"><span class="sourceit-detail-icon">${ICONS.gate}</span> <span class="sourceit-detail-label">Gating</span> <span class="sourceit-detail-value">${escapeHTML(ctaMatch.label)}</span></div>` : ''}
          ${l2Signals.map((s) => `<div class="sourceit-detail-row"><span class="sourceit-detail-icon">${ICONS.shield}</span> <span class="sourceit-detail-label">Signal</span> <span class="sourceit-detail-value">${escapeHTML(s.label)}</span></div>`).join('')}
        </div>
        <div class="sourceit-no-ai-notice">Cannot confirm if content is original without AI — add an API key in settings for verification</div>`;
    }

    const rawReason = isLLM
      ? escapeHTML(llmResult.reason || '')
      : 'Suspicious — needs AI to confirm';

    overlay.innerHTML = `
      <div class="sourceit-badge">
        <div class="sourceit-badge-header">
          <span class="sourceit-icon">${severity === 'high' ? ICONS.alert : ICONS.shield}</span>
          <span class="sourceit-title">César</span>
          <span class="sourceit-score">${confidence}%</span>
          ${isLLM ? '<span class="sourceit-llm-badge">AI</span>' : '<span class="sourceit-no-ai-badge">no AI</span>'}
          <button class="sourceit-dismiss" title="Close">${ICONS.x}</button>
        </div>
        ${rawReason ? `<div class="sourceit-reason-line">${rawReason}</div>` : ''}
        <div class="sourceit-badge-body">
          ${explanationHTML}
          <div class="sourceit-actions">
            <button class="sourceit-btn sourceit-btn-confirm">${ICONS.check} Confirm</button>
            <button class="sourceit-btn sourceit-btn-partial">${ICONS.minus} Partial</button>
            <button class="sourceit-btn sourceit-btn-false">${ICONS.x} False positive</button>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    overlay.querySelector('.sourceit-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.add('sourceit-hidden');
    });

    overlay.querySelector('.sourceit-btn-confirm').addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.innerHTML = `${ICONS.check} Confirmed`;
      btn.disabled = true;
      btn.classList.add('sourceit-btn-confirmed');
    });

    overlay.querySelector('.sourceit-btn-partial').addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.innerHTML = `${ICONS.minus} Noted`;
      btn.disabled = true;
      btn.style.opacity = '0.6';
    });

    overlay.querySelector('.sourceit-btn-false').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.add('sourceit-hidden');
      postElement.removeAttribute(CONFIG.FLAGGED_ATTR);
    });

    // Comment section toggle (collapsible)
    const commentToggle = overlay.querySelector('.sourceit-comment-toggle');
    if (commentToggle) {
      commentToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const draft = overlay.querySelector('.sourceit-comment-draft');
        draft.classList.toggle('sourceit-collapsed');
      });
    }

    // Copy comment button
    const copyBtn = overlay.querySelector('.sourceit-btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentText = overlay.querySelector('.sourceit-comment-text')?.textContent;
        if (commentText) {
          navigator.clipboard.writeText(commentText).then(() => {
            copyBtn.innerHTML = `${ICONS.check}`;
            copyBtn.style.color = '#2e7d32';
            setTimeout(() => {
              copyBtn.innerHTML = `${ICONS.copy}`;
              copyBtn.style.color = '';
            }, 2000);
          });
        }
      });
    }

    // "Post comment" — pre-fill LinkedIn comment box
    const postCommentBtn = overlay.querySelector('.sourceit-btn-post-comment');
    if (postCommentBtn) {
      postCommentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentText = overlay.querySelector('.sourceit-comment-text')?.textContent;
        if (!commentText) return;
        prefillComment(postElement, commentText, postCommentBtn);
      });
    }

    const target =
      postElement.querySelector('.feed-shared-update-v2__content') || postElement;
    target.insertBefore(overlay, target.firstChild);
  }
}
