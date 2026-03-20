# Chrome Web Store Listing — César

## Short description (132 chars max)
Detects parasitic lead magnets on LinkedIn — posts that gate access to content the author didn't create. AI-powered, open source.

## Detailed description

Some LinkedIn "creators" take official documentation, open-source projects, or public tutorials, repackage them in a post, then hide the link behind engagement bait: "Comment 🔥 and I'll send you the resource!"

The link is public. The content isn't theirs. They're farming engagement on someone else's work.

César detects these posts and helps you share the original source directly.

HOW IT WORKS

César uses a 3-layer confidence scoring model:

Layer 1 — Regex patterns (max 50%): Scans your feed for two combined signals: third-party attribution (the post references someone else's work) + gating CTA (the post gates access behind comments, DMs, or follows). Both must fire.

Layer 2 — Behavioral signals (max 75%): Detects comment bait (60%+ emoji comments), public URL references (GitHub, npm, official docs), author-product mismatch, and engagement-bait post structure.

Layer 3 — LLM verification (max 99%): With an API key, flagged posts are analyzed by AI to confirm: "Did the author create this content, or just repackage something public?" The LLM also generates a suggested comment with the original source.

SUPPORTED AI PROVIDERS

• Anthropic (Haiku 4.5) — with prompt caching
• OpenAI (GPT-5 mini)
• Google (Gemini 3 Flash)
• xAI (Grok 4.1 Fast)

Provider is auto-detected from your API key prefix. Works without AI too (capped at 75% confidence).

KEY FEATURES

• Dark blue badge injected at the bottom of flagged posts — read first, verdict after
• AI-generated comment with original source + "Detected by César 🏛️" signature
• One-click comment pre-fill into LinkedIn's comment box
• Feedback buttons: Confirm / Partial / False positive
• Debug console API for power users
• No backend — all API calls go directly to LLM providers
• Open source (MIT license)

PRIVACY

César does not collect, store, or transmit any personal data. Post text is only sent to your chosen LLM provider (using your own API key) for analysis. No analytics, no tracking, no backend server. Your API key is stored locally in Chrome's extension storage.

Source code: https://github.com/bastiensoret/Cesar

## Category
Productivity

## Language
English

## Tags (up to 5)
LinkedIn, lead magnet, AI, content detection, engagement bait
