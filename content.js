/**
 * César v0.5 — Give back to César
 * 
 * Rend à César ce qui appartient à César.
 * Détecte les posts qui gatent l'accès à du contenu créé par quelqu'un d'autre.
 * 
 * Logique à 2 axes :
 *   Axe 1 — "Contenu tiers" : le post référence un outil, une entreprise, un créateur
 *   Axe 2 — "Gating CTA" : le post gate l'accès derrière un commentaire, DM, etc.
 * 
 *   Flag UNIQUEMENT si les 2 axes matchent.
 *   Un lead magnet sur son propre contenu = pas notre problème.
 */

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  DETECTION_THRESHOLD: 40,
  SCAN_INTERVAL: 3000,
  MAX_POSTS_PER_SCAN: 20,
  PROCESSED_ATTR: "data-sourceit-processed",
  FLAGGED_ATTR: "data-sourceit-flagged",
  DEBUG: true,
};

// ============================================================
// AXE 1 — Contenu tiers
// ============================================================

const THIRD_PARTY_PATTERNS = [
  {
    id: "tp_launched_fr",
    regex: /([\w\s]{2,30})\s+(vient de|viennent de)\s+(sortir|lancer|publier|créer|dévoiler|annoncer|release)/gi,
    label: "Third-party launch mentioned",
    weight: 35,
  },
  {
    id: "tp_has_created_fr",
    regex: /([\w\s]{2,20})\s+(a créé|a sorti|a lancé|a développé|a publié|a release|a déployé|a open.?sourcé)/gi,
    label: "Third-party creation mentioned",
    weight: 35,
  },
  {
    id: "tp_project_of_fr",
    regex: /(le projet|l['']outil|la plateforme|le plugin|l['']extension|le repo|le framework)\s+(de|d['']|by)\s+/gi,
    label: "References someone else's project",
    weight: 30,
  },
  {
    id: "tp_official_fr",
    regex: /(doc(umentation)?\s+officielle|site officiel|page officielle|repo officiel|github officiel)/gi,
    label: "References official documentation",
    weight: 25,
  },
  {
    id: "tp_launched_en",
    regex: /([\w\s]{2,30})\s+(just launched|just released|just dropped|just announced|just shipped|just open.?sourced)/gi,
    label: "References a third-party launch",
    weight: 35,
  },
  {
    id: "tp_has_created_en",
    regex: /([\w\s]{2,20})\s+(created|built|released|launched|published|shipped|open.?sourced)\s+(a |an |the |this )/gi,
    label: "References someone else's creation",
    weight: 35,
  },
  {
    id: "tp_known_tool",
    regex: /\b(Google|OpenAI|Anthropic|Microsoft|Meta|Apple|Amazon|AWS|Notion|Figma|Canva|Zapier|Make\.com|n8n|Airtable|Stripe|Vercel|Supabase|HubSpot|Salesforce)\b.{0,40}(vient de|a sorti|a lancé|a créé|just|released|launched|new|nouveau|nouvelle)/gi,
    label: "Major company launch mentioned",
    weight: 30,
  },
  {
    id: "tp_known_product",
    regex: /\b(Claude Code|ChatGPT|GPT-?[45o]|Gemini|Copilot|Midjourney|DALL[·\-]?E|Sora|Cursor|Windsurf|Bolt|v0|Lovable|Replit Agent|Devin|Google Workspace CLI|MCP)\b/gi,
    label: "Known third-party product mentioned",
    weight: 20,
  },
  {
    id: "tp_repackage_fr",
    regex: /(je (te |vous )?(résume|récapitule|explique|décortique|décompose|vulgarise|traduis|simplifie))\s.{0,30}(l['']outil|le projet|la mise à jour|la feature|la nouvelle|le nouveau)/gi,
    label: "Summarizes third-party content",
    weight: 25,
  },
  {
    id: "tp_repackage_en",
    regex: /(I (broke down|summarized|simplified|explained|unpacked|decoded))\s.{0,30}(the tool|the project|the update|the feature|the new|their)/gi,
    label: "Summarizes third-party content",
    weight: 25,
  },
  {
    id: "tp_hype_fr",
    regex: /(dinguerie|game.?changer|révolution|pépite|bombe|ouf|fou|incroyable|énorme|monstrueux).{0,30}(outil|tool|projet|produit|update|feature|lancement|release)/gi,
    label: "Hype around third-party product",
    weight: 15,
  },
];

// ============================================================
// AXE 2 — Gating CTA
// ============================================================

const GATING_CTA_PATTERNS = [
  // ---- FR: "Commente + emoji/mot" (strict form) ----
  {
    id: "cta_comment_emoji",
    regex: /commente[zrs]?\s*[\"«»\u201C\u201D']?\s*[🔥💡🚀💥✅⚡️💰🙌👇❤️💜🖤💪🏆⭐️🎯🤖🧠🔄]+/gi,
    label: "Asks to comment an emoji",
    weight: 35,
  },
  {
    id: "cta_comment_word",
    regex: /commente[zrs]?\s*[\"«»\u201C\u201D']\s*\w{2,20}\s*[\"«»\u201C\u201D']/gi,
    label: "Asks to comment a keyword",
    weight: 35,
  },

  // ---- FR: "Laisser un commentaire" + envoi (the Pierre E. pattern) ----
  {
    id: "cta_laisser_commentaire",
    regex: /laisse[rzs]?\s+(un |ton |votre )?commentaires?/gi,
    label: "Asks to leave a comment",
    weight: 30,
  },

  // ---- FR: "je t'envoie / je vous envoie / t'envoyer" + anything ----
  {
    id: "cta_send_promise_fr",
    regex: /(je\s+(t['']|vous\s?)(envoie|partage|donne|file|transmets|enverrai)|pour que je puisse\s+t['']envoyer|je t['']envoie|et je t['']envoie)/gi,
    label: "Promises to send a resource",
    weight: 30,
  },

  // ---- FR: "envoyer les ressources / le lien par MP/DM" ----
  {
    id: "cta_send_by_mp",
    regex: /(envoyer|envoie|partager|transmettre).{0,30}(par |en |via )?(MP|DM|message priv|inbox|pv)/gi,
    label: "Sends via DM",
    weight: 30,
  },

  // ---- FR: DM/MP standalone request ----
  {
    id: "cta_dm_fr",
    regex: /(envoie|envoi|écris|contacte).{0,10}(moi|nous)?.{0,10}(en )?(DM|MP|message priv[ée]|inbox|pv)\b/gi,
    label: "Redirects to DMs",
    weight: 25,
  },

  // ---- FR: "1ère relation" / "connexion" gating ----
  {
    id: "cta_connection_gate",
    regex: /(1[eè]re relation|premi[eè]re relation|être connect[ée]|ajoute[zr]?.moi|connecte[zr]?.toi)/gi,
    label: "Requires connection first",
    weight: 20,
  },

  // ---- FR: Like/follow/repost pour recevoir ----
  {
    id: "cta_follow_like_repost",
    regex: /(like|aime|partage[zr]?|repost|repartage|follow|suis|abonne).{0,25}(pour recevoir|pour que je|et je t|pour avoir|pour obtenir)/gi,
    label: "Like/follow/repost to receive",
    weight: 30,
  },

  // ---- FR: "ceux qui repostent" / "ceux qui commentent" ----
  {
    id: "cta_ceux_qui",
    regex: /(ceux|celles) qui (repostent|commentent|partagent|likent|s['']abonnent)/gi,
    label: "Rewards those who engage",
    weight: 25,
  },

  // ---- FR: "Lien en commentaire" ----
  {
    id: "cta_link_in_comments",
    regex: /(lien|link)\s.{0,15}(en |dans (les? )?|in (the )?)(commentaire|comment|bio|profil)/gi,
    label: "Link in comments",
    weight: 20,
  },

  // ---- FR: Combo "commentaire + envoie" dans la même phrase ----
  {
    id: "cta_comment_then_send",
    regex: /commentaire.{0,30}(je t|et je|pour que).{0,20}(envoie|partage|donne|transmets)/gi,
    label: "Comment and I'll send",
    weight: 35,
  },

  // ---- EN: Comment + emoji ----
  {
    id: "cta_comment_emoji_en",
    regex: /comment\s*[\"«»\u201C\u201D']?\s*[🔥💡🚀💥✅⚡️💰🙌👇❤️💜🖤💪🏆⭐️🎯🤖🧠🔄]+/gi,
    label: "Asks to comment an emoji",
    weight: 35,
  },
  {
    id: "cta_comment_word_en",
    regex: /comment\s*[\"«»\u201C\u201D']\s*\w{2,20}\s*[\"«»\u201C\u201D']\s*(below|and|to|for)/gi,
    label: "Asks to comment a keyword",
    weight: 35,
  },

  // ---- EN: Send promise ----
  {
    id: "cta_send_promise_en",
    regex: /(I['']ll\s+(send|share|give|DM)|send you|DM me|I['']ll DM).{0,25}(the link|the resource|the guide|the template|the doc|the file|the prompt|the repo|it to you|everyone)/gi,
    label: "Promises to send a resource",
    weight: 30,
  },

  // ---- EN: "Leave a comment" / "drop a comment" ----
  {
    id: "cta_leave_comment_en",
    regex: /(leave|drop)\s+a\s+comment/gi,
    label: "Asks to leave a comment",
    weight: 30,
  },
];

// ============================================================
// DETECTION ENGINE — Layered confidence scoring
// 
// Layer 1 (regex):      max 50%  — "suspicious"
// Layer 2 (behavioral): max 75%  — "likely parasitic"
// Layer 3 (LLM):        max 99%  — "confirmed parasitic"
// ============================================================

class DetectionEngine {
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
    if (!text || text.length < 50) {
      return { score: 0, layer: 0, matches: [], signals: [], flagged: false, reason: "", layers: {} };
    }

    // ---- LAYER 1: Regex pattern matching (max 50%) ----
    const l1 = this.analyzeLayer1(text);

    // Must have both axes to proceed
    if (!l1.hasTP || !l1.hasCTA) {
      const reason = l1.hasCTA && !l1.hasTP
        ? "Gating on own content — not parasitic"
        : l1.hasTP && !l1.hasCTA
          ? "Mentions third-party, no gating"
          : "";
      return {
        score: 0, layer: 1, matches: l1.matches, signals: [],
        flagged: false, reason,
        layers: { l1: { rawTP: l1.rawTP, rawCTA: l1.rawCTA, score: 0 } },
      };
    }

    // Normalize L1 to 0-50 range
    const l1Raw = Math.round((Math.min(l1.rawTP, 100) + Math.min(l1.rawCTA, 100)) / 2);
    const l1Score = Math.min(Math.round(l1Raw * 0.5), 50);

    // ---- LAYER 2: Behavioral signals (max +25, total max 75%) ----
    const l2 = this.analyzeLayer2(postElement, text, authorInfo);
    const l2Score = Math.min(l2.totalPoints, 25);
    
    // Combined score: L1 + L2, capped at 75
    const combinedScore = Math.min(l1Score + l2Score, 75);

    const flagged = combinedScore >= CONFIG.DETECTION_THRESHOLD;
    
    // Build reason from top signal
    const topSignal = [...l1.matches, ...l2.signals]
      .sort((a, b) => b.score - a.score)[0];
    const reason = topSignal ? topSignal.label : "";

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
        cap: "75% (no AI)",
      },
    };
  }

  /**
   * Layer 1: Regex pattern matching.
   * Detects CTA + third-party mention.
   */
  analyzeLayer1(text) {
    const matches = [];
    let rawTP = 0;
    let rawCTA = 0;

    for (const pattern of THIRD_PARTY_PATTERNS) {
      pattern.regex.lastIndex = 0;
      const found = text.match(pattern.regex);
      if (found) {
        rawTP += pattern.weight;
        matches.push({
          id: pattern.id, label: pattern.label, axis: "third-party",
          score: pattern.weight, snippets: found.slice(0, 2),
        });
      }
    }

    for (const pattern of GATING_CTA_PATTERNS) {
      pattern.regex.lastIndex = 0;
      const found = text.match(pattern.regex);
      if (found) {
        rawCTA += pattern.weight;
        matches.push({
          id: pattern.id, label: pattern.label, axis: "gating",
          score: pattern.weight, snippets: found.slice(0, 2),
        });
      }
    }

    return {
      rawTP, rawCTA,
      hasTP: rawTP > 0,
      hasCTA: rawCTA > 0,
      matches,
    };
  }

  /**
   * Layer 2: Behavioral signals (no AI required).
   * Each signal adds points. Total capped at 25.
   */
  analyzeLayer2(postElement, text, authorInfo) {
    const signals = [];
    const details = {};
    let totalPoints = 0;

    // ---- Signal A: Comment bait pattern (max 15 pts) ----
    const commentResult = this._analyzeCommentBait(postElement);
    details.comments = commentResult;
    if (commentResult.points > 0) {
      totalPoints += commentResult.points;
      signals.push({
        id: "l2_comments", label: commentResult.signal,
        axis: "behavioral", score: commentResult.points,
      });
    }

    // ---- Signal B: Public URL detection (max 10 pts) ----
    const urlResult = this._detectPublicURLs(text);
    details.publicURLs = urlResult;
    if (urlResult.points > 0) {
      totalPoints += urlResult.points;
      signals.push({
        id: "l2_public_url", label: urlResult.signal,
        axis: "behavioral", score: urlResult.points,
      });
    }

    // ---- Signal C: Author-product mismatch (max 10 pts) ----
    const mismatchResult = this._checkAuthorMismatch(text, authorInfo);
    details.authorMismatch = mismatchResult;
    if (mismatchResult.points > 0) {
      totalPoints += mismatchResult.points;
      signals.push({
        id: "l2_author_mismatch", label: mismatchResult.signal,
        axis: "behavioral", score: mismatchResult.points,
      });
    }

    // ---- Signal D: Post structure fingerprint (max 5 pts) ----
    const structResult = this._analyzePostStructure(text);
    details.structure = structResult;
    if (structResult.points > 0) {
      totalPoints += structResult.points;
      signals.push({
        id: "l2_structure", label: structResult.signal,
        axis: "behavioral", score: structResult.points,
      });
    }

    if (CONFIG.DEBUG && totalPoints > 0) {
      console.log(`%c[César] L2 Behavioral: +${totalPoints}pts | ${signals.map(s => s.label).join(' | ')}`, "color: #AFA9EC");
    }

    return { totalPoints, signals, details };
  }

  /**
   * Signal A: Comment bait — are most comments single emojis/keywords?
   */
  _analyzeCommentBait(postElement) {
    const selectors = [
      '.comments-comment-item',
      '.comments-comment-item__main-content',
      '[data-finite-scroll-hotkey-item]',
    ];

    let commentTexts = [];
    for (const sel of selectors) {
      const els = postElement.querySelectorAll(sel);
      if (els.length > 0) {
        commentTexts = Array.from(els).map(el => {
          const textEl = el.querySelector('.comments-comment-item__main-content span, .update-components-text span, span.break-words');
          return (textEl || el).textContent?.trim() || '';
        }).filter(t => t.length > 0 && t.length < 50);
        break;
      }
    }

    if (commentTexts.length === 0) {
      const spans = postElement.querySelectorAll('.comments-comment-item span.break-words');
      commentTexts = Array.from(spans).map(el => el.textContent?.trim() || '').filter(t => t.length > 0 && t.length < 50);
    }

    if (commentTexts.length < 5) {
      return { points: 0, signal: null, baitRatio: 0 };
    }

    const baitPattern = /^(🔥|💡|🚀|💥|✅|⚡|💰|🙌|👇|❤️|💜|💪|🏆|⭐|🎯|🤖|🧠|interested|intéressé|me|moi|please|svp|yes|oui|prompt|link|lien|🙏|👏|💯|info|send|envoie)$/i;

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
      signal: points > 0 ? `${Math.round(baitRatio * 100)}% bait comments (${baitCount}/${commentTexts.length})` : null,
      baitRatio,
    };
  }

  /**
   * Signal B: Public URL detection — does the post reference publicly accessible resources?
   */
  _detectPublicURLs(text) {
    const publicPatterns = [
      { regex: /github\.com\/[\w-]+\/[\w-]+/gi, label: "GitHub repo", points: 10 },
      { regex: /npm\s+(install|i)\s+(-g\s+)?[@\w/-]+/gi, label: "npm package", points: 10 },
      { regex: /pip\s+install\s+[\w-]+/gi, label: "pip package", points: 10 },
      { regex: /docs\.\w+\.(com|org|io|dev)/gi, label: "Official docs site", points: 8 },
      { regex: /\b(documentation officielle|official documentation|official docs|doc officielle)\b/gi, label: "References official docs", points: 7 },
      { regex: /\b(open[- ]?source|repo public|public repo|libre d['']accès|freely available)\b/gi, label: "Content is open/public", points: 6 },
      { regex: /\b(Chrome Web Store|App Store|Play Store|VS Code Marketplace|marketplace)\b/gi, label: "Public marketplace", points: 5 },
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
  _checkAuthorMismatch(text, authorInfo) {
    const subtitle = (authorInfo.subtitle || "").toLowerCase();
    const name = (authorInfo.name || "").toLowerCase();

    // Known companies/products mentioned in the post
    const companies = [
      { regex: /\bGoogle\b/i, keywords: ["google"] },
      { regex: /\bOpenAI\b/i, keywords: ["openai"] },
      { regex: /\bAnthropic\b/i, keywords: ["anthropic"] },
      { regex: /\bMicrosoft\b/i, keywords: ["microsoft"] },
      { regex: /\bMeta\b/i, keywords: ["meta", "facebook"] },
      { regex: /\bNotion\b/i, keywords: ["notion"] },
      { regex: /\bFigma\b/i, keywords: ["figma"] },
      { regex: /\bStripe\b/i, keywords: ["stripe"] },
      { regex: /\bVercel\b/i, keywords: ["vercel"] },
      { regex: /\bSupabase\b/i, keywords: ["supabase"] },
    ];

    let mismatchFound = false;
    let companyMentioned = null;

    for (const c of companies) {
      c.regex.lastIndex = 0;
      if (c.regex.test(text)) {
        const worksAtCompany = c.keywords.some(k => subtitle.includes(k) || name.includes(k));
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
  _analyzePostStructure(text) {
    let points = 0;
    const signals = [];

    // Bullet list of features (common in parasitic posts)
    const bulletCount = (text.match(/^[•·\-\*]\s/gm) || []).length;
    if (bulletCount >= 5) {
      points += 2;
      signals.push("Feature list");
    }

    // CTA at the very end (last 15% of text)
    const lastPortion = text.substring(Math.floor(text.length * 0.85));
    const ctaInEnd = GATING_CTA_PATTERNS.some(p => {
      p.regex.lastIndex = 0;
      return p.regex.test(lastPortion);
    });
    if (ctaInEnd) {
      points += 2;
      signals.push("CTA hidden at end");
    }

    // Hype language density (multiple hype words)
    const hypeWords = text.match(/(dinguerie|game.?changer|révolution|pépite|bombe|incroyable|énorme|insane|crazy|mind.?blowing|breakthrough)/gi) || [];
    if (hypeWords.length >= 2) {
      points += 1;
      signals.push("Hype language");
    }

    return {
      points: Math.min(points, 5),
      signal: signals.length > 0 ? `Structure: ${signals.join(' + ')}` : null,
    };
  }

  extractPostText(postElement) {
    const selectors = [
      ".feed-shared-update-v2__description",
      ".feed-shared-text",
      ".feed-shared-inline-show-more-text",
      '[data-ad-preview="message"]',
      ".update-components-text",
      "span.break-words",
    ];

    let text = "";
    for (const sel of selectors) {
      const el = postElement.querySelector(sel);
      if (el) text += " " + el.innerText;
    }

    const seeMore = postElement.querySelector(".feed-shared-text__text-view");
    if (seeMore) text += " " + seeMore.innerText;

    return text.trim();
  }

  extractAuthorInfo(postElement) {
    const authorEl = postElement.querySelector(
      ".update-components-actor__name span, .feed-shared-actor__name span"
    );
    const subtitleEl = postElement.querySelector(
      ".update-components-actor__description, .feed-shared-actor__description"
    );
    return {
      name: authorEl?.innerText?.trim() || "Unknown",
      subtitle: subtitleEl?.innerText?.trim() || "",
    };
  }

  updateStats(flagged) {
    this.stats.postsScanned++;
    if (flagged) this.stats.postsFlagged++;
    this.persistStats();
  }

  persistStats() {
    try { chrome.storage.local.set({ cesar_stats: this.stats }); } catch (e) {}
  }
}

// ============================================================
// OVERLAY MANAGER
// ============================================================

// SVG Icons (inline, no emoji)
const ICONS = {
  shield: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 7 3-1.5 5.5-3.5 5.5-7V4L8 1.5z"/></svg>',
  alert: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2L1.5 13.5h13L8 2z"/><path d="M8 6.5v3M8 11.5v.5"/></svg>',
  cpu: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 1.5v2M10 1.5v2M6 12.5v2M10 12.5v2M1.5 6h2M1.5 10h2M12.5 6h2M12.5 10h2"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>',
  link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 9.5a3 3 0 004.2.2l1.5-1.5a3 3 0 00-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 00-4.2-.2l-1.5 1.5a3 3 0 004.2 4.2l.9-.9"/></svg>',
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8.5l3.5 3.5L13 4"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  minus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10"/></svg>',
  loader: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v3M8 11v3M2 8h3M11 8h3" opacity="0.4"/><path d="M4 4l2 2" opacity="0.7"/><path d="M10 10l2 2" opacity="0.7"/></svg>',
  box: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z"/><path d="M2 5l6 3 6-3M8 8v6.5"/></svg>',
  gate: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V4a2 2 0 012-2h8a2 2 0 012 2v10M6 14v-4h4v4M8 6.5v1"/></svg>',
  comment: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h12v8H6l-3 3v-3H2V3z"/></svg>',
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M5 11H3a1 1 0 01-1-1V3a1 1 0 011-1h7a1 1 0 011 1v2"/></svg>',
};

class OverlayManager {
  injectPendingOverlay(postElement) {
    postElement.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());

    const overlay = document.createElement("div");
    overlay.className = "sourceit-overlay sourceit-severity-medium";

    overlay.innerHTML = `
      <div class="sourceit-badge">
        <div class="sourceit-badge-header">
          <span class="sourceit-icon">${ICONS.shield}</span>
          <span class="sourceit-title">César</span>
          <span style="font-size:11px;color:#a4b0be;flex:1;">Analyzing...</span>
          <span class="sourceit-score sourceit-pending-score">...</span>
          <button class="sourceit-dismiss" title="Close">${ICONS.x}</button>
        </div>
        <div class="sourceit-badge-body">
          <p class="sourceit-explanation" style="font-size:11px;color:#a4b0be;margin:0;">AI verification in progress</p>
        </div>
      </div>
    `;

    overlay.querySelector(".sourceit-dismiss").addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.add("sourceit-hidden");
    });

    const target =
      postElement.querySelector(".feed-shared-update-v2__content") ||
      postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  /**
   * Show a "cleared" badge when LLM determined the post is legitimate.
   */
  injectClearedOverlay(postElement, llmResult) {
    postElement.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());

    const overlay = document.createElement("div");
    overlay.className = "sourceit-overlay sourceit-cleared";

    const reason = llmResult.reason || llmResult.reason_fr || 'Original content';

    overlay.innerHTML = `
      <div class="sourceit-badge sourceit-badge-cleared">
        <div class="sourceit-badge-header" style="border-bottom:none;">
          <span class="sourceit-icon sourceit-icon-cleared">${ICONS.check}</span>
          <span class="sourceit-title">César</span>
          <span class="sourceit-llm-badge">AI</span>
          <button class="sourceit-dismiss" title="Close">${ICONS.x}</button>
        </div>
        <div style="display:block;font-size:12px;color:#c8d0da;padding:4px 12px 8px;line-height:1.4;word-wrap:break-word;">${reason}</div>
      </div>
    `;

    overlay.querySelector(".sourceit-dismiss").addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.add("sourceit-hidden");
    });

    // Auto-fade after 8 seconds
    setTimeout(() => { overlay.style.opacity = "0.4"; }, 8000);

    const target =
      postElement.querySelector(".feed-shared-update-v2__content") ||
      postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  injectOverlay(postElement, regexResult, authorInfo, llmResult) {
    postElement.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());

    const overlay = document.createElement("div");
    overlay.className = "sourceit-overlay";

    const isLLM = llmResult !== null && llmResult !== undefined;
    const confidence = isLLM ? llmResult.confidence : regexResult.score;
    const severity = confidence >= 70 ? "high" : confidence >= 50 ? "medium" : "low";
    overlay.classList.add(`sourceit-severity-${severity}`);
    overlay.setAttribute("data-score", confidence);

    const tpMatch = regexResult.matches.find((m) => m.axis === "third-party");
    const ctaMatch = regexResult.matches.find((m) => m.axis === "gating");

    let explanationHTML = "";
    if (isLLM) {
      explanationHTML = `
        <div class="sourceit-details">
          ${llmResult.gated_content ? `
          <div class="sourceit-detail-row">
            <span class="sourceit-detail-icon">${ICONS.lock}</span>
            <span class="sourceit-detail-label">Gated</span>
            <span class="sourceit-detail-value">${llmResult.gated_content}</span>
          </div>` : ""}
          ${llmResult.original_source && llmResult.original_source !== "null" ? `
          <div class="sourceit-detail-row">
            <span class="sourceit-detail-icon">${ICONS.link}</span>
            <span class="sourceit-detail-label">Source</span>
            <span class="sourceit-detail-value">${llmResult.original_source}</span>
          </div>` : ""}
        </div>
        ${llmResult.suggested_comment ? `
        <div class="sourceit-comment-draft sourceit-collapsed">
          <button class="sourceit-comment-toggle">
            <span>${ICONS.comment} Comment with source</span>
            <span class="sourceit-toggle-arrow">▼</span>
          </button>
          <div class="sourceit-comment-body">
            <div class="sourceit-comment-text-row">
              <p class="sourceit-comment-text">${llmResult.suggested_comment}</p>
              <button class="sourceit-btn-copy" title="Copy">${ICONS.copy}</button>
            </div>
            <button class="sourceit-btn sourceit-btn-post-comment">${ICONS.comment} Post comment</button>
          </div>
        </div>` : ""}`;
    } else {
      const l2Signals = regexResult.signals || [];
      explanationHTML = `
        <div class="sourceit-details">
          ${tpMatch ? `<div class="sourceit-detail-row"><span class="sourceit-detail-icon">${ICONS.box}</span> <span class="sourceit-detail-label">Third-party</span> <span class="sourceit-detail-value">${tpMatch.label}</span></div>` : ""}
          ${ctaMatch ? `<div class="sourceit-detail-row"><span class="sourceit-detail-icon">${ICONS.gate}</span> <span class="sourceit-detail-label">Gating</span> <span class="sourceit-detail-value">${ctaMatch.label}</span></div>` : ""}
          ${l2Signals.map(s => `<div class="sourceit-detail-row"><span class="sourceit-detail-icon">${ICONS.shield}</span> <span class="sourceit-detail-label">Signal</span> <span class="sourceit-detail-value">${s.label}</span></div>`).join('')}
        </div>
        <div class="sourceit-no-ai-notice">Cannot confirm if content is original without AI — add an API key in settings for verification</div>`;
    }

    // Truncate reason to 40 chars
    const rawReason = isLLM ? (llmResult.reason || llmResult.reason_fr || '') : 'Suspicious — needs AI to confirm';

    overlay.innerHTML = `
      <div class="sourceit-badge">
        <div class="sourceit-badge-header">
          <span class="sourceit-icon">${severity === "high" ? ICONS.alert : ICONS.shield}</span>
          <span class="sourceit-title">César</span>
          <span class="sourceit-score">${confidence}%</span>
          ${isLLM ? '<span class="sourceit-llm-badge">AI</span>' : '<span class="sourceit-no-ai-badge">no AI</span>'}
          <button class="sourceit-dismiss" title="Close">${ICONS.x}</button>
        </div>
        ${rawReason ? `<div class="sourceit-reason-line">${rawReason}</div>` : ''}
        <div class="sourceit-badge-body">
          ${explanationHTML}
          <div class="sourceit-actions">
            <button class="sourceit-btn sourceit-btn-confirm">${ICONS.check} Confirm</button>
            <button class="sourceit-btn sourceit-btn-partial">${ICONS.minus} Partial</button>
            <button class="sourceit-btn sourceit-btn-false">${ICONS.x} False positive</button>
          </div>
        </div>
      </div>
    `;

    overlay.querySelector(".sourceit-dismiss").addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.add("sourceit-hidden");
    });

    overlay.querySelector(".sourceit-btn-confirm").addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.innerHTML = `${ICONS.check} Confirmed`;
      btn.disabled = true;
      btn.classList.add("sourceit-btn-confirmed");
    });

    overlay.querySelector(".sourceit-btn-partial").addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.innerHTML = `${ICONS.minus} Noted`;
      btn.disabled = true;
      btn.style.opacity = "0.6";
    });

    overlay.querySelector(".sourceit-btn-false").addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.add("sourceit-hidden");
      postElement.removeAttribute(CONFIG.FLAGGED_ATTR);
    });

    // Comment section toggle (collapsible)
    const commentToggle = overlay.querySelector(".sourceit-comment-toggle");
    if (commentToggle) {
      commentToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const draft = overlay.querySelector(".sourceit-comment-draft");
        draft.classList.toggle("sourceit-collapsed");
      });
    }

    // Copy comment button
    const copyBtn = overlay.querySelector(".sourceit-btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentText = overlay.querySelector(".sourceit-comment-text")?.textContent;
        if (commentText) {
          navigator.clipboard.writeText(commentText).then(() => {
            copyBtn.innerHTML = `${ICONS.check}`;
            copyBtn.style.color = "#2e7d32";
            setTimeout(() => { copyBtn.innerHTML = `${ICONS.copy}`; copyBtn.style.color = ""; }, 2000);
          });
        }
      });
    }

    // "Commenter avec la source" — pre-fill LinkedIn comment box
    const postCommentBtn = overlay.querySelector(".sourceit-btn-post-comment");
    if (postCommentBtn) {
      postCommentBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentText = overlay.querySelector(".sourceit-comment-text")?.textContent;
        if (!commentText) return;
        this.prefillComment(postElement, commentText, postCommentBtn);
      });
    }

    const target =
      postElement.querySelector(".feed-shared-update-v2__content") ||
      postElement;
    target.insertBefore(overlay, target.firstChild);
  }

  /**
   * Pre-fill the LinkedIn comment box on a post.
   * Strategy: find/click the "Comment" button, wait for the input to appear,
   * then inject the text.
   */
  async prefillComment(postElement, text, btn) {
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
      await new Promise(resolve => setTimeout(resolve, 500));

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
          // Pick the one closest to our post (last visible one is usually the just-opened one)
          for (const c of candidates) {
            if (c.offsetParent !== null) editor = c;
          }
        }
      }

      if (editor) {
        // Clear any placeholder and insert text
        editor.focus();
        editor.innerHTML = `<p>${text}</p>`;

        // Trigger input events so LinkedIn registers the change
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));

        btn.innerHTML = `${ICONS.check} Ready — review and post`;
        btn.style.color = "#2e7d32";
        btn.style.borderColor = "#c8e6c9";
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(text);
        btn.innerHTML = `${ICONS.copy} Copied — paste in comment`;
        btn.style.color = "#e65100";
        btn.style.borderColor = "#ffe0b2";
      }
    } catch (err) {
      // Ultimate fallback
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = `${ICONS.copy} Copied to clipboard`;
      } catch (e2) {
        btn.innerHTML = `${ICONS.x} Error — select text manually`;
      }
    }

    // Reset button after 5s
    setTimeout(() => { btn.innerHTML = originalHTML; btn.style.color = ""; btn.style.borderColor = ""; }, 5000);
  }
}

// ============================================================
// FEED SCANNER
// ============================================================

class FeedScanner {
  constructor() {
    this.engine = new DetectionEngine();
    this.overlayManager = new OverlayManager();
    this.isRunning = false;
  }

  getPostElements() {
    const selectors = [
      ".feed-shared-update-v2",
      '[data-urn^="urn:li:activity"]',
      ".occludable-update",
    ];
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) return Array.from(found);
    }
    return [];
  }

  tryAutoExpand(postElement) {
    // Strategy 1: Known CSS selectors
    const selectorBtn = postElement.querySelector(
      'button.feed-shared-inline-show-more-text, button[aria-label*="more"], button[aria-label*="plus"], .feed-shared-text__see-more'
    );
    if (selectorBtn) { selectorBtn.click(); return true; }

    // Strategy 2: Find any button containing "voir plus" or "see more" text
    const allButtons = postElement.querySelectorAll('button');
    for (const btn of allButtons) {
      const text = btn.textContent?.toLowerCase().trim() || '';
      if (text.includes('voir plus') || text.includes('see more') || text.includes('…plus') || text === '…voir plus') {
        btn.click();
        if (CONFIG.DEBUG) console.log("[César] Auto-expanded post (text match)");
        return true;
      }
    }

    // Strategy 3: Find any clickable span/element with "voir plus" text
    const allSpans = postElement.querySelectorAll('span, a');
    for (const el of allSpans) {
      const text = el.textContent?.toLowerCase().trim() || '';
      if ((text === 'voir plus' || text === '…voir plus' || text === 'see more' || text === '...see more') && el.offsetParent !== null) {
        el.click();
        if (CONFIG.DEBUG) console.log("[César] Auto-expanded post (span match)");
        return true;
      }
    }

    return false;
  }

  /**
   * Watch for manual "voir plus" clicks — re-scan when post text changes.
   */
  watchForExpansion(post) {
    const textContainer = post.querySelector('.feed-shared-text, .update-components-text, span.break-words');
    if (!textContainer) return;

    const observer = new MutationObserver(() => {
      // Text changed (user clicked "voir plus"), re-analyze
      observer.disconnect();
      post.removeAttribute(CONFIG.PROCESSED_ATTR);
      post.removeAttribute(CONFIG.FLAGGED_ATTR);
      post.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());

      setTimeout(() => {
        const text = this.engine.extractPostText(post);
        if (!text) return;
        const author = this.engine.extractAuthorInfo(post);
        const result = this.engine.fullAnalysis(post, text, author);

        if (CONFIG.DEBUG) {
          console.log(`%c[César] RE-SCAN after expand — L${result.layer} Score: ${result.score}% | ${result.reason}`,
            result.flagged ? "color: #ff4757; font-weight: bold" : "color: #ffa502"
          );
        }

        if (result.flagged) {
          post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
          post.setAttribute(CONFIG.PROCESSED_ATTR, "true");
          this.overlayManager.injectPendingOverlay(post);
          this.verifyWithLLM(post, text, author, result);
        }
      }, 300);
    });

    observer.observe(textContainer, { childList: true, subtree: true, characterData: true });
  }

  scanFeed() {
    const posts = this.getPostElements();
    let processed = 0;

    for (const post of posts) {
      if (processed >= CONFIG.MAX_POSTS_PER_SCAN) break;
      if (post.hasAttribute(CONFIG.PROCESSED_ATTR)) continue;

      post.setAttribute(CONFIG.PROCESSED_ATTR, "true");
      processed++;

      this.tryAutoExpand(post);

      // Watch for manual expansion too
      this.watchForExpansion(post);

      setTimeout(async () => {
        const text = this.engine.extractPostText(post);
        if (!text) return;

        if (CONFIG.DEBUG) {
          const preview = text.substring(0, 80).replace(/\n/g, ' ') + (text.length > 80 ? '...' : '');
          console.log(`[César] 📝 Text extracted (${text.length} chars): "${preview}"`);
        }

        const author = this.engine.extractAuthorInfo(post);
        const result = this.engine.fullAnalysis(post, text, author);
        this.engine.updateStats(result.flagged);

        if (CONFIG.DEBUG) {
          const style = result.flagged
            ? "color: #ff4757; font-weight: bold"
            : result.matches.length > 0 || result.signals.length > 0
              ? "color: #ffa502"
              : "color: #747d8c";
          const layerTag = `L${result.layer}`;
          console.log(
            `%c[César] ${layerTag} Score: ${result.score}% (cap ${result.layers.cap || '50%'}) | ${result.reason}`,
            style
          );
          if (result.layers.l1) {
            console.log(`  L1 regex: TP=${result.layers.l1.rawTP} CTA=${result.layers.l1.rawCTA} → ${result.layers.l1.score}%`);
          }
          if (result.layers.l2 && result.layers.l2.points > 0) {
            console.log(`  L2 behavioral: +${result.layers.l2.points}pts → ${result.layers.l2.score}%`, result.layers.l2.details);
          }
        }

        // Check if user has an API key configured
        const hasApiKey = await new Promise(resolve => {
          try {
            chrome.storage.local.get(["cesar_api_key"], (data) => resolve(!!data.cesar_api_key));
          } catch (e) { resolve(false); }
        });

        this.engine.updateStats(result.flagged || (hasApiKey && result.score >= 30));

        if (hasApiKey) {
          // WITH API KEY: lower threshold, LLM confirms ambiguous cases
          if (result.score >= 50) {
            // 50-75%: high enough to show badge, LLM enriches in background
            post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
            if (CONFIG.DEBUG) console.log(`%c[César] Score ${result.score}% + API key — badge shown, LLM enriching...`, "color: #ff4757");
            this.overlayManager.injectOverlay(post, result, author, null);
            this.verifyWithLLM(post, text, author, result);
          } else if (result.score >= 30) {
            // 30-49%: ambiguous zone, LLM must confirm before badge
            post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
            if (CONFIG.DEBUG) console.log(`%c[César] Score ${result.score}% + API key — LLM must confirm...`, "color: #ffa502");
            this.overlayManager.injectPendingOverlay(post);
            this.verifyWithLLM(post, text, author, result);
          }
          // < 30%: ignored even with API key
        } else {
          // WITHOUT API KEY: only show badge for higher confidence
          if (result.flagged && result.score >= 40) {
            post.setAttribute(CONFIG.FLAGGED_ATTR, result.score);
            if (CONFIG.DEBUG) console.log(`%c[César] Score ${result.score}% (no API) — badge shown, capped at ${result.layers.cap}`, "color: #ff4757");
            this.overlayManager.injectOverlay(post, result, author, null);
          }
        }
      }, 500);
    }
    return processed;
  }

  /**
   * Send flagged post to Claude for verification.
   * Falls back to regex-only if no API key is set.
   */
  async verifyWithLLM(post, text, author, regexResult) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "cesar-verify", postText: text, authorName: author.name },
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(resp);
            }
          }
        );
      });

      // Remove pending overlay
      post.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());

      if (!response.success) {
        if (response.error === "NO_API_KEY") {
          // No API key → fallback to regex-only (show badge directly)
          if (CONFIG.DEBUG) console.log("%c[César] ⚡ No API key — falling back to regex-only", "color: #ffa502");
          this.overlayManager.injectOverlay(post, regexResult, author, null);
          return;
        }
        if (CONFIG.DEBUG) console.log(`%c[César] ❌ LLM error: ${response.error}`, "color: #ff4757");
        // On error, show regex result as fallback
        this.overlayManager.injectOverlay(post, regexResult, author, null);
        return;
      }

      const llmResult = response.result;

      if (CONFIG.DEBUG) {
        const style = llmResult.parasitic
          ? "color: #ff4757; font-weight: bold"
          : "color: #2ed573; font-weight: bold";
        console.log(
          `%c[César] 🤖 LLM verdict: ${llmResult.parasitic ? "PARASITIC" : "LEGITIMATE"} (${llmResult.confidence}%) — ${llmResult.reason || llmResult.reason_fr}`,
          style
        );
      }

      if (llmResult.parasitic) {
        // Confirmed parasitic → show full badge with LLM reasoning
        this.overlayManager.injectOverlay(post, regexResult, author, llmResult);
      } else {
        // LLM says legitimate → show cleared badge
        post.removeAttribute(CONFIG.FLAGGED_ATTR);
        this.overlayManager.injectClearedOverlay(post, llmResult);
        if (CONFIG.DEBUG) {
          console.log(`%c[César] ✅ Post cleared by LLM: ${llmResult.reason || llmResult.reason_fr}`, "color: #2ed573");
        }
      }

    } catch (err) {
      // Network error or other failure → fallback to regex
      post.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());
      if (CONFIG.DEBUG) console.log(`%c[César] ⚠️ LLM fallback: ${err.message}`, "color: #ffa502");
      this.overlayManager.injectOverlay(post, regexResult, author, null);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("[César] v0.5 — Parasitic lead magnet detector started 🔍 (LLM-powered)");

    this.scanFeed();
    this.intervalId = setInterval(() => this.scanFeed(), CONFIG.SCAN_INTERVAL);

    this.observer = new MutationObserver((mutations) => {
      const hasNew = mutations.some((m) =>
        m.addedNodes.length > 0 &&
        Array.from(m.addedNodes).some((n) =>
          n.nodeType === 1 && n.querySelector?.(".feed-shared-update-v2")
        )
      );
      if (hasNew) this.scanFeed();
    });

    const container =
      document.querySelector(".scaffold-finite-scroll__content") ||
      document.querySelector("main") ||
      document.body;
    this.observer.observe(container, { childList: true, subtree: true });
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.observer) this.observer.disconnect();
    console.log("[César] Stopped.");
  }
}

// ============================================================
// INIT
// ============================================================

function waitForFeed(cb, maxAttempts = 20) {
  let attempts = 0;
  const check = () => {
    attempts++;
    const exists =
      document.querySelector(".feed-shared-update-v2") ||
      document.querySelector('[data-urn^="urn:li:activity"]') ||
      document.querySelector(".scaffold-finite-scroll__content");
    if (exists) cb();
    else if (attempts < maxAttempts) setTimeout(check, 1000);
    else cb();
  };
  check();
}

waitForFeed(() => {
  const scanner = new FeedScanner();
  scanner.start();

  // Listen for commands from debug.js (MAIN world) via CustomEvents
  document.addEventListener('cesar-cmd', (e) => {
    try {
      const data = JSON.parse(e.detail);
      
      if (data.cmd === 'debug') {
        CONFIG.DEBUG = true;
        console.log("[César] Debug ON — Tiers = contenu tiers, CTA = gating");
      } 
      else if (data.cmd === 'rescan') {
        document.querySelectorAll(`[${CONFIG.PROCESSED_ATTR}]`).forEach(el => {
          el.removeAttribute(CONFIG.PROCESSED_ATTR);
          el.removeAttribute(CONFIG.FLAGGED_ATTR);
          el.querySelectorAll('.sourceit-overlay').forEach(o => o.remove());
        });
        scanner.scanFeed();
        console.log("[César] Re-scan triggered");
      }
      else if (data.cmd === 'test') {
        const l1 = scanner.engine.analyzeLayer1(data.text);
        const l1Score = Math.min(Math.round((Math.min(l1.rawTP, 100) + Math.min(l1.rawCTA, 100)) / 2 * 0.5), 50);
        console.table(l1.matches.map((m) => ({ axis: m.axis, signal: m.label, score: m.score })));
        console.log(`→ L1 Score: ${l1Score}% (max 50%) | TP: ${l1.rawTP} | CTA: ${l1.rawCTA} | Both axes: ${l1.hasTP && l1.hasCTA}`);
        console.log("  Note: L2 (behavioral) requires DOM, L3 (LLM) requires API. Use __cesar.rescan() to test full pipeline.");
      }
      else if (data.cmd === 'stats') {
        console.log("[César] Stats:", scanner.engine.stats);
      }
    } catch (err) {
      console.error("[César] Command error:", err);
    }
  });
});
