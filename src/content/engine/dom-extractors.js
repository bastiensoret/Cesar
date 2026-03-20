/**
 * Extract the text content from a LinkedIn post element.
 * Uses a priority list of selectors — stops at the first match to avoid duplication.
 */
export function extractPostText(postElement) {
  const selectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-text',
    '[data-ad-preview="message"]',
    '.update-components-text',
    'span.break-words',
  ];

  const seen = new Set();
  let text = '';

  for (const sel of selectors) {
    const el = postElement.querySelector(sel);
    if (el && !seen.has(el)) {
      // Skip if this element is a descendant of one we already extracted
      let isChild = false;
      for (const s of seen) {
        if (s.contains(el)) {
          isChild = true;
          break;
        }
      }
      if (!isChild) {
        seen.add(el);
        text += ' ' + el.innerText;
      }
    }
  }

  const seeMore = postElement.querySelector('.feed-shared-text__text-view');
  if (seeMore && !seen.has(seeMore)) {
    let isChild = false;
    for (const s of seen) {
      if (s.contains(seeMore)) {
        isChild = true;
        break;
      }
    }
    if (!isChild) text += ' ' + seeMore.innerText;
  }

  return text.trim();
}

/**
 * Extract author name and subtitle from a LinkedIn post element.
 */
export function extractAuthorInfo(postElement) {
  const authorEl = postElement.querySelector(
    '.update-components-actor__name span, .feed-shared-actor__name span'
  );
  const subtitleEl = postElement.querySelector(
    '.update-components-actor__description, .feed-shared-actor__description'
  );
  return {
    name: authorEl?.innerText?.trim() || 'Unknown',
    subtitle: subtitleEl?.innerText?.trim() || '',
  };
}
