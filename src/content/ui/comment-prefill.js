import { ICONS } from './icons.js';
import { escapeHTML } from '../../shared/sanitize.js';

/**
 * Pre-fill the LinkedIn comment box on a post.
 * Strategy: find/click the "Comment" button, wait for the input to appear,
 * then inject the text.
 */
export async function prefillComment(postElement, text, btn) {
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `${ICONS.loader} Opening...`;

  try {
    // Step 1: Find and click LinkedIn's "Comment" button to open the comment box
    const commentBtn = postElement.querySelector(
      'button[aria-label*="omment"], button[aria-label*="ommenter"], .comment-button, button.social-actions-button[data-control-name="comment"]'
    );

    // Fallback: find by text content
    let linkedinCommentBtn = commentBtn;
    if (!linkedinCommentBtn) {
      const allBtns = postElement.querySelectorAll('button');
      for (const b of allBtns) {
        const t = b.textContent?.toLowerCase() || '';
        const label = b.getAttribute('aria-label')?.toLowerCase() || '';
        if (t.includes('comment') || t.includes('commenter') || label.includes('comment')) {
          linkedinCommentBtn = b;
          break;
        }
      }
    }

    if (linkedinCommentBtn) {
      linkedinCommentBtn.click();
    }

    // Step 2: Wait for the comment editor to appear
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 3: Find the comment input (contenteditable div)
    const editorSelectors = [
      '.ql-editor[data-placeholder]',
      '.ql-editor',
      '[contenteditable="true"][role="textbox"]',
      '.comments-comment-box__form [contenteditable="true"]',
      '.editor-content [contenteditable="true"]',
    ];

    let editor = null;
    for (const sel of editorSelectors) {
      editor = postElement.querySelector(sel);
      if (editor) break;
    }

    // Broader search if not found within post
    if (!editor) {
      for (const sel of editorSelectors) {
        const candidates = document.querySelectorAll(sel);
        for (const c of candidates) {
          if (c.offsetParent !== null) editor = c;
        }
      }
    }

    if (editor) {
      // Clear any placeholder and insert text (escaped for safety)
      editor.focus();
      editor.innerHTML = `<p>${escapeHTML(text)}</p>`;

      // Trigger input events so LinkedIn registers the change
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      btn.innerHTML = `${ICONS.check} Ready — review and post`;
      btn.style.color = '#2e7d32';
      btn.style.borderColor = '#c8e6c9';
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      btn.innerHTML = `${ICONS.copy} Copied — paste in comment`;
      btn.style.color = '#e65100';
      btn.style.borderColor = '#ffe0b2';
    }
  } catch (_err) {
    // Ultimate fallback
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = `${ICONS.copy} Copied to clipboard`;
    } catch (_e2) {
      btn.innerHTML = `${ICONS.x} Error — select text manually`;
    }
  }

  // Reset button after 5s
  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.style.color = '';
    btn.style.borderColor = '';
  }, 5000);
}
