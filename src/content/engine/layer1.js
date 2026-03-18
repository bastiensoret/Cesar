import { THIRD_PARTY_PATTERNS } from '../patterns/third-party.js';
import { GATING_CTA_PATTERNS } from '../patterns/gating-cta.js';

/**
 * Layer 1: Regex pattern matching.
 * Detects CTA + third-party mention.
 */
export function analyzeLayer1(text) {
  const matches = [];
  let rawTP = 0;
  let rawCTA = 0;

  for (const pattern of THIRD_PARTY_PATTERNS) {
    pattern.regex.lastIndex = 0;
    const found = text.match(pattern.regex);
    if (found) {
      rawTP += pattern.weight;
      matches.push({
        id: pattern.id,
        label: pattern.label,
        axis: 'third-party',
        score: pattern.weight,
        snippets: found.slice(0, 2),
      });
    }
  }

  for (const pattern of GATING_CTA_PATTERNS) {
    pattern.regex.lastIndex = 0;
    const found = text.match(pattern.regex);
    if (found) {
      rawCTA += pattern.weight;
      matches.push({
        id: pattern.id,
        label: pattern.label,
        axis: 'gating',
        score: pattern.weight,
        snippets: found.slice(0, 2),
      });
    }
  }

  return {
    rawTP,
    rawCTA,
    hasTP: rawTP > 0,
    hasCTA: rawCTA > 0,
    matches,
  };
}
