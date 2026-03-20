---
name: "commit"
description: "Safe commit with pre-audit. Use /commit instead of git commit directly. Scans staged changes for César-specific violations, runs the verification loop (test → lint), then creates a properly formatted commit."
user_invocable: true
---

# Safe commit

**Usage**: `/commit` or `/commit --fast`

- Default: runs the violation audit **and** the full verification loop (test → lint)
- `--fast`: runs the violation audit only, skips the verification loop — use when you have already run checks in this session

Run a full pre-commit audit before creating a commit. Never skip this — it catches the most common violations before they land in git history.

---

## Step 1 — See what's changing

```sh
git status
git diff --staged
```

List every staged file. If nothing is staged, ask the user what they want to commit before continuing.

---

## Step 2 — Scan staged files for the 7 violations

Read each staged file and check **all 7** items. Do not proceed to Step 3 if ANY violation is found.

### Violation 1 — Console log prefix

All `console.log`, `console.warn`, `console.error` calls in production code (`src/`) must be prefixed with `[César]`.

- ❌ `console.log('something happened')`
- ❌ `console.log("Detection complete")`
- ✅ `console.log('[César] Detection complete')`
- ✅ `console.log('%c[César] LLM error', 'color: #ff4757')`
- Exception: `debug.js` — it runs in MAIN world and may use its own format
- Exception: `console.log` inside a `CONFIG.DEBUG` guard is acceptable but must still use the `[César]` prefix

### Violation 2 — XSS / innerHTML without escaping

Search for `innerHTML` assignments that interpolate variables containing LLM responses or user-generated text without using `escapeHTML()` from `src/shared/sanitize.js`.

- ❌ `el.innerHTML = llmResponse`
- ❌ `el.innerHTML = \`<p>${data.text}</p>\``  (where `data` comes from LLM or external input)
- ✅ `el.innerHTML = \`<p>${escapeHTML(data.text)}</p>\``
- ✅ `el.innerHTML = \`<svg>...</svg>\``  (static HTML templates with no dynamic data are fine)
- ✅ `btn.innerHTML = \`${ICONS.check} Confirmed\``  (internal constants are fine)

If `escapeHTML` is used but not imported, that's also a violation.

### Violation 3 — debug.js isolation

`src/debug/debug.js` runs in MAIN world and must stay standalone — no `import` or `require` statements.

- ❌ `import { something } from '../shared/utils.js'`
- ❌ `const x = require('./foo')`
- ✅ All code self-contained within the file

If an `import` is added to `debug.js`, **stop** — this will break the extension.

### Violation 4 — Direct chrome.storage calls

Search for direct `chrome.storage.local` or `chrome.storage.sync` calls outside of `src/shared/storage.js`.

- ❌ `chrome.storage.local.get(...)` in `src/content/` or `src/background/`
- ❌ `chrome.storage.sync.set(...)` in `src/popup/popup.js`
- ✅ `import { getStorage, setStorage } from '../shared/storage.js'` then use the wrappers
- Exception: `src/shared/storage.js` itself (the wrapper implementation)

### Violation 5 — External runtime dependencies

Check if `package.json` is staged and if any new `dependencies` (not `devDependencies`) have been added.

- ❌ Adding `"axios": "^1.0.0"` to `dependencies`
- ❌ Adding any npm package to `dependencies`
- ✅ Adding packages to `devDependencies` (build tools, testing, linting)
- ✅ Using `fetch()` for HTTP calls

César uses zero runtime dependencies — all LLM calls use native `fetch`.

### Violation 6 — Hardcoded secrets

Search for patterns that look like API keys or secrets in staged `.js` files.

- ❌ `const API_KEY = 'sk-ant-...'` or any hardcoded key
- ❌ `Authorization: 'Bearer sk-...'` with a literal key
- ✅ API keys read from `chrome.storage` (user provides their own key via popup)

### Violation 7 — Manifest version consistency

If `manifest.json` is staged, verify:

- The `version` field has been updated if the change warrants it (new features or fixes)
- The `version` in `package.json` matches `manifest.json` if both are staged
- No new `permissions` or `host_permissions` have been added without clear justification

If permissions were added, ask the user to confirm they are necessary — Chrome Web Store reviews flag unnecessary permissions.

---

## Step 3 — Report violations or proceed

**If violations found**: List each violation with file name, line number, and exact fix required. Do NOT continue to Step 4. Ask the user to fix them first (or offer to fix them).

**If clean**: Report "Pre-commit audit passed. Running verification loop..."

---

## Step 4 — Verification loop

**If `--fast` was passed**: skip this step entirely and go to Step 5.

Run these in order. Stop immediately if any fails.

```sh
npm run test
```

```sh
npm run lint
```

If any command fails, show the error output and stop. Fix the issue before committing.

---

## Step 5 — Create the commit

Stage specific files (never `git add -A` or `git add .`):

```sh
git add <specific files>
```

Draft a commit message:
- First line: imperative mood, under 72 chars (e.g., `feat(detection): add carousel post pattern matching`)
- Focus on the "why", not the "what"
- Prefix: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`
- Common scopes: `detection`, `overlay`, `popup`, `llm`, `scanner`, `patterns`, `build`, `debug`

Create the commit with the Co-Authored-By trailer:

```sh
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Confirm success with `git status`.

---

## Key reminders

- Never use `--no-verify` to skip hooks
- Never amend a published commit
- Never force-push to `main`
- Never commit `.env` files or API keys
- Never use `git add -A` or `git add .`
