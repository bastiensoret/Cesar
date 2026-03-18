import { CONFIG } from '../config.js';
import { GATING_CTA_PATTERNS } from '../patterns/gating-cta.js';

/**
 * Layer 2: Behavioral signals (no AI required).
 * Each signal adds points. Total capped at 25.
 */
export function analyzeLayer2(postElement, text, authorInfo) {
  const signals = [];
  const details = {};
  let totalPoints = 0;

  // Signal A: Comment bait pattern (max 15 pts)
  const commentResult = analyzeCommentBait(postElement);
  details.comments = commentResult;
  if (commentResult.points > 0) {
    totalPoints += commentResult.points;
    signals.push({
      id: 'l2_comments',
      label: commentResult.signal,
      axis: 'behavioral',
      score: commentResult.points,
    });
  }

  // Signal B: Public URL detection (max 10 pts)
  const urlResult = detectPublicURLs(text);
  details.publicURLs = urlResult;
  if (urlResult.points > 0) {
    totalPoints += urlResult.points;
    signals.push({
      id: 'l2_public_url',
      label: urlResult.signal,
      axis: 'behavioral',
      score: urlResult.points,
    });
  }

  // Signal C: Author-product mismatch (max 10 pts)
  const mismatchResult = checkAuthorMismatch(text, authorInfo);
  details.authorMismatch = mismatchResult;
  if (mismatchResult.points > 0) {
    totalPoints += mismatchResult.points;
    signals.push({
      id: 'l2_author_mismatch',
      label: mismatchResult.signal,
      axis: 'behavioral',
      score: mismatchResult.points,
    });
  }

  // Signal D: Post structure fingerprint (max 5 pts)
  const structResult = analyzePostStructure(text);
  details.structure = structResult;
  if (structResult.points > 0) {
    totalPoints += structResult.points;
    signals.push({
      id: 'l2_structure',
      label: structResult.signal,
      axis: 'behavioral',
      score: structResult.points,
    });
  }

  if (CONFIG.DEBUG && totalPoints > 0) {
    console.log(
      `%c[César] L2 Behavioral: +${totalPoints}pts | ${signals.map((s) => s.label).join(' | ')}`,
      'color: #AFA9EC'
    );
  }

  return { totalPoints, signals, details };
}

/**
 * Signal A: Comment bait — are most comments single emojis/keywords?
 */
function analyzeCommentBait(postElement) {
  const selectors = [
    '.comments-comment-item',
    '.comments-comment-item__main-content',
    '[data-finite-scroll-hotkey-item]',
  ];

  let commentTexts = [];
  for (const sel of selectors) {
    const els = postElement.querySelectorAll(sel);
    if (els.length > 0) {
      commentTexts = Array.from(els)
        .map((el) => {
          const textEl = el.querySelector(
            '.comments-comment-item__main-content span, .update-components-text span, span.break-words'
          );
          return (textEl || el).textContent?.trim() || '';
        })
        .filter((t) => t.length > 0 && t.length < 50);
      break;
    }
  }

  if (commentTexts.length === 0) {
    const spans = postElement.querySelectorAll('.comments-comment-item span.break-words');
    commentTexts = Array.from(spans)
      .map((el) => el.textContent?.trim() || '')
      .filter((t) => t.length > 0 && t.length < 50);
  }

  if (commentTexts.length < CONFIG.MIN_COMMENTS_FOR_BAIT) {
    return { points: 0, signal: null, baitRatio: 0 };
  }

  const baitPattern =
    /^(🔥|💡|🚀|💥|✅|⚡|💰|🙌|👇|❤️|💜|💪|🏆|⭐|🎯|🤖|🧠|interested|intéressé|me|moi|please|svp|yes|oui|prompt|link|lien|🙏|👏|💯|info|send|envoie)$/i;

  let baitCount = 0;
  const freq = {};
  for (const t of commentTexts) {
    const c = t.replace(/\s+/g, ' ').trim();
    if (baitPattern.test(c) || (c.length <= 3 && /[\p{Emoji}]/u.test(c))) baitCount++;
    freq[c.toLowerCase()] = (freq[c.toLowerCase()] || 0) + 1;
  }

  const baitRatio = baitCount / commentTexts.length;
  const clusterRatio = Math.max(...Object.values(freq)) / commentTexts.length;

  let points = 0;
  if (baitRatio >= 0.6 || clusterRatio >= 0.3) points = 15;
  else if (baitRatio >= 0.4) points = 10;
  else if (baitRatio >= 0.2) points = 5;

  return {
    points,
    signal:
      points > 0
        ? `${Math.round(baitRatio * 100)}% bait comments (${baitCount}/${commentTexts.length})`
        : null,
    baitRatio,
  };
}

/**
 * Signal B: Public URL detection — does the post reference publicly accessible resources?
 */
function detectPublicURLs(text) {
  const publicPatterns = [
    { regex: /github\.com\/[\w-]+\/[\w-]+/gi, label: 'GitHub repo', points: 10 },
    { regex: /npm\s+(install|i)\s+(-g\s+)?[@\w/-]+/gi, label: 'npm package', points: 10 },
    { regex: /pip\s+install\s+[\w-]+/gi, label: 'pip package', points: 10 },
    { regex: /docs\.\w+\.(com|org|io|dev)/gi, label: 'Official docs site', points: 8 },
    {
      regex:
        /\b(documentation officielle|official documentation|official docs|doc officielle)\b/gi,
      label: 'References official docs',
      points: 7,
    },
    {
      regex:
        /\b(open[- ]?source|repo public|public repo|libre d['']accès|freely available)\b/gi,
      label: 'Content is open/public',
      points: 6,
    },
    {
      regex:
        /\b(Chrome Web Store|App Store|Play Store|VS Code Marketplace|marketplace)\b/gi,
      label: 'Public marketplace',
      points: 5,
    },
  ];

  let maxPoints = 0;
  let bestSignal = null;

  for (const p of publicPatterns) {
    p.regex.lastIndex = 0;
    if (p.regex.test(text)) {
      if (p.points > maxPoints) {
        maxPoints = p.points;
        bestSignal = p.label;
      }
    }
  }

  return {
    points: Math.min(maxPoints, 10),
    signal: bestSignal ? `Public resource: ${bestSignal}` : null,
  };
}

/**
 * Signal C: Author-product mismatch — does the author work at the company they mention?
 */
function checkAuthorMismatch(text, authorInfo) {
  const subtitle = (authorInfo.subtitle || '').toLowerCase();
  const name = (authorInfo.name || '').toLowerCase();

  const companies = [
    { regex: /\bGoogle\b/i, keywords: ['google'] },
    { regex: /\bOpenAI\b/i, keywords: ['openai'] },
    { regex: /\bAnthropic\b/i, keywords: ['anthropic'] },
    { regex: /\bMicrosoft\b/i, keywords: ['microsoft'] },
    { regex: /\bMeta\b/i, keywords: ['meta', 'facebook'] },
    { regex: /\bNotion\b/i, keywords: ['notion'] },
    { regex: /\bFigma\b/i, keywords: ['figma'] },
    { regex: /\bStripe\b/i, keywords: ['stripe'] },
    { regex: /\bVercel\b/i, keywords: ['vercel'] },
    { regex: /\bSupabase\b/i, keywords: ['supabase'] },
  ];

  let mismatchFound = false;
  let companyMentioned = null;

  for (const c of companies) {
    c.regex.lastIndex = 0;
    if (c.regex.test(text)) {
      const worksAtCompany = c.keywords.some(
        (k) => subtitle.includes(k) || name.includes(k)
      );
      if (!worksAtCompany) {
        mismatchFound = true;
        companyMentioned = c.keywords[0];
        break;
      }
    }
  }

  return {
    points: mismatchFound ? 10 : 0,
    signal: mismatchFound ? `Author doesn't work at ${companyMentioned}` : null,
  };
}

/**
 * Signal D: Post structure fingerprint — does it follow the parasitic template?
 * Pattern: hype intro → feature list → CTA hidden at the end
 */
function analyzePostStructure(text) {
  let points = 0;
  const signals = [];

  // Bullet list of features (common in parasitic posts)
  const bulletCount = (text.match(/^[•·\-\*]\s/gm) || []).length;
  if (bulletCount >= 5) {
    points += 2;
    signals.push('Feature list');
  }

  // CTA at the very end (last 15% of text)
  const lastPortion = text.substring(Math.floor(text.length * CONFIG.CTA_END_PORTION));
  const ctaInEnd = GATING_CTA_PATTERNS.some((p) => {
    p.regex.lastIndex = 0;
    return p.regex.test(lastPortion);
  });
  if (ctaInEnd) {
    points += 2;
    signals.push('CTA hidden at end');
  }

  // Hype language density (multiple hype words)
  const hypeWords =
    text.match(
      /(dinguerie|game.?changer|révolution|pépite|bombe|incroyable|énorme|insane|crazy|mind.?blowing|breakthrough)/gi
    ) || [];
  if (hypeWords.length >= 2) {
    points += 1;
    signals.push('Hype language');
  }

  return {
    points: Math.min(points, 5),
    signal: signals.length > 0 ? `Structure: ${signals.join(' + ')}` : null,
  };
}
