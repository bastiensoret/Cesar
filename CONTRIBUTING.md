# Contributing to César

Thanks for your interest in fighting parasitic lead magnets on LinkedIn! Here's how to contribute.

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/cesar-extension.git
cd cesar-extension
```

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the repo folder
4. Go to linkedin.com and scroll your feed

## How to contribute

### Report a bug or false positive
Open an issue with:
- Screenshot of the badge (or lack thereof)
- Screenshot of the console logs (F12, filter on `[César]`)
- Your verdict: was César right or wrong?
- The post URL if possible

### Add regex patterns
The detection patterns live in `content.js` in the `THIRD_PARTY_PATTERNS` and `GATING_CTA_PATTERNS` arrays. To add a new pattern:

1. Identify a recurring CTA or third-party attribution phrase
2. Write a regex that matches it (test on regex101.com first)
3. Add it to the appropriate array with an English `label` and appropriate `weight`
4. Test with `__cesar.test("your test text")` in the console
5. Submit a PR with before/after screenshots

### Fix LinkedIn DOM selectors
LinkedIn changes their DOM structure frequently. If César stops detecting posts:

1. Open DevTools on LinkedIn
2. Inspect the post structure and find the new selectors
3. Update the selectors in `content.js` (search for `querySelector`)
4. Test that scanning works again
5. Submit a PR

### Improve the LLM prompt
The system prompt lives in `background.js` in the `SYSTEM_PROMPT` constant. If you find a false positive or false negative with AI enabled:

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

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome Extension Manifest V3 config |
| `content.js` | Detection engine + overlay injection (the main file) |
| `overlay.css` | Dark blue badge styles |
| `background.js` | Service worker — LLM API routing + prompt caching |
| `debug.js` | MAIN world bridge for console debugging |
| `popup.html` | Extension popup UI |
| `popup.js` | Popup logic (settings, API key, toggles) |

## Coding conventions

- All static UI text in English
- LLM-generated content adapts to post language
- Pattern labels in English
- Console logs prefixed with `[César]`
- No external dependencies in the extension (no npm, no build step)
- Test with `node -c filename.js` before committing

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
