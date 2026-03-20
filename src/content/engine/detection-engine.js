import { CONFIG } from '../config.js';
import { analyzeLayer1, normalizeL1Score } from './layer1.js';
import { analyzeLayer2 } from './layer2.js';
import { extractPostText, extractAuthorInfo } from './dom-extractors.js';
import { setStorage } from '../../shared/storage.js';

export class DetectionEngine {
  constructor() {
    this.stats = {
      postsScanned: 0,
      postsFlagged: 0,
      sessionStart: Date.now(),
    };
  }

  /**
   * Full analysis: Layer 1 + Layer 2 combined.
   * Layer 3 (LLM) is handled by the FeedScanner.
   */
  fullAnalysis(postElement, text, authorInfo) {
    if (!text || text.length < CONFIG.MIN_TEXT_LENGTH) {
      return {
        score: 0,
        layer: 0,
        matches: [],
        signals: [],
        flagged: false,
        reason: '',
        layers: {},
      };
    }

    // LAYER 1: Regex pattern matching (max 50%)
    const l1 = analyzeLayer1(text);

    // Must have both axes to proceed
    if (!l1.hasTP || !l1.hasCTA) {
      const reason =
        l1.hasCTA && !l1.hasTP
          ? 'Gating on own content — not parasitic'
          : l1.hasTP && !l1.hasCTA
            ? 'Mentions third-party, no gating'
            : '';
      return {
        score: 0,
        layer: 1,
        matches: l1.matches,
        signals: [],
        flagged: false,
        reason,
        layers: { l1: { rawTP: l1.rawTP, rawCTA: l1.rawCTA, score: 0 } },
      };
    }

    // Normalize L1 to 0-50 range
    const l1Score = normalizeL1Score(l1.rawTP, l1.rawCTA, CONFIG.L1_MAX_SCORE);

    // LAYER 2: Behavioral signals (max +25, total max 75%)
    const l2 = analyzeLayer2(postElement, text, authorInfo);
    const l2Score = Math.min(l2.totalPoints, CONFIG.L2_MAX_POINTS);

    // Combined score: L1 + L2, capped at 75
    const combinedScore = Math.min(l1Score + l2Score, CONFIG.COMBINED_MAX);

    const flagged = combinedScore >= CONFIG.DETECTION_THRESHOLD;

    // Build reason from top signal
    const topSignal = [...l1.matches, ...l2.signals].sort((a, b) => b.score - a.score)[0];
    const reason = topSignal ? topSignal.label : '';

    return {
      score: combinedScore,
      layer: l2Score > 0 ? 2 : 1,
      matches: l1.matches,
      signals: l2.signals,
      flagged,
      reason,
      layers: {
        l1: { rawTP: l1.rawTP, rawCTA: l1.rawCTA, score: l1Score },
        l2: { points: l2.totalPoints, score: l2Score, details: l2.details },
        combined: combinedScore,
        cap: '75% (no AI)',
      },
    };
  }

  extractPostText(postElement) {
    return extractPostText(postElement);
  }

  extractAuthorInfo(postElement) {
    return extractAuthorInfo(postElement);
  }

  updateStats(flagged) {
    this.stats.postsScanned++;
    if (flagged) this.stats.postsFlagged++;
    this.persistStats();
  }

  persistStats() {
    try {
      setStorage({ cesar_stats: this.stats });
    } catch (_e) {
      // Ignore storage errors
    }
  }
}
