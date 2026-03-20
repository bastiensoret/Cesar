---
name: "arch-audit"
description: "Architecture, performance & improvement audit for César Chrome Extension. Evaluates code organization, detection pipeline quality, security, performance, testing gaps, error handling, and DX. Does NOT make changes — only analyzes and reports. Use when you want a technical health check of the codebase."
---

# Architecture, performance & improvement audit

You are a senior software architect with deep knowledge of Chrome Extension (Manifest V3) development. Your job is to perform a comprehensive technical audit of the César extension across 7 categories. **Do NOT make any changes** — only analyze and report.

---

## Step 1 — Orientation: read the architectural intent

Before auditing code, understand what was intended. Read these files first:

1. `CLAUDE.md` — project overview, architecture, key constraints, style guide
2. `manifest.json` — extension permissions, content scripts, service worker config

Then build a file inventory using Glob:

```
src/content/engine/       — 3-layer detection pipeline (regex, behavioral, LLM)
src/content/patterns/     — regex pattern definitions for lead magnet detection
src/content/scanner/      — LinkedIn feed scanning and auto-expand logic
src/content/ui/           — overlay UI, icons, comment prefill
src/content/config.js     — content script configuration
src/content/index.js      — content script entry point
src/background/llm/       — LLM provider implementations (Anthropic, OpenAI, Gemini)
src/background/           — service worker: LLM routing, system prompt, verification
src/popup/                — extension popup UI (HTML + CSS + JS)
src/debug/                — debug bridge running in MAIN world
src/shared/               — utilities shared across content/background/popup
static/                   — icons and CSS copied to dist/
tests/                    — Vitest unit tests with jsdom
build.js                  — esbuild build script
manifest.json             — Manifest V3 configuration
package.json              — dependencies and scripts
```

Output the inventory as a table so the user can see the audit scope before you begin.

---

## Step 2 — Systematic audit across 7 categories

Audit every file or group relevant to each category. Be specific: reference exact file paths and line numbers. Do not be generous — rate honestly.

For each issue found, report in this format:

```
**[Category] — Severity: Critical | High | Medium | Low**
- **File**: `src/path/to/file.js:42`
- **Issue**: What's wrong (quote code where helpful)
- **Impact**: Effect on correctness, security, detection accuracy, or DX
- **Fix**: Concrete, actionable recommendation
```

---

### Category 1 — Architecture & code organization

**What to check:**

- Does the folder structure cleanly separate concerns? Content script (detection + UI) vs background (LLM) vs popup (settings) vs shared (utilities)?
- Are there files in the wrong layer? (e.g., LLM calls in content script, DOM manipulation in background, business logic in popup)
- Is the detection pipeline layered correctly? Layer 1 (regex) → Layer 2 (behavioral signals) → Layer 3 (LLM verification) — are these cleanly separated?
- Is `src/content/index.js` thin? (should orchestrate, not contain detection logic)
- Is `src/background/index.js` thin? (should route messages, not contain LLM logic)
- Are LLM providers in `src/background/llm/` isolated from each other and from the verification logic?
- Does `src/shared/` only contain truly shared utilities? Are there files that belong in content or background instead?
- Is message passing between content ↔ background cleanly structured? (e.g., consistent message format, typed actions)
- Does `src/debug/debug.js` stay standalone with no imports? (it runs in MAIN world)
- Are there circular dependencies between modules?

**Key files to read:**
- `src/content/index.js`
- `src/content/engine/detection-engine.js`
- `src/content/engine/layer1.js`, `layer2.js`
- `src/background/index.js`
- `src/background/verify.js`
- `src/background/providers.js`
- All files in `src/background/llm/`
- All files in `src/shared/`
- `src/debug/debug.js`

---

### Category 2 — Detection pipeline quality

**What to check:**

- **Regex patterns**: Are the patterns in `src/content/patterns/` specific enough to avoid false positives? Are they too narrow, missing common lead magnet phrasing?
- **Pattern maintainability**: Are patterns well-organized, commented, and easy to extend? Or are they a monolithic regex wall?
- **Layer 1 → Layer 2 handoff**: Is the scoring from regex to behavioral signals well-calibrated? Are thresholds documented or magic numbers?
- **Layer 2 → Layer 3 handoff**: When does the system decide to call the LLM? Is the threshold configurable? Is it clear why some posts skip LLM verification?
- **LLM system prompt**: Read `src/background/system-prompt.js` — is the prompt well-structured? Does it clearly define what constitutes a parasitic lead magnet?
- **LLM response parsing**: Is the LLM response parsed robustly? What happens if the LLM returns unexpected formats?
- **DOM extraction**: Read `src/content/engine/dom-extractors.js` — is it resilient to LinkedIn DOM changes? Are selectors hardcoded or configurable?
- **Feed scanning**: Read `src/content/scanner/feed-scanner.js` — does it handle infinite scroll correctly? Does it debounce or throttle scans?
- **Auto-expand**: Read `src/content/scanner/auto-expand.js` — does it handle edge cases (already expanded, missing "see more" button)?

**Key files to read:**
- All files in `src/content/patterns/`
- All files in `src/content/engine/`
- All files in `src/content/scanner/`
- `src/background/system-prompt.js`
- `src/background/verify.js`

---

### Category 3 — Security

**What to check:**

- **XSS via LLM responses**: Is `escapeHTML` from `src/shared/sanitize.js` applied to ALL LLM output before `innerHTML` injection? Are there any code paths that bypass sanitization?
- **Content Security Policy**: Does `manifest.json` CSP restrict script sources appropriately? Is `unsafe-eval` or `unsafe-inline` present?
- **Message passing security**: Are `chrome.runtime.onMessage` handlers validating the sender? Could a malicious page send messages to the background script?
- **API key storage**: Are LLM API keys stored in `chrome.storage.local` (not `sync`)? Are they ever logged or exposed in error messages?
- **Host permissions**: Are the `host_permissions` in `manifest.json` minimal? Are there unnecessary origins?
- **MAIN world risks**: `debug.js` runs in MAIN world — does it expose any privileged APIs or data to the page context?
- **Input validation**: Is user input from the popup (settings, API keys) validated before storage?
- **External API calls**: Are LLM API calls using HTTPS? Are responses validated before processing?
- **innerHTML usage**: Search for ALL `innerHTML` assignments — each one is a potential XSS vector. Are they all safe?

**Key files to read:**
- `src/shared/sanitize.js`
- `manifest.json` (CSP, permissions)
- `src/background/index.js` (message handler)
- `src/debug/debug.js` (MAIN world exposure)
- `src/popup/popup.js` (settings handling)
- `src/content/ui/overlay-manager.js` (DOM injection)
- All files in `src/background/llm/`

---

### Category 4 — Performance

**What to check:**

**Content script performance:**
- Is the feed scanner using `MutationObserver` efficiently? Is it observing too much of the DOM tree?
- Are regex pattern matches running on every DOM mutation, or are they debounced/throttled?
- Is the overlay UI created lazily (only when needed) or eagerly for all posts?
- Are there memory leaks? (event listeners not cleaned up, references to detached DOM nodes, growing Maps/Sets)
- Does `auto-expand.js` cause layout thrashing by reading and writing DOM in tight loops?

**Background script performance:**
- Are LLM API calls queued or rate-limited? What happens if 20 posts trigger LLM verification simultaneously?
- Is there any caching of LLM results for duplicate/similar posts?
- Are API responses streamed or buffered? (streaming reduces time-to-first-result)

**Extension-wide:**
- Does the content script do unnecessary work on non-feed LinkedIn pages (profile, messaging, etc.)?
- Is `chrome.storage` accessed excessively? Are there reads that could be batched or cached in memory?
- Are there synchronous operations that block the main thread? (e.g., large regex on long post text)
- Does the build output size seem reasonable? Check for unnecessary code in the bundle.

**Key files to read:**
- `src/content/scanner/feed-scanner.js`
- `src/content/scanner/auto-expand.js`
- `src/content/engine/detection-engine.js`
- `src/content/ui/overlay-manager.js`
- `src/background/index.js`
- `src/background/verify.js`
- `build.js`

---

### Category 5 — Testing gaps

**What to check:**

- **Unit test coverage**: For every file in `src/content/engine/` and `src/content/patterns/`, is there a corresponding test? The CLAUDE.md states focus on regex patterns and detection scoring.
- **Critical paths without tests**: Are any of these untested?
  - Layer 1 regex pattern matching (false positives + false negatives)
  - Layer 2 behavioral signal scoring
  - Detection engine threshold logic
  - LLM response parsing (`parse-json` tests exist — are they comprehensive?)
  - LLM provider selection and routing
  - Sanitize function edge cases (XSS payloads)
  - Chrome storage wrapper functions
  - Message passing between content ↔ background
- **Mock correctness**: Are Chrome API mocks in `tests/setup.js` realistic? Do they cover `chrome.storage`, `chrome.runtime.sendMessage`, `chrome.runtime.onMessage`?
- **Edge case coverage**: Do tests cover the unhappy path? (malformed posts, empty text, LinkedIn DOM changes, LLM timeouts, invalid API keys)
- **DOM-dependent tests**: Are content script tests using jsdom effectively? Are LinkedIn DOM structures realistic in test fixtures?
- **Missing test files**: Compare `src/` files to `tests/` files — which modules lack any test coverage?

**Key files to read:**
- `tests/setup.js`
- All files in `tests/`
- Cross-reference with `src/content/engine/`, `src/content/patterns/`, `src/shared/`, `src/background/`

---

### Category 6 — Error handling

**What to check:**

- **Swallowed errors**: `catch(e) { }` or `catch(e) { return null; }` with no logging
- **Generic catches**: `catch(error) { throw new Error("Something went wrong"); }` without logging the original error
- **Missing try/catch**: Async functions that call LLM APIs, DOM operations, or `chrome.storage` without error handling
- **LLM failure resilience**: What happens when the LLM API returns an error, times out, or returns malformed JSON? Does the detection pipeline degrade gracefully (fall back to Layer 1+2 scores)?
- **DOM operation safety**: What happens when LinkedIn changes their DOM structure and selectors fail? Does the scanner crash or degrade gracefully?
- **Chrome API errors**: Are `chrome.runtime.lastError` checks in place for callback-based APIs? Are promise rejections from `chrome.storage` handled?
- **Console logging**: Are errors logged with the `[César]` prefix per the style guide? Is there enough context in error logs to debug issues?
- **User-facing errors**: When the popup shows errors (invalid API key, LLM failure), are messages actionable?
- **Feed scanner resilience**: If processing one post throws, does the scanner continue to the next post or crash entirely?

**Key files to read:**
- All files in `src/background/llm/`
- `src/background/verify.js`
- `src/background/index.js`
- `src/content/engine/detection-engine.js`
- `src/content/scanner/feed-scanner.js`
- `src/content/ui/overlay-manager.js`
- `src/shared/storage.js`
- `src/popup/popup.js`

---

### Category 7 — DX & modernization

**What to check:**

- **Build system**: Is `build.js` well-structured? Does it handle errors, report bundle sizes, support source maps for debugging?
- **Manifest V3 best practices**: Is the extension following current Manifest V3 best practices? Are there deprecated patterns?
- **esbuild configuration**: Is the esbuild config optimal? (tree-shaking, minification, target browser version)
- **Linting coverage**: Does ESLint catch Chrome extension-specific issues? Are there rules that enforce the `[César]` log prefix or prevent `innerHTML` without sanitization?
- **Dev workflow**: Is `npm run dev` (watch mode) fast and reliable? Does it rebuild only changed files?
- **Dependency audit**: Check `package.json` — are dev dependencies up to date? Are there unnecessary dependencies?
- **Dead code**: Are there exported functions, constants, or modules that are never imported anywhere?
- **Code duplication**: Are there repeated patterns across LLM providers that could share a common abstraction?
- **Configuration**: Are magic numbers (thresholds, timeouts, retry counts) extracted into `config.js` or hardcoded across files?
- **README / docs**: Is the README sufficient for a new contributor to understand, build, and test the extension?

**Key files to read:**
- `build.js`
- `package.json`
- `manifest.json`
- `src/content/config.js`
- ESLint config file (`.eslintrc.*` or `eslint.config.*`)
- `README.md`

---

## Step 3 — Output the full report

Structure the report exactly as follows:

---

### Executive summary

**Overall technical health score**: X/10

**Top 3 strengths**:
1. ...
2. ...
3. ...

**Top 5 most impactful issues** (must fix):
1. ...
2. ...
3. ...
4. ...
5. ...

**Estimated tech debt**: Low / Medium / High / Critical

---

### Detailed findings by category

#### Category 1 — Architecture & code organization
[All issues in the standard format]

#### Category 2 — Detection pipeline quality
[All issues in the standard format]

#### Category 3 — Security
[All issues in the standard format]

#### Category 4 — Performance
[All issues in the standard format]

#### Category 5 — Testing gaps
[All issues in the standard format]

#### Category 6 — Error handling
[All issues in the standard format]

#### Category 7 — DX & modernization
[All issues in the standard format]

---

### Prioritized action plan

#### Immediate (fix before next release)
- [ ] ...

#### Short-term (next sprint)
- [ ] ...

#### Medium-term (next quarter)
- [ ] ...

#### Long-term / architectural
- [ ] ...

---

### Full issue checklist

[Every issue as a markdown checkbox for progress tracking]

- [ ] [Category] [File:line] — [one-line description]

---

## Severity guide

| Severity | Meaning |
|----------|---------|
| **Critical** | XSS vulnerability, API key exposure, data leak, or extension-breaking bug |
| **High** | Significant detection accuracy issue, security weakness, or chronic performance problem |
| **Medium** | Noticeable quality issue affecting reliability, false positive rate, or developer velocity |
| **Low** | Polish / DX improvement — real but limited impact |

---

## Important constraints

- **Read-only**: Do not edit any files. Do not suggest making changes mid-audit. Complete the full audit first, then output the report.
- **Be specific**: Always cite exact file path and approximate line number. Findings without a location are not acceptable.
- **Be honest**: An honest 5/10 is more useful than a generous 8/10.
- **César context**: This is a Chrome Extension with a 3-layer detection pipeline. The most critical architectural concern is the clean separation of layers 1→2→3 and the security of LLM response injection into the DOM.
- **Security is non-negotiable**: Any finding that could enable XSS, API key leakage, or privilege escalation is always Critical.
- **Detection accuracy matters**: False positives degrade user trust. Pattern and threshold issues are always Medium or higher.
