# Changelog

All notable changes to César are documented here.

## [0.7.0] — 2026-03-20

### Added
- LLM concurrency queue: max 3 parallel LLM calls, prevents API flooding
- Debounced feed scanning (500ms) replaces polling interval — less CPU, fewer duplicate scans
- Reactive popup stats via `chrome.storage.onChanged` (replaces 2s polling)
- Layer 2 author-mismatch: 10 new brands (Slack, Discord, GitHub, HubSpot, Salesforce, Adobe, Amazon, Apple, Canva, Airtable)
- Debug mode now loadable from storage settings at init
- `normalizeL1Score` extracted as reusable function from detection engine
- Bundle size reporting in build output (metafile)

### Fixed
- Comment prefill polls for editor (up to 2s) instead of fixed 500ms delay — fixes race on slow connections
- Comment prefill scopes broader search to same post ancestor — prevents injecting into wrong post
- `escapeHTML` rewritten as pure string replacement — works in service workers (no `document` dependency)
- `chrome.storage` wrappers now properly reject on `runtime.lastError`
- LLM error handlers use `await` instead of `return` (errors were silently swallowed)
- DOM extractor deduplicates nested elements — no more double-counted post text
- Background message listener validates `sender.id` (ignores external messages)
- Removed stale `reason_fr` fallbacks from overlay manager and feed scanner

### Changed
- Overlay dismiss animates out (scale + fade) instead of `display: none` — smoother UX
- Inline styles replaced with CSS classes across overlay manager and popup (no more `style.color` in JS)
- All `!important` rules removed from overlay CSS — specificity fixed via selector weight
- Text arrows (`▼`) replaced with inline SVGs for cross-platform consistency
- AbortController wired to all overlay event listeners for proper cleanup on re-inject
- Overlay CSS resets font properties on `*` to prevent LinkedIn style bleed
- Popup: `html lang` changed from `fr` to `en`; scrollbar styled; `max-height` on reveal panel reduced
- Minimum font sizes raised to 11px across badges, labels, and footer for readability
- Low-contrast text colors bumped (`#606078` → `#9a9ab0`, `#3a3a4e` → `#9a9ab0`)
- Added `aria-label`, `aria-expanded`, `aria-controls`, and proper `<label>` associations across popup and overlay
- Added `focus-visible` ring on all interactive elements (popup toggles, buttons, inputs, selects)
- Added `prefers-reduced-motion` media query — disables slide-in, pulse, and spin animations
- Added severity label badges (HIGH / MED / LOW) in overlay header
- Added spinner animation on loader icon during comment prefill
- Added LinkedIn dark-mode border contrast override for badges
- Feedback buttons: clicking one now dims the others (`sourceit-btn-acted`)
- Data attributes renamed from `data-sourceit-*` to `data-cesar-*`
- Debug mode off by default in production (`CONFIG.DEBUG = false`)
- Third-party regex patterns use Unicode-aware `\p{L}` for accented characters
- Build: production bundles are minified; dev builds get inline sourcemaps
- Packaging: cross-platform zip (PowerShell on Windows, zip on Unix)
- Popup fetches provider names from background instead of hardcoded map
- Feed scanner replaced `setInterval` polling with MutationObserver-only + debounce
- Unused imports removed from `build.js`
- All hardcoded colors migrated to CSS custom properties (`--color-*` in popup, `--si-*` in overlay)
- SVG icons annotated with `aria-hidden="true"` for screen readers
- Popup toggles use `role="switch"` for correct ARIA semantics
- Toggle wrappers changed from `<span>` to `<label>` for proper form association
- Overlay `aria-label` set per state (analyzing, cleared, severity + confidence)
- Comment toggle tracks `aria-expanded` state
- Comment body animates via `max-height` transition instead of `display: none`
- New `chevron` icon in icon set; inline arrow SVGs replaced with shared icon
- Popup logo updated to shield-with-checkmark design
- `postsFlagged` display sanitized with `Number() || 0` to prevent `undefined`
- Popup save button feedback uses CSS class instead of inline `style.color`
- Removed unused `.sourceit-explanation` and `.sourceit-reason-cleared` CSS rules
- Overlay `will-change` removed (was causing unnecessary compositing layers)
- Color System section added to CLAUDE.md

## [0.5.4] — 2026-03-15

### Fixed
- All pattern labels translated to English (no more FR/EN mix in badges)
- Redundant "49% max" badge replaced with simple "no AI" indicator
- LLM prompt strengthened to avoid false positives on legitimate lead magnets (e.g. personal migration guides)

### Changed
- Without AI: badge shows "Suspicious — needs AI to confirm" instead of asserting parasitism
- No-AI notice explains limitation clearly: "Cannot confirm if content is original without AI"

## [0.5.0] — 2026-03-15

### Added
- **3-layer scoring model**: regex (max 50%) → behavioral (max 75%) → LLM (max 99%)
- **Layer 2 behavioral signals**: comment bait analysis, public URL detection, author-product mismatch, post structure fingerprint
- **API-aware thresholds**: 30-49% zone only visible with API key, LLM confirms ambiguous posts
- **Web search toggle guard**: requires API key, auto-reverts without one

### Changed
- All UI text switched to English (static elements)
- LLM output adapts to post language (reason, gated_content, suggested_comment)
- Detection threshold lowered to 40% for new scoring scale
- System prompt field renamed from `reason_fr` to `reason`

## [0.4.0] — 2026-03-15

### Added
- **Multi-LLM support**: Anthropic (Haiku 4.5), OpenAI (GPT-5 mini), Google (Gemini 3 Flash), xAI (Grok 4.1 Fast)
- **Prompt caching** for Anthropic API (cache_control: ephemeral on system prompt)
- **Comment pre-fill**: "Comment with source" button opens LinkedIn comment box and injects suggested text
- **Collapsible comment section**: hidden by default, expands on click
- **Smart thresholds**: score ≥75 shows badge immediately, 50-74 waits for LLM
- **Sassy comment generation**: LLM drafts comments with original source + "Detected by César 🏛️" signature

### Changed
- Popup redesigned: minimal with reveal menu for settings
- All icons switched from emoji to inline SVG
- UI sobered up: compact badge with dark blue background
- Feedback buttons: Confirm / Partial / False positive (replaces old Confirm / Contenu original)
- Comment button in purple (#AFA9EC), distinct from green confirm
- Popup header toggle for quick enable/disable
- Provider auto-detected from API key prefix

## [0.3.0] — 2026-03-15

### Added
- **LLM verification**: posts flagged by regex are sent to Claude API for semantic analysis
- Pending badge ("César — Analyzing...") shown while LLM processes
- LLM returns structured JSON: parasitic (bool), confidence, reason, source, gated_content, suggested_comment
- Posts cleared by LLM have their badge silently removed
- API key input in popup with masked display

### Changed
- Badge shows LLM reasoning instead of raw regex signals when AI is available
- "Trouver la source" button uses LLM-identified source for smarter search

## [0.2.0] — 2026-03-15

### Added
- **Two-axis detection model**: third-party attribution + gating CTA (both required)
- "Give back to César" branding, dark blue UI
- Auto-expand "voir plus" on truncated posts
- Re-scan when user manually expands a post (MutationObserver)
- Debug API via `__cesar.enableDebug()` / `__cesar.test()` / `__cesar.rescan()`
- Expanded CTA patterns: "Laisser un commentaire", "ceux qui repostent", "1ère relation", etc.

### Changed
- Detection logic: no longer flags legitimate lead magnets on own content
- Badge positioned at bottom of post (read first, verdict after)
- Debug bridge uses MAIN world script injection via manifest (bypasses LinkedIn CSP)

## [0.1.0] — 2026-03-15

### Added
- Chrome Extension scaffold (Manifest V3)
- Content script scanning LinkedIn feed posts
- Basic regex pattern matching (CTA + gate + reform + amplifier categories)
- Dark overlay badge injection on flagged posts
- Extension popup with scan stats and toggles
- MutationObserver + polling for infinite scroll support
