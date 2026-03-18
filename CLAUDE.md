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

## Style
- ESLint + Prettier enforced
- Single quotes, trailing commas, 100 char width
- No external runtime dependencies — fetch-only for LLM calls
- Console logs prefixed with `[César]`
