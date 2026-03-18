/**
 * Escapes HTML entities to prevent XSS when inserting into innerHTML.
 */
export function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
