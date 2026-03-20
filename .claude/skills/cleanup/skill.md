---
name: "cleanup"
description: "Codebase hygiene audit: finds dead code, stale artifacts (commented-out code, TODO/FIXME, debug leftovers), and unused npm dependencies across the whole repo. Reports all findings grouped by category, then fixes each confirmed group. Does NOT auto-fix anything — always asks before touching files."
---

# Codebase cleanup

You are a surgical codebase janitor. Your job is to find accumulated cruft — dead code, stale artifacts, and unused packages — across the entire César Chrome Extension codebase, report every finding in a structured table, then fix only what the user approves.

**Rule**: Complete ALL scans before reporting anything. Never fix anything before the user confirms.

---

## Phase 1 — Orientation

Read these files to understand the project structure:

1. `package.json` — extract the full `dependencies` and `devDependencies` lists
2. `manifest.json` — note entry points (content scripts, background service worker, popup)
3. `build.js` — understand what esbuild bundles and what gets copied verbatim
4. `.gitignore` — confirm which directories to skip
5. `CLAUDE.md` — review project conventions

**Excluded directories** (never scan these):
- `node_modules/`, `dist/`, `coverage/`, `.claude/`
- `store-assets/` — marketing assets, not application code

Then use Glob to build a full inventory of all `.js` files in scope (`src/`, `tests/`). Output the count:
> "Scanning N files across src/, tests/..."

---

## Phase 2 — Dead code scan

### 2a. Unused imports

Since César uses plain JavaScript (no TypeScript), scan manually:

For each `.js` file in `src/`:
- Extract all `import { ... } from '...'` and `import ... from '...'` statements
- For each imported symbol, search within the same file for usage beyond the import line
- Flag symbols that are imported but never referenced in the file body

**Note**: This is a heuristic for JS — be conservative. Skip re-exports (files that import and immediately export).

### 2b. Unused exports

For each file in `src/`:
- Extract all `export` statements: `export function`, `export const`, `export class`, `export default`, named exports in `export { ... }`
- For each exported symbol, grep the **entire codebase** (excluding the file itself and `node_modules/`) for that symbol name
- Flag symbols with zero external references as "potentially unused export"

**Confidence levels**:
- **High**: Symbol name is unique and appears only in its own file
- **Medium**: Symbol name is short/generic and might appear in string context — needs manual verification
- Skip: Generic names like `type`, `id`, `name`, `data`, `config` — too noisy to be reliable

Only report High and Medium confidence findings.

### 2c. Orphaned files

An orphaned file is one that no other file in the codebase imports from.

Use Grep to find all `import ... from '...'` statements across `src/`. Build a set of all referenced file paths (resolve relative paths).

Then compare against the full file list from Phase 1. Files not in the referenced set are candidates.

**Automatic exclusions** (these are valid entry points, never orphaned):
- `src/content/index.js` — esbuild content script entry point
- `src/background/index.js` — esbuild background service worker entry point
- `src/popup/popup.js` — esbuild popup entry point
- `src/debug/debug.js` — standalone MAIN world script (copied verbatim, not bundled)
- `build.js` — build script
- `tests/**` — test files (they import from src/, not the other way around)
- Config files: `vitest.config.*`, `eslint.config.*`, `prettier.config.*`

### 2d. Unreachable code

Grep for patterns indicating unreachable statements:
- A `return` or `throw` statement followed on the next non-empty, non-comment line by a non-`}` statement within the same function (same indentation level)

This is a heuristic — flag only high-confidence cases. If uncertain, skip.

---

## Phase 3 — Stale artifacts scan

### 3a. Commented-out code blocks

Grep across all `.js` files in `src/` for lines matching:
```
^\s*//.*[=({;]
```

This finds lines where a comment contains code-like characters. Then group consecutive such lines into blocks.

**Only flag** if:
- 2+ consecutive commented-out lines that look like code, OR
- A single line that is clearly a disabled function call or statement (e.g., `// const x = doSomething()`)

**Do NOT flag**:
- Single-line explanatory comments (e.g., `// This runs only on LinkedIn`)
- JSDoc-style comments (`/** ... */`)
- Comments that are clearly prose (no `=`, `(`, `{`, `;`)
- License headers
- Comments inside `tests/` — test files often have commented examples

### 3b. Stale TODO / FIXME / HACK / XXX markers

Grep across all `.js` files in `src/` and `tests/` for:
```
TODO|FIXME|HACK|XXX
```

Report every match with: file path, line number, full comment text.

**Note**: Do NOT auto-fix these. TODOs require human judgment. Report only.

### 3c. Debug console.* audit

Grep across `src/` for:
```
console\.(log|warn|error|debug|info)\(
```

Per project conventions, console logs in production code must be prefixed with `[César]`.

**Flag as issues**:
- `console.*` calls that do NOT include the `[César]` prefix
- `console.debug(` or `console.info(` calls — these are likely debug leftovers regardless of prefix

**Do NOT flag**:
- `console.log('[César]` / `console.warn('[César]` / `console.error('[César]` — these follow the project convention
- Any `console.*` in `tests/` — test files can use console freely
- Any `console.*` in `build.js` — build scripts can use console freely

---

## Phase 4 — Unused dependency scan

Extract every package from `package.json` `dependencies` and `devDependencies`.

For each package, grep the codebase:
- `import` or `require` statements referencing the package name in `src/`, `tests/`, and root config files
- Check config files: `build.js`, `vitest.config.*`, `eslint.config.*`, `prettier.config.*`

**Categories**:
- **Confirmed unused**: Zero references anywhere
- **Implicit / likely intentional**: Zero code references, but package is a known tool (ESLint, Prettier, build tool, test framework)

Examples of implicit packages: `esbuild` (used in build.js), `eslint`, `prettier`, `vitest`, `jsdom` (vitest environment), `@types/*`

Report both categories separately.

---

## Phase 5 — Report

Output the full findings report before asking the user to confirm any fixes.

Use this exact structure:

```
## Cleanup audit — [date]

### Summary
| Category | Issues found |
|---|---|
| Dead code | N |
| Stale artifacts | N |
| Unused dependencies | N |
| **Total** | **N** |

---

### Category 1: Dead code

#### 1a. Unused imports
| File | Line | Symbol | Confidence |
|---|---|---|---|
| src/content/... | 12 | fooHelper | High |

#### 1b. Unused exports
| File | Symbol | Type | Confidence | Note |
|---|---|---|---|---|

#### 1c. Orphaned files
| File | Reason |
|---|---|

#### 1d. Unreachable code
| File | Line | Preview |
|---|---|---|

---

### Category 2: Stale artifacts

#### 2a. Commented-out code blocks
| File | Lines | Preview |
|---|---|---|

#### 2b. TODO / FIXME / HACK / XXX markers
| File | Line | Comment |
|---|---|---|

#### 2c. Debug console.* issues
| File | Line | Statement | Issue |
|---|---|---|---|

---

### Category 3: Unused dependencies

#### Confirmed unused
- package-name

#### Implicit / verify manually
- package-name — reason (e.g., ESLint plugin, Vitest environment)
```

---

## Phase 6 — Confirm and fix

After outputting the full report, ask once per category:

**Dead code**:
> "Found N dead code issues. Options:
> - **Fix all** — remove unused imports, strip `export` from unused exports, list orphaned files for manual deletion
> - **Skip** — leave dead code untouched
> - **Show me each** — walk through each issue individually"

**Stale artifacts**:
> "Found N stale artifact issues. Options:
> - **Fix all** — remove commented-out code blocks and non-conforming console.* statements (TODOs are reported only, never auto-removed)
> - **Skip** — leave stale artifacts untouched
> - **Show me each** — walk through each issue individually"

**Unused dependencies**:
> "Found N confirmed-unused packages. I will NOT auto-remove these. Review the list and tell me which ones to uninstall, or run `npm uninstall <pkg>` yourself."
> (Never auto-run npm uninstall — always require explicit user instruction)

---

## Fix rules (apply only to confirmed categories)

| Finding | Fix |
|---|---|
| Unused import | Remove the import line entirely; if only some symbols from a multi-symbol import are unused, remove only those symbols |
| Unused export | Remove the `export` keyword; keep the declaration |
| Orphaned file | List file path; ask user to confirm deletion before touching |
| Unreachable code | Remove the unreachable statement(s); keep the `return`/`throw` |
| Commented-out code block (2+ lines or clear disabled statement) | Delete the comment block |
| Single-line TODO/FIXME | Never auto-remove — report only |
| Non-conforming console.* | Replace with `[César]`-prefixed version, or remove if it's a debug leftover — ask user |
| Debug-only console.debug/info | Remove the line |
| Unused npm package | Never auto-uninstall — report only |

**After applying fixes**, run:
```sh
npm run lint
npm run test
```
to confirm no regressions were introduced. If errors appear, show them and revert the specific change that caused them.

---

## Important constraints

- **Complete all scans before reporting**: Do not interleave partial results and fix prompts.
- **Conservative on orphaned files**: False positives here are costly. When uncertain whether a file is truly orphaned (e.g., dynamic imports, Chrome extension manifest references, esbuild entry points), mark it "verify manually" instead of "orphaned".
- **TODOs are human decisions**: Never delete a TODO/FIXME comment — only report them.
- **Packages require explicit approval**: Never run `npm uninstall` without a direct user instruction.
- **Preserve working code**: If removing a commented-out block and you're not 100% certain it's dead, skip it and note "unclear — skipped".
- **This is César**: A Chrome Extension with content scripts, a background service worker, and a popup. Respect the detection pipeline architecture — dead code in `src/content/engine/` or `src/background/` is more impactful to clean than dead code in the popup.
- **debug.js is standalone**: `src/debug/debug.js` runs in MAIN world and communicates via CustomEvents. It is NOT bundled by esbuild — it is copied verbatim. Do not flag its lack of imports/exports as dead code.
- **Console convention**: Production `console.log`/`warn`/`error` must use the `[César]` prefix per CLAUDE.md. Unprefixed calls are either bugs or debug leftovers.
