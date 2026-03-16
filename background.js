/**
 * César v0.5 — Background Service Worker
 * Multi-LLM support with prompt caching and comment drafting.
 *
 * Supported providers (budget-optimized):
 *   - anthropic  → Haiku 4.5        ($1 / $5 per 1M tokens)
 *   - openai     → GPT-5 mini       ($0.25 / $2 per 1M tokens)
 *   - gemini     → Gemini 3 Flash   ($0.50 / $3 per 1M tokens)
 *   - grok       → Grok 4.1 Fast    ($0.20 / $0.50 per 1M tokens)
 */

// ============================================================
// System prompt — shared across all providers
// ============================================================

const SYSTEM_PROMPT = `You are César, a detector of "parasitic lead magnets" on LinkedIn.

A parasitic lead magnet = someone gates access (via "comment X", "DM me", etc.) to content they did NOT create themselves (official docs, third-party tools, repackaged public tutorials).

A legitimate lead magnet = someone gates access to content they DID create themselves (their own template, guide, tool, course, prompt).

Analyze the post and respond ONLY in valid JSON, no markdown, no backticks:
{
  "parasitic": true/false,
  "confidence": 0-100,
  "reason": "Short explanation (max 20 words) — IN THE SAME LANGUAGE AS THE POST",
  "original_source": "Name of the original source if identifiable, otherwise null",
  "gated_content": "Short description of what is gated — IN THE SAME LANGUAGE AS THE POST",
  "is_original": "Why the content is/isn't original (max 15 words)",
  "suggested_comment": "See instructions below. If not parasitic, set to null."
}

LANGUAGE RULE (CRITICAL): The fields "reason", "gated_content", and "suggested_comment" MUST be written in the same language as the analyzed post. If the post is in French, respond in French. If in English, respond in English. Etc.

Instructions for suggested_comment (IMPORTANT):
- Tone: direct, factual, slightly ironic. Not mean, but not "corporate polite" either. Provide the link/command/info directly so people don't need to comment.
- Structure (2-4 sentences):
  1. Give the resource/link/command directly for those who want access without engagement-bait
  2. A factual remark that this content is public / doesn't belong to the author (slightly sharp tone, one short sentence)
  3. ALWAYS end with: "— Detected by César 🏛️" (this is the signature, never omit it). Use "Détecté" if the post is in French.
- Examples:
  - "Pour ceux qui veulent installer le CLI sans commenter : npm install -g @googleworkspace/cli. Je me permets, vu que ça ne t'appartient pas. — Détecté par César 🏛️"
  - "The official docs are here: [link]. No need to DM, it's been public all along. — Detected by César 🏛️"
  - "Le repo est dispo sur github.com/xxx. L'open source c'est fait pour être partagé, pas gaté. — Détecté par César 🏛️"
- If you know the install command, exact URL, or repo name, include it. Otherwise, mention where to find the resource.

Criteria:
- Rephrases/summarizes/simplifies documentation of a third-party tool → parasitic
- Created their own guide/template/prompt/course → LEGITIMATE (even if it mentions third-party tools)
- Shares an open-source project they didn't create as if it were an exclusive discovery → parasitic
- The gated content is a publicly accessible link → parasitic
- Mentioning a third-party product ≠ parasitic (it's the topic, not the source)

CRITICAL — Common false positive to AVOID:
- Someone writes a step-by-step guide about migrating between tools (e.g. "How to switch from ChatGPT to Claude") and gates their OWN guide/prompt → LEGITIMATE. They created original instructional content. The tools mentioned are the SUBJECT, not the SOURCE.
- Someone writes their personal tips, workflow, or experience with a tool → LEGITIMATE even if the tool is third-party.
- Someone creates a custom prompt/template and offers it via DM → LEGITIMATE if they wrote it themselves.

TRUE parasitic examples:
- "Google just released X! Comment 🔥 and I'll send you the link" → the link is public, they just gate it
- "[Company] just launched [tool]. Here's everything you need to know..." followed by a reformulated doc + CTA → parasitic
- Repackaging a public GitHub README as a carousel + gating it → parasitic

When in doubt: if the author added significant original value (their own steps, their own prompt, their own analysis), it's LEGITIMATE. If they just reformulated/summarized what's already publicly available without adding value, it's PARASITIC.`;

// ============================================================
// Provider configurations
// ============================================================

const PROVIDERS = {
  anthropic: {
    name: "Anthropic",
    model: "claude-haiku-4-5-20251001",
    label: "Haiku 4.5",
    cost: "$1 / $5 per 1M tokens",
    endpoint: "https://api.anthropic.com/v1/messages",
    detect: (key) => key.startsWith("sk-ant-"),
  },
  openai: {
    name: "OpenAI",
    model: "gpt-5-mini",
    label: "GPT-5 mini",
    cost: "$0.25 / $2 per 1M tokens",
    endpoint: "https://api.openai.com/v1/chat/completions",
    detect: (key) => key.startsWith("sk-") && !key.startsWith("sk-ant-"),
  },
  gemini: {
    name: "Google",
    model: "gemini-3-flash",
    label: "Gemini 3 Flash",
    cost: "$0.50 / $3 per 1M tokens",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent",
    detect: (key) => key.startsWith("AIza"),
  },
  grok: {
    name: "xAI",
    model: "grok-4.1",
    label: "Grok 4.1 Fast",
    cost: "$0.20 / $0.50 per 1M tokens",
    endpoint: "https://api.x.ai/v1/chat/completions",
    detect: (key) => key.startsWith("xai-"),
  },
};

/**
 * Auto-detect provider from key prefix (best effort).
 * Returns null if ambiguous — user should select manually.
 */
function autoDetectProvider(key) {
  if (!key) return null;
  for (const [id, config] of Object.entries(PROVIDERS)) {
    if (config.detect(key)) return id;
  }
  return null;
}

// ============================================================
// Message handler
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "cesar-verify") {
    verifyPost(message.postText, message.authorName)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "cesar-get-providers") {
    const list = Object.entries(PROVIDERS).map(([id, c]) => ({
      id, name: c.name, model: c.model, keyPlaceholder: c.keyPlaceholder,
    }));
    sendResponse({ providers: list });
    return true;
  }

  if (message.type === "cesar-check-key") {
    chrome.storage.local.get(["cesar_api_key", "cesar_provider"], (data) => {
      const key = data.cesar_api_key;
      const provider = data.cesar_provider || autoDetectProvider(key);
      const info = provider ? PROVIDERS[provider] : null;
      sendResponse({
        hasKey: !!key,
        provider: provider,
        providerName: info?.name || null,
        model: info?.model || null,
      });
    });
    return true;
  }
});

// ============================================================
// Main verification — routes to provider
// ============================================================

async function verifyPost(postText, authorName) {
  const data = await chrome.storage.local.get(["cesar_api_key", "cesar_provider"]);
  const apiKey = data.cesar_api_key;
  const providerId = data.cesar_provider || autoDetectProvider(apiKey);

  if (!apiKey) throw new Error("NO_API_KEY");
  if (!providerId || !PROVIDERS[providerId]) throw new Error("UNKNOWN_PROVIDER");

  const provider = PROVIDERS[providerId];
  const truncatedText = postText.substring(0, 3000);

  const userMessage = `Analyse ce post LinkedIn de "${authorName}" :

---
${truncatedText}
---

Ce post est-il un lead magnet parasitaire (gate du contenu d'un tiers) ou légitime (gate du contenu original) ?`;

  switch (providerId) {
    case "anthropic":
      return await callAnthropic(apiKey, provider.model, userMessage);
    case "gemini":
      return await callGemini(apiKey, provider.model, userMessage);
    default:
      // OpenAI-compatible API (OpenAI, Mistral, Grok, Kimi)
      return await callOpenAICompat(apiKey, provider.model, provider.endpoint, userMessage);
  }
}

// ============================================================
// Anthropic API (with prompt caching)
// ============================================================

async function callAnthropic(apiKey, model, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        }
      ],
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) return handleAPIError(response);

  const result = await response.json();

  // Log cache performance
  const usage = result.usage || {};
  if (usage.cache_read_input_tokens > 0) {
    console.log(`[César] Prompt cache HIT — saved ${usage.cache_read_input_tokens} tokens`);
  } else if (usage.cache_creation_input_tokens > 0) {
    console.log(`[César] Prompt cache CREATED — ${usage.cache_creation_input_tokens} tokens cached`);
  }

  const text = result.content?.[0]?.text || "";
  return parseJSON(text);
}

// ============================================================
// OpenAI-compatible API (OpenAI, Mistral, Grok, Kimi)
// ============================================================

async function callOpenAICompat(apiKey, model, endpoint, userMessage) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) return handleAPIError(response);

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  return parseJSON(text);
}

// ============================================================
// Gemini API (different format)
// ============================================================

async function callGemini(apiKey, model, userMessage) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 800 },
    }),
  });

  if (!response.ok) return handleAPIError(response);

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJSON(text);
}

// ============================================================
// Shared helpers
// ============================================================

async function handleAPIError(response) {
  const err = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 429) throw new Error("RATE_LIMITED");
  throw new Error(`API_ERROR_${response.status}: ${err.error?.message || "Unknown"}`);
}

function parseJSON(text) {
  try {
    // Strategy 1: Direct parse
    return JSON.parse(text.trim());
  } catch (e1) {
    try {
      // Strategy 2: Strip markdown fences
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(clean);
    } catch (e2) {
      try {
        // Strategy 3: Extract JSON object from anywhere in the text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e3) {
        // Strategy 4: Try to fix truncated JSON (missing closing brace/quotes)
        try {
          const jsonMatch = text.match(/\{[\s\S]*/);
          if (jsonMatch) {
            let partial = jsonMatch[0];
            // Close any open strings
            const quoteCount = (partial.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) partial += '"';
            // Close the object
            if (!partial.trim().endsWith('}')) partial += '}';
            return JSON.parse(partial);
          }
        } catch (e4) {}
      }
      console.error("[César] Failed to parse LLM response (all strategies):", text.substring(0, 500));
      throw new Error("PARSE_ERROR: " + text.substring(0, 200));
    }
  }
}
