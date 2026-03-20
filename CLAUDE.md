# CLAUDE.md — César Development Guide

## Project
César is a Chrome Extension (Manifest V3) that detects parasitic lead magnets on LinkedIn.
It uses a 3-layer scoring system: regex patterns → behavioral signals → LLM verification.

## Commands
- `npm run dev` — Build with watch mode
- `npm run build` — Production build to dist/
- `npm run test` — Run tests
- `npm run lint` — ESLint check
- `npm run lint:fix` — ESLint auto-fix
- `npm run format` — Prettier format

## Architecture
- `src/content/` — Content script injected into LinkedIn (bundled as IIFE)
- `src/background/` — Service worker handling LLM API calls (bundled as IIFE)
- `src/popup/` — Extension popup UI (HTML + CSS + JS)
- `src/debug/` — Debug bridge running in MAIN world (standalone, not bundled)
- `src/shared/` — Utilities shared across content/background/popup
- `static/` — Icons and CSS copied to dist/ as-is
- `tests/` — Vitest unit tests with jsdom

## Build
esbuild bundles `src/content/index.js`, `src/background/index.js`, and `src/popup/popup.js`
into IIFE format in `dist/`. Static assets and `debug.js` are copied verbatim.

## Key Constraints
- Content scripts cannot use ES module imports at runtime; esbuild bundles them into IIFE
- `debug.js` runs in MAIN world and communicates with content.js via CustomEvents — must stay standalone
- LLM responses must be HTML-escaped before innerHTML injection (use `escapeHTML` from `src/shared/sanitize.js`)
- All `chrome.storage` calls should use async wrappers from `src/shared/storage.js`

## Testing
- Tests use Vitest with jsdom environment
- Chrome APIs are mocked in `tests/setup.js`
- Focus testing on regex patterns and detection scoring logic

## Color System (Dark Theme)
All colors are managed via CSS custom properties in `popup.css` (prefix `--color-`) and `overlay.css` (prefix `--si-`).

### Backgrounds
- `#0c0c18` — darkest (popup body)
- `#13132a` — cards/panels (popup header)
- `#1a1a2e` → `#16213e` — overlay gradient

### Text
- `#e8e8ee` — primary
- `#c0c0d0` — secondary
- `#d0d0e0` — heading (popup logo, count)
- `#9a9ab0` — muted (labels, descriptions)
- `#606078` — tertiary (group labels)

### Accents
- `#7bc47b` — green (toggle on, success)
- `#7bed9f` — bright green (overlay confirm, AI badge, copy success)
- `#ff4757` — red (high severity border)
- `#ff6b81` — soft red (high severity text, icon)
- `#ff8a9c` — soft red (popup error text)
- `#ffa502` — orange (medium severity border, warning)
- `#ffbe76` — soft orange (medium severity text)
- `#3742fa` — blue (low severity border)
- `#AFA9EC` — purple (comment section accent)
- `#2e7d32` — dark green (cleared overlay border)

### Overlay utility
- `#747d8c` — muted (dismiss, detail labels)
- `#a4b0be` — subdued (analyzing text, base button)

### Borders
- `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.1)` — subtle to strong

## Style
- ESLint + Prettier enforced
- Single quotes, trailing commas, 100 char width
- No external runtime dependencies — fetch-only for LLM calls
- Console logs prefixed with `[César]`
