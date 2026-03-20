---
name: "ui-audit"
description: "Comprehensive UI/UX audit of the César Chrome Extension. Covers popup UI, LinkedIn overlay UI, visual consistency, interaction design, accessibility, responsive behavior, typography, error states, and micro-interactions. Does NOT make changes — only analyzes and reports. Use when you want to find UI/UX issues, inconsistencies, or polish gaps across the extension."
---

# UI/UX Audit — César Chrome Extension

You are a senior UI/UX auditor with deep knowledge of Chrome Extension design and the César codebase conventions. Your job is to perform a comprehensive audit of all user-facing UI across the extension. **Do NOT make any changes** — only analyze and report.

---

## César-specific conventions to check against

Before running the generic framework, verify every file against these project-specific rules. Violations here are always **Major** or **Critical**.

### Color system (dark theme)
- ✅ Background: `#0c0c18` (darkest), `#13132a` (cards/panels), `#1a1a2e`–`#16213e` (overlays)
- ✅ Text: `#e8e8ee` (primary), `#c0c0d0` (secondary), `#606078` (tertiary/labels)
- ✅ Accents: Green `#7bc47b` (active/success), Red `#ff4757` (high severity/alert), Orange `#ffa502` (medium severity/warning), Blue `#3742fa` (low severity/info)
- ✅ Borders: `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.1)` (subtle)
- ❌ Colors outside this palette without clear justification
- ❌ Hardcoded colors that duplicate palette values with slight variations

### Severity border colors (overlays)
- ✅ High → `#ff4757` (red), Medium → `#ffa502` (orange), Low → `#3742fa` (blue)
- ❌ Any severity indicator using a color outside this mapping
- ❌ Missing severity class on flagged overlays

### Console logging prefix
- ✅ All `console.log`, `console.warn`, `console.error` prefixed with `[César]`
- ❌ Bare `console.log("something")` without the `[César]` prefix
- Exception: `tests/` directory may use bare console statements

### HTML escaping before innerHTML
- ✅ All dynamic content passed through `escapeHTML()` from `src/shared/sanitize.js` before `innerHTML`
- ❌ Any `innerHTML` assignment with unescaped dynamic content (this is **Critical** — XSS vector)
- Exception: Static HTML templates with no dynamic interpolation

### Icon consistency
- ✅ All inline SVG icons use `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`
- ✅ Icons sourced from `src/content/ui/icons.js` ICONS object
- ❌ Inline SVG with different viewBox, stroke-width, or fill approach
- ❌ Hardcoded SVG strings duplicated outside `icons.js`

### CSS class naming (overlays)
- ✅ Overlay classes prefixed with `sourceit-` (legacy naming, maintained for consistency)
- ❌ New overlay classes without the `sourceit-` prefix
- ❌ Mixing `sourceit-` prefixed and unprefixed classes for overlay elements

### State management via classes
- ✅ `.sourceit-hidden` for visibility toggling on overlays
- ✅ `.sourceit-collapsed` for collapsible sections
- ✅ `.open` for popup reveal menu
- ❌ Inline `style.display = 'none'` when a CSS class would be more maintainable
- Exception: Temporary one-shot visual feedback (button color flash on copy) may use inline styles

### Font stack
- ✅ System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- ❌ Custom web fonts or missing fallbacks
- ❌ Different font stacks across popup vs overlay

### No external runtime dependencies
- ✅ Vanilla JS, vanilla CSS — no frameworks, no external CSS libraries
- ❌ Any CDN link, external stylesheet, or runtime JS dependency
- Exception: Dev dependencies in `package.json` (build tools, test frameworks)

---

## Step 1 — Map all UI surfaces and components

Before auditing, build a complete inventory. Use Glob and Grep to list:

**Popup UI:**
```
src/popup/popup.html    — extension popup markup
src/popup/popup.css     — popup styling
src/popup/popup.js      — popup interaction logic
```

**Overlay UI (injected into LinkedIn):**
```
static/overlay.css                      — overlay styling
src/content/ui/overlay-manager.js       — overlay creation and DOM injection
src/content/ui/icons.js                 — centralized SVG icon definitions
src/content/ui/comment-prefill.js       — comment box pre-fill UI interaction
```

**Debug UI:**
```
src/debug/debug.js      — developer API exposed in MAIN world
```

**Static assets:**
```
static/icons/           — extension toolbar icons (16, 48, 128px PNGs)
static/overlay.css      — copied to dist/ as-is
```

**Manifest (UI declarations):**
```
manifest.json           — popup page, content script CSS injection, icon declarations
```

For each file, note:
- Its UI role
- Key visual patterns and interactions
- Where it appears to the user (popup, LinkedIn feed, dev console)

Output this inventory first so the user can see the audit scope.

---

## Step 2 — Systematic audit

Audit every UI file against the 10 categories below. Be specific: reference file paths and line numbers. Do not be generous — rate honestly.

For each issue found, report in this format:

```
**[Category] — Severity: Critical | Major | Minor | Nitpick**
- **Where**: `src/path/to/file.js:42`
- **Issue**: What's wrong (be specific, quote the code if helpful)
- **Why it matters**: User impact
- **Fix**: Concrete, actionable recommendation
```

---

### Category 1 — Visual hierarchy & layout

- Is there a clear content hierarchy in the popup (header → main content → settings → footer)?
- Are primary actions (enable/disable toggle, parasite count) visually dominant over secondary ones (settings, API key)?
- Is whitespace used intentionally in both popup and overlay, or is the UI cramped?
- Does the overlay maintain a consistent card layout across severity levels?
- **César-specific**: Does the popup follow a logical flow: status → data → settings?
- **César-specific**: Does the overlay badge hierarchy (header → body → details → actions) maintain clear visual separation?
- **César-specific**: Are severity indicators (border color, badge) immediately scannable without reading the text?

### Category 2 — Consistency & design system adherence

- Are colors, fonts, spacing, border-radius, and shadows used consistently across popup and overlay?
- Are similar elements (buttons, toggles, badges) styled the same way across both UI surfaces?
- Are there orphaned or one-off CSS rules that break consistency?
- Is the dark theme palette applied consistently?
- **César-specific**: Check for colors outside the defined palette
- **César-specific**: Check that all icons follow the 16×16 viewBox / currentColor / 1.5 stroke convention
- **César-specific**: Check for `sourceit-` prefix consistency on overlay classes
- **César-specific**: Check that system font stack is identical in popup and overlay

### Category 3 — Interaction design & feedback

- Does every clickable element have a visible hover/focus/active state?
- Are loading states handled? (pending overlay with pulse animation while LLM processes)
- Are success states designed? (cleared overlay with green check when post is legitimate)
- Are error states handled? (what happens when LLM verification fails?)
- Do the popup toggles provide immediate visual feedback on state change?
- Are destructive or important actions (dismiss overlay, post comment) guarded?
- **César-specific**: Does the pending overlay (`injectPendingOverlay`) give clear feedback that analysis is in progress?
- **César-specific**: Does the cleared overlay (`injectClearedOverlay`) auto-fade after `CLEARED_FADE_DELAY` (8s)?
- **César-specific**: Do confirm/partial/false-positive buttons update visually after click (disabled state, color change)?
- **César-specific**: Does the copy button show feedback (green check → revert after 2s)?
- **César-specific**: Does the comment toggle (expand/collapse) animate smoothly?

### Category 4 — Accessibility (WCAG 2.1 AA)

- Do all interactive elements have accessible names (aria-label, aria-labelledby, or visible text)?
- Is color contrast sufficient? (4.5:1 for normal text, 3:1 for large text/UI against `#0c0c18`/`#13132a` backgrounds)
- Is the popup fully keyboard-navigable with visible focus indicators?
- Are overlay buttons keyboard-accessible when injected into LinkedIn?
- Do form inputs in the popup have associated `<label>` elements (not just placeholders)?
- Are ARIA roles appropriate? (e.g., toggle switches should be `role="switch"`)
- Are SVG icons decorative (hidden from AT) or informative (with title/desc)?
- **César-specific**: Are the custom toggle switches in the popup accessible? Hidden checkbox pattern must preserve keyboard interaction and screen reader announcements
- **César-specific**: Is the settings reveal/collapse keyboard-operable and announced?
- **César-specific**: Do severity badges convey severity to screen readers (not just via color)?

### Category 5 — Responsive design & viewport adaptation

- Does the popup render correctly at its fixed 300px width?
- Does the overlay adapt to different LinkedIn feed widths (narrow sidebar vs full-width)?
- Are overlay elements readable when LinkedIn is in different viewport configurations?
- Does the popup handle long API keys or long provider names without overflow?
- **César-specific**: Does the popup handle text overflow in the parasite count display?
- **César-specific**: Does the overlay handle very long LLM-generated comment drafts without breaking layout?
- **César-specific**: Does the overlay handle very long post analysis text (many patterns detected)?

### Category 6 — Typography & readability

- Is there sufficient contrast for all text elements against dark backgrounds?
- Are font sizes readable? (min 12px for labels, 14px+ for body text)
- Is there sufficient line-height (1.4–1.6 for body text)?
- Is the font scale limited and intentional? (not random sizes)
- Are text truncation and wrapping handled consistently?
- **César-specific**: Is the severity badge text readable at its small size?
- **César-specific**: Is the LLM analysis text in the overlay body readable at its size and line-height?
- **César-specific**: Is the comment draft text area readable and scannable?

### Category 7 — Navigation & information architecture

- Can users always tell the extension's state? (enabled/disabled, analyzing, found parasites)
- Is the popup settings section discoverable but not overwhelming?
- Can users dismiss overlays easily and understand what the dismiss action does?
- Are overlay actions (confirm, partial, false positive) clearly labeled with their meaning?
- **César-specific**: Is the settings reveal button clearly a toggle? Does it indicate open/closed state?
- **César-specific**: Does the parasite count in the popup update in real-time (2s polling)?
- **César-specific**: Is the LLM provider selection intuitive (dropdown with current value visible)?

### Category 8 — Performance UX

- Does the pending overlay appear quickly after detection starts (no blank delay)?
- Does the pulse animation on pending overlays perform well (GPU-accelerated)?
- Does the cleared overlay fade-out use CSS transitions (not JS animation)?
- Are overlay inject/remove operations smooth without layout shifts in the LinkedIn feed?
- **César-specific**: Does injecting overlays into the LinkedIn feed cause visible jank or layout shifts?
- **César-specific**: Does the popup's 2s storage polling cause any visible flicker on update?
- **César-specific**: Are CSS transitions used for all state changes (collapse, reveal, fade)?

### Category 9 — Error handling & edge cases

- What does the popup show when no API key is configured?
- What does the overlay show when LLM verification fails or times out?
- What happens if the extension is disabled while overlays are visible?
- What happens with very long or very short post text in the overlay?
- Are empty states handled? (zero parasites detected, no data yet)
- **César-specific**: Does the popup show a meaningful state when `cesar_stats` is empty/undefined?
- **César-specific**: What happens if `escapeHTML` receives null/undefined?
- **César-specific**: What does the overlay display when the LLM returns an empty or malformed response?
- **César-specific**: Does the comment prefill fail gracefully when LinkedIn's DOM structure changes?

### Category 10 — Micro-interactions & polish

- Are transitions/animations smooth, purposeful, and not distracting?
- Are all animations respecting `prefers-reduced-motion`?
- Is the slide-in animation on overlay injection smooth (slideIn 0.3s)?
- Are icons consistent in style, size, and color inheritance?
- Is copy concise and action-oriented across all UI text?
- **César-specific**: Does the overlay `slideIn` keyframe animation feel natural?
- **César-specific**: Does the pending `pulse` animation clearly communicate "in progress" without being annoying?
- **César-specific**: Are button state transitions (copy → check → revert) smooth?
- **César-specific**: Check for bare `console.log` / `console.warn` / `console.error` without `[César]` prefix (debug code left in production)
- **César-specific**: Check that all `transition` properties in CSS cover the right properties (not just `all` which can cause unexpected transitions)

---

## Step 3 — Output the full report

Structure the report as follows:

---

### Executive summary

**Overall score**: X/10

**Top 3 strengths**:
1. ...
2. ...
3. ...

**Top 5 most impactful issues**:
1. ...
2. ...
3. ...
4. ...
5. ...

---

### Detailed findings

[All issues in the format above, grouped by category]

---

### Prioritized action plan

#### Quick wins (< 30 min each)
- [ ] ...

#### Medium effort (1–4 hrs each)
- [ ] ...

#### Larger refactors
- [ ] ...

---

### Full issue checklist

[Every issue as a markdown checkbox — one per line — for progress tracking]

- [ ] [Category] [File:line] — [one-line description]

---

## Severity guide

| Severity | Meaning |
|----------|---------|
| **Critical** | XSS via innerHTML, accessibility barrier that prevents use, broken UI in primary flow |
| **Major** | Noticeable UX problem, missing feedback for common action, color palette violation, accessibility WCAG AA failure |
| **Minor** | Inconsistency, suboptimal spacing, minor polish gap — real but limited user impact |
| **Nitpick** | Style preference, micro-optimization — fix if touching the file anyway |

---

## Important constraints

- **Read-only**: Do not edit any files. Do not suggest making changes mid-audit. Complete the full audit first.
- **Be specific**: Always cite file path and approximate line number. Vague findings ("the UI feels cluttered") without a specific location are not acceptable.
- **Be honest**: Do not inflate the score. An honest 5/10 is more useful than a generous 8/10.
- **César conventions first**: Violations of project-specific rules (color palette, icon format, sourceit- prefix, escapeHTML, [César] log prefix) are always surfaced — they are not optional style preferences, they are enforced conventions.
- **No false positives**: The overlay CSS uses `sourceit-` prefix (legacy naming from the original "SourceIt" project name) — this is intentional, not a bug.
- **Two UI surfaces**: The popup and the LinkedIn overlay are separate UI surfaces with separate CSS files. Consistency between them matters, but they serve different contexts (extension chrome vs page injection).
- **Security is non-negotiable**: Any innerHTML assignment with unescaped dynamic content is always Critical. The overlay injects into a third-party page (LinkedIn) — XSS here could compromise the user's LinkedIn session.
