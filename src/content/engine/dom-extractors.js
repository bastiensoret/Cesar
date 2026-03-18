/**
 * Extract the text content from a LinkedIn post element.
 */
export function extractPostText(postElement) {
  const selectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-text',
    '.feed-shared-inline-show-more-text',
    '[data-ad-preview="message"]',
    '.update-components-text',
    'span.break-words',
  ];

  let text = '';
  for (const sel of selectors) {
    const el = postElement.querySelector(sel);
    if (el) text += ' ' + el.innerText;
  }

  const seeMore = postElement.querySelector('.feed-shared-text__text-view');
  if (seeMore) text += ' ' + seeMore.innerText;

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
