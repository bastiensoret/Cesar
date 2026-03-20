# César — Give back to César

> A Chrome extension that detects parasitic lead magnets on LinkedIn — posts that gate access to content the author didn't create.

## The problem

Some LinkedIn "creators" take official documentation, open-source projects, or public tutorials, repackage them in a post, then hide the link behind engagement bait: *"Comment 🔥 and I'll send you the resource!"*

The link is public. The content isn't theirs. They're farming engagement on someone else's work.

**César detects these posts and helps you share the original source directly.**

## How it works

César uses a 3-layer confidence scoring model:

### Layer 1 — Regex pattern matching (max 50%)

Scans every post in your feed for two combined signals:
- **Third-party attribution**: the post references a product, tool, or project created by someone else
- **Gating CTA**: the post gates access behind comments, DMs, likes, or follows

Both axes must fire. A post that gates its own content (legitimate lead magnet) is not flagged.

### Layer 2 — Behavioral signals (max 75%)

Four heuristics that don't require AI:

| Signal | What it detects | Max points |
|--------|----------------|------------|
| **Comment bait** | 60%+ of comments are single emojis/keywords (🔥, "interested", "me") | +15 |
| **Public URL** | Post mentions a GitHub repo, npm package, or official docs site | +10 |
| **Author mismatch** | Author mentions Google but doesn't work at Google | +10 |
| **Post structure** | Hype intro → feature list → CTA hidden at end | +5 |

### Layer 3 — LLM verification (max 99%)

If an API key is configured, posts above 30% are sent to an LLM that answers the real question: *"Did the author create this content, or just repackage something public?"*

The LLM also generates a suggested comment with the original source and the César signature.

### Threshold logic

| Score | Without API key | With API key |
|-------|----------------|--------------|
| < 30% | Ignored | Ignored |
| 30-49% | Nothing shown | LLM must confirm (pending badge) |
| 50-75% | Badge shown (capped) | Badge shown + LLM enriches |
| 75-99% | — | Only reachable with LLM confirmation |

## Supported LLM providers

| Provider | Model | Cost (per 1M tokens) | Key prefix |
|----------|-------|---------------------|------------|
| Anthropic | Haiku 4.5 | $1 / $5 | `sk-ant-` |
| OpenAI | GPT-5 mini | $0.25 / $2 | `sk-` |
| Google | Gemini 3 Flash | $0.50 / $3 | `AIza` |
| xAI | Grok 4.1 Fast | $0.20 / $0.50 | `xai-` |

The provider is auto-detected from the API key prefix. Prompt caching is enabled for Anthropic (saves ~90% on repeated calls).

## Installation

### From source (developer mode)

```bash
git clone https://github.com/bastiensoret/Cesar.git
cd Cesar
npm install
npm run build
```

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Go to [linkedin.com/feed](https://www.linkedin.com/feed/) and scroll

### Configuration (optional)

Click the César icon in the Chrome toolbar:

1. Toggle **Web search** if you want AI-powered source lookup (requires API key)
2. Open **Settings** → select your provider → paste your API key
3. The provider is auto-detected from the key prefix

Without an API key, César works in regex-only mode (capped at 75%).

## Architecture

```
Cesar/
├── manifest.json          # Chrome Extension Manifest V3
├── build.js               # esbuild bundler (dev/build/package)
├── src/
│   ├── content/           # Content script — detection engine + overlay injection
│   ├── background/        # Service worker — multi-LLM API routing + prompt caching
│   ├── popup/             # Extension popup UI (HTML + CSS + JS)
│   ├── debug/             # MAIN world bridge for console debugging
│   └── shared/            # Utilities shared across modules
├── static/
│   ├── icons/             # Extension icons (16, 48, 128)
│   └── overlay.css        # Dark blue badge styles
├── store-assets/          # Chrome Web Store assets (screenshots, promo tile)
├── tests/                 # Vitest unit tests with jsdom
└── dist/                  # Build output (gitignored)
```

### Key design decisions

- **Manifest V3**: content scripts run in isolated world, `debug.js` runs in MAIN world for console access
- **No backend**: all API calls go directly from the extension to LLM providers. No server to maintain.
- **Prompt caching**: Anthropic's `cache_control: ephemeral` caches the system prompt across calls
- **Two-axis detection**: a post must have BOTH a gating CTA AND a third-party reference to be flagged
- **Layered scoring**: regex alone can never say "parasitic" — it can only say "suspicious"

## Badge UI

When a post is flagged, César injects a dark blue badge with:

- **Header**: César name + reason (truncated 40 chars) + confidence % + AI/no-AI badge
- **Detail rows**: what's gated + original source (LLM mode) or detection signals (regex mode)
- **Comment section** (LLM mode, collapsible): pre-generated comment with source + "Detected by César 🏛️" signature
- **Feedback buttons**: Confirm / Partial / False positive

The badge appears at the bottom of the post — you read the post first, then see the verdict.

## Debug

Open Chrome DevTools console (F12) on LinkedIn:

```javascript
// Enable debug logging
__cesar.enableDebug()

// Force re-scan all posts
__cesar.rescan()

// Test regex detection on a text string
__cesar.test("Google just released something amazing! Comment 🔥 and I'll send you the link")

// View scan stats
__cesar.stats()
```

Debug logs show the full layer breakdown:
```
[César] L2 Score: 62% (cap 75% (no AI)) | Major company launch mentioned + Asks to comment an emoji
  L1 regex: TP=65 CTA=80 → 36%
  L2 behavioral: +26pts → comments +15, public URL +10, mismatch +10
```

## Roadmap

### Next up
- [ ] Web search integration (LLM with internet access for verified source URLs)

### Community features
- [ ] Backend + database for storing detections
- [ ] Recidivist leaderboard (most flagged accounts)
- [ ] Community-submitted source directory
- [ ] Shared flagging (if 3+ users flag same post, instant detection)

### Platform expansion
- [ ] Firefox support (WebExtension API)
- [ ] Landing page
- [ ] LinkedIn post template for spreading awareness

## Contributing

This is an open-source community tool. Contributions welcome:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Test on your LinkedIn feed
4. Submit a PR with before/after screenshots

### Areas where help is most needed
- **Regex patterns**: more languages (DE, ES, PT, NL), edge cases
- **LinkedIn DOM selectors**: these break frequently, need monitoring
- **LLM prompt tuning**: reducing false positives on legitimate lead magnets
- **Comment pre-fill**: LinkedIn's contenteditable is fragile, needs robust injection

## License

MIT — Give back to César ⚡
