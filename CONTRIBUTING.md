# Contributing to César

Thanks for your interest in fighting parasitic lead magnets on LinkedIn! Here's how to contribute.

## Quick start

```bash
git clone https://github.com/bastiensoret/Cesar.git
cd Cesar
npm install
npm run build
```

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder
4. Go to linkedin.com and scroll your feed

## How to contribute

### Report a bug or false positive
Open an issue with:
- Screenshot of the badge (or lack thereof)
- Screenshot of the console logs (F12, filter on `[César]`)
- Your verdict: was César right or wrong?
- The post URL if possible

### Add regex patterns
The detection patterns live in `src/content/` in the `THIRD_PARTY_PATTERNS` and `GATING_CTA_PATTERNS` arrays. To add a new pattern:

1. Identify a recurring CTA or third-party attribution phrase
2. Write a regex that matches it (test on regex101.com first)
3. Add it to the appropriate array with an English `label` and appropriate `weight`
4. Test with `__cesar.test("your test text")` in the console
5. Submit a PR with before/after screenshots

### Fix LinkedIn DOM selectors
LinkedIn changes their DOM structure frequently. If César stops detecting posts:

1. Open DevTools on LinkedIn
2. Inspect the post structure and find the new selectors
3. Update the selectors in `src/content/` (search for `querySelector`)
4. Test that scanning works again
5. Submit a PR

### Improve the LLM prompt
The system prompt lives in `src/background/` in the `SYSTEM_PROMPT` constant. If you find a false positive or false negative with AI enabled:

1. Share the post text and the LLM's response
2. Suggest a prompt modification that would fix it
3. Test with at least 5 other posts to make sure it doesn't break existing cases

### Add a new language
Currently César detects FR and EN patterns. To add a new language:

1. Add patterns to `THIRD_PARTY_PATTERNS` (how people reference third-party content in that language)
2. Add patterns to `GATING_CTA_PATTERNS` (how people gate content in that language)
3. Test on real LinkedIn posts in that language
4. Update the README with the new supported language

## Code structure

| Directory | Purpose |
|-----------|---------|
| `src/content/` | Content script — detection engine + overlay injection |
| `src/background/` | Service worker — LLM API routing + prompt caching |
| `src/popup/` | Extension popup UI (HTML + CSS + JS) |
| `src/debug/` | MAIN world bridge for console debugging |
| `src/shared/` | Shared utilities (storage, sanitization) |
| `static/` | Icons and CSS copied to dist/ as-is |
| `tests/` | Vitest unit tests with jsdom |

## Coding conventions

- All static UI text in English
- LLM-generated content adapts to post language
- Pattern labels in English
- Console logs prefixed with `[César]`
- No external runtime dependencies — fetch-only for LLM calls
- Run `npm run lint` and `npm run test` before committing

## Pull request process

1. Fork the repo and create a feature branch (`git checkout -b feature/my-feature`)
2. Make your changes
3. Test on your LinkedIn feed with debug mode on
4. Commit with a clear message describing what changed
5. Open a PR with:
   - What you changed and why
   - Screenshots if UI-related
   - Test results (posts tested, verdicts)

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Be respectful, constructive, and focused on making LinkedIn a better place.
