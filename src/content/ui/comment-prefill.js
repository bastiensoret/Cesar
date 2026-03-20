import { ICONS } from './icons.js';
import { escapeHTML } from '../../shared/sanitize.js';

/**
 * Pre-fill the LinkedIn comment box on a post.
 * Strategy: find/click the "Comment" button, wait for the input to appear,
 * then inject the text.
 */
export async function prefillComment(postElement, text, btn) {
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `<span class="sourceit-icon-spin">${ICONS.loader}</span> Opening...`;

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

    // Step 2: Poll for the comment editor to appear (up to 2s)
    const editorSelectors = [
      '.ql-editor[data-placeholder]',
      '.ql-editor',
      '[contenteditable="true"][role="textbox"]',
      '.comments-comment-box__form [contenteditable="true"]',
      '.editor-content [contenteditable="true"]',
    ];

    let editor = null;
    for (let attempt = 0; attempt < 10 && !editor; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      for (const sel of editorSelectors) {
        editor = postElement.querySelector(sel);
        if (editor) break;
      }
      // Broader search — scoped to the same post ancestor to avoid injecting into wrong post
      if (!editor) {
        const postAncestor = postElement.closest('.feed-shared-update-v2') || postElement;
        for (const sel of editorSelectors) {
          editor = postAncestor.querySelector(sel);
          if (editor) break;
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
      btn.classList.add('sourceit-btn-post-success');
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      btn.innerHTML = `${ICONS.copy} Copied — paste in comment`;
      btn.classList.add('sourceit-btn-post-fallback');
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
    btn.classList.remove('sourceit-btn-post-success', 'sourceit-btn-post-fallback');
  }, 5000);
}
