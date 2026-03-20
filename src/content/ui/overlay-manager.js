import { CONFIG } from '../config.js';
import { ICONS } from './icons.js';
import { prefillComment } from './comment-prefill.js';
import { escapeHTML } from '../../shared/sanitize.js';

const POST_CONTENT_SEL = '.feed-shared-update-v2__content';

const SEVERITY_LABELS = { high: 'HIGH', medium: 'MED', low: 'LOW' };
const SEVERITY_ARIA = { high: 'High severity', medium: 'Medium severity', low: 'Low severity' };

export class OverlayManager {
  /** Remove existing overlays and their event listeners */
  _removeExisting(postElement) {
    postElement.querySelectorAll('.sourceit-overlay').forEach((o) => {
      const ac = o._abortController;
      if (ac) ac.abort();
      o.remove();
    });
  }

  injectPendingOverlay(postElement) {
    this._removeExisting(postElement);

    const overlay = document.createElement('div');
    overlay.className = 'sourceit-overlay sourceit-severity-medium';
    overlay.setAttribute('aria-label', 'César — analyzing post');
    const ac = new AbortController();
    overlay._abortController = ac;

    overlay.innerHTML = `
      <div class="sourceit-badge">
        <div class="sourceit-badge-header">
          <span class="sourceit-icon">${ICONS.shield}</span>
          <span class="sourceit-title">César</span>
          <span class="sourceit-analyzing-text">Analyzing...</span>
          <span class="sourceit-score sourceit-pending-score">...</span>
          <button class="sourceit-dismiss" title="Close" aria-label="Close">${ICONS.x}</button>
        </div>
        <div class="sourceit-badge-body">
          <p class="sourceit-pending-explanation">AI verification in progress</p>
        </div>
      </div>
    `;

    overlay.querySelector('.sourceit-dismiss').addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        overlay.classList.add('sourceit-hidden');
      },
      { signal: ac.signal }
    );

    const target =
      postElement.querySelector(POST_CONTENT_SEL) || postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  /**
   * Show a "cleared" badge when LLM determined the post is legitimate.
   */
  injectClearedOverlay(postElement, llmResult) {
    this._removeExisting(postElement);

    const overlay = document.createElement('div');
    overlay.className = 'sourceit-overlay sourceit-cleared';
    overlay.setAttribute('aria-label', 'César — post cleared');
    const ac = new AbortController();
    overlay._abortController = ac;

    const reason = escapeHTML(llmResult.reason || 'Original content');

    overlay.innerHTML = `
      <div class="sourceit-badge sourceit-badge-cleared">
        <div class="sourceit-badge-header">
          <span class="sourceit-icon sourceit-icon-cleared">${ICONS.check}</span>
          <span class="sourceit-title">César</span>
          <span class="sourceit-llm-badge">AI</span>
          <button class="sourceit-dismiss" title="Close" aria-label="Close">${ICONS.x}</button>
        </div>
        <div class="sourceit-cleared-reason">${reason}</div>
      </div>
    `;

    overlay.querySelector('.sourceit-dismiss').addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        overlay.classList.add('sourceit-hidden');
      },
      { signal: ac.signal }
    );

    // Auto-fade after 8 seconds — disable interaction on faded overlay
    setTimeout(() => {
      if (overlay.isConnected) overlay.classList.add('sourceit-cleared-faded');
    }, CONFIG.CLEARED_FADE_DELAY);

    const target =
      postElement.querySelector(POST_CONTENT_SEL) || postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  injectOverlay(postElement, regexResult, authorInfo, llmResult) {
    this._removeExisting(postElement);

    const overlay = document.createElement('div');
    overlay.className = 'sourceit-overlay';
    const ac = new AbortController();
    overlay._abortController = ac;

    const isLLM = llmResult !== null && llmResult !== undefined;
    const confidence = isLLM ? llmResult.confidence : regexResult.score;
    const severity = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
    overlay.classList.add(`sourceit-severity-${severity}`);
    overlay.setAttribute('data-score', confidence);
    overlay.setAttribute('aria-label', `César — ${SEVERITY_ARIA[severity]} detection, ${confidence}%`);

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
          <button class="sourceit-comment-toggle" aria-expanded="false">
            <span>${ICONS.comment} Comment with source</span>
            <span class="sourceit-toggle-arrow">${ICONS.chevron}</span>
          </button>
          <div class="sourceit-comment-body">
            <div class="sourceit-comment-text-row">
              <p class="sourceit-comment-text">${suggestedComment}</p>
              <button class="sourceit-btn-copy" title="Copy" aria-label="Copy comment">${ICONS.copy}</button>
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
          <span class="sourceit-severity-label">${SEVERITY_LABELS[severity]}</span>
          <span class="sourceit-score">${confidence}%</span>
          ${isLLM ? '<span class="sourceit-llm-badge">AI</span>' : '<span class="sourceit-no-ai-badge">no AI</span>'}
          <button class="sourceit-dismiss" title="Close" aria-label="Close">${ICONS.x}</button>
        </div>
        ${rawReason ? `<div class="sourceit-reason-line">${rawReason}</div>` : ''}
        <div class="sourceit-badge-body">
          ${explanationHTML}
          <div class="sourceit-actions">
            <button class="sourceit-btn sourceit-btn-confirm" aria-label="Confirm detection">${ICONS.check} Confirm</button>
            <button class="sourceit-btn sourceit-btn-partial" aria-label="Mark as partial">${ICONS.minus} Partial</button>
            <button class="sourceit-btn sourceit-btn-false" aria-label="Mark as false positive">${ICONS.x} False positive</button>
          </div>
        </div>
      </div>
    `;

    // Event listeners — all wired through AbortController for cleanup
    const opts = { signal: ac.signal };

    overlay.querySelector('.sourceit-dismiss').addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        overlay.classList.add('sourceit-hidden');
      },
      opts
    );

    const disableOtherActions = (activeBtn) => {
      overlay.querySelectorAll('.sourceit-actions .sourceit-btn').forEach((b) => {
        if (b !== activeBtn) b.classList.add('sourceit-btn-acted');
        b.disabled = true;
      });
    };

    overlay.querySelector('.sourceit-btn-confirm').addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        btn.innerHTML = `${ICONS.check} Confirmed`;
        btn.classList.add('sourceit-btn-confirmed');
        disableOtherActions(btn);
      },
      opts
    );

    overlay.querySelector('.sourceit-btn-partial').addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        btn.innerHTML = `${ICONS.minus} Noted`;
        disableOtherActions(btn);
      },
      opts
    );

    overlay.querySelector('.sourceit-btn-false').addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        overlay.classList.add('sourceit-hidden');
        postElement.removeAttribute(CONFIG.FLAGGED_ATTR);
      },
      opts
    );

    // Comment section toggle (collapsible)
    const commentToggle = overlay.querySelector('.sourceit-comment-toggle');
    if (commentToggle) {
      commentToggle.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          const draft = overlay.querySelector('.sourceit-comment-draft');
          const isCollapsed = draft.classList.toggle('sourceit-collapsed');
          commentToggle.setAttribute('aria-expanded', String(!isCollapsed));
        },
        opts
      );
    }

    // Copy comment button
    const copyBtn = overlay.querySelector('.sourceit-btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          const commentText = overlay.querySelector('.sourceit-comment-text')?.textContent;
          if (commentText) {
            navigator.clipboard.writeText(commentText).then(() => {
              copyBtn.innerHTML = `${ICONS.check}`;
              copyBtn.classList.add('sourceit-btn-copy-success');
              setTimeout(() => {
                copyBtn.innerHTML = `${ICONS.copy}`;
                copyBtn.classList.remove('sourceit-btn-copy-success');
              }, 2000);
            }).catch(() => {
              copyBtn.innerHTML = `${ICONS.x}`;
              setTimeout(() => { copyBtn.innerHTML = `${ICONS.copy}`; }, 2000);
            });
          }
        },
        opts
      );
    }

    // "Post comment" — pre-fill LinkedIn comment box
    const postCommentBtn = overlay.querySelector('.sourceit-btn-post-comment');
    if (postCommentBtn) {
      postCommentBtn.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          const commentText = overlay.querySelector('.sourceit-comment-text')?.textContent;
          if (!commentText) return;
          prefillComment(postElement, commentText, postCommentBtn);
        },
        opts
      );
    }

    const target =
      postElement.querySelector(POST_CONTENT_SEL) || postElement;
    target.insertBefore(overlay, target.firstChild);
  }
}
