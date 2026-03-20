/**
 * Escapes HTML entities to prevent XSS when inserting into innerHTML.
 * Uses string replacement so it works in both content scripts and service workers.
 */
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
