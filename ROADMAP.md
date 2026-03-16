# César Roadmap

This roadmap collects all ideas discussed during the initial build sessions and community feedback. Items are organized by theme and priority. Contributions welcome on any item.

## Status legend

- ✅ Done
- 🔨 In progress
- 📋 Planned
- 💡 Idea (needs discussion)

---

## Detection engine

### ✅ Shipped
- Two-axis detection model (third-party + gating CTA)
- 3-layer confidence scoring (regex 50% → behavioral 75% → LLM 99%)
- Comment bait analysis (emoji/keyword ratio in comments section)
- Public URL detection (GitHub repos, npm packages, official docs)
- Author-product mismatch (author doesn't work at mentioned company)
- Post structure fingerprint (hype intro → feature list → CTA at end)
- Auto-expand "voir plus" / "see more" for full text scanning
- MutationObserver re-scan when user manually expands a post

### 📋 Planned
- Cross-reference author LinkedIn profile with mentioned products (deeper than subtitle matching)
- Detect carousel/PDF posts where the gating is in the image, not the text
- Scan shared/reposted content (currently only scans original posts)
- Detect "link in first comment" patterns (scan comments for author's own link)
- Language expansion: DE, ES, PT, NL, IT regex patterns
- Detect gating via LinkedIn newsletters ("subscribe to get...")

### 💡 Ideas
- Image OCR on carousels to detect CTA text in images
- Detect "fake scarcity" patterns ("only 50 spots left", "I'm removing this tomorrow")
- Track post edit history — some authors add CTA after the post gains traction
- Sentiment analysis on comments to distinguish genuine engagement from bait responses
- Detect engagement pods (same accounts always commenting first)

---

## LLM integration

### ✅ Shipped
- Multi-LLM support: Anthropic (Haiku 4.5), OpenAI (GPT-5 mini), Google (Gemini 3 Flash), xAI (Grok 4.1 Fast)
- Auto-detect provider from API key prefix
- Prompt caching for Anthropic (cache_control: ephemeral)
- 4-strategy JSON parser with truncation repair
- Language-adaptive output (LLM responds in post language)
- Cleared badge when LLM determines post is legitimate
- Strengthened prompt to avoid false positives on original content

### 📋 Planned
- Web search integration (LLM uses web search to verify source URLs)
- Confidence calibration — compare LLM confidence with actual user feedback
- Prompt A/B testing framework to optimize false positive rate
- Support for local/self-hosted models (Ollama, LM Studio)

### 💡 Ideas
- Multi-LLM consensus — query 2 providers, flag only if both agree
- Fine-tuned micro-model specifically for parasitic detection (distilled from labeled data)
- LLM-powered "source finder" that returns the exact original URL

---

## User interface

### ✅ Shipped
- Dark blue badge with 3 states: pending (orange), flagged (red), cleared (green border)
- Reason text on its own line below header (no truncation)
- Collapsible comment section (purple toggle)
- Comment pre-fill in LinkedIn's comment box
- "Detected by César 🏛️" signature in generated comments
- Feedback buttons: Confirm / Partial / False positive
- Auto-fade on cleared badges (8s)
- Minimal popup with reveal settings panel
- API key guard on web search toggle

### 📋 Planned
- Badge position preference (top vs bottom of post)
- "Why was this flagged?" expandable explanation with layer breakdown
- Dark/light theme toggle for the badge
- Keyboard shortcuts (dismiss badge, copy comment, etc.)
- Badge counter in extension icon (like unread messages)

### 💡 Ideas
- Floating dashboard showing detection stats across sessions
- "César score" displayed next to author name on all their posts
- Mini-tutorial overlay on first install
- Customizable comment templates (user writes their own tone)
- Right-click context menu: "Analyze this post with César"

---

## Community & backend

### 📋 Planned (high priority)
- Backend API + database (Supabase) for storing detections
- Shared flagging: if 3+ users flag the same post, instant detection for all
- Recidivist leaderboard: most flagged accounts across all users
- Community-submitted source directory: "this post gates → this URL"
- Vote system: confirmed / false positive (improves scoring over time)
- Anonymous usage analytics (opt-in) to improve detection patterns

### 💡 Ideas
- Public API for researchers studying engagement bait on LinkedIn
- Browser-based community dashboard (like a subreddit for flagged posts)
- "César verified" badge for accounts that never gate others' content
- Integration with LinkedIn's own reporting system
- Webhook notifications when a recidivist posts new content
- Gamification: "sourceur" leaderboard for users who submit the most sources

---

## Distribution & growth

### 📋 Planned
- GitHub repository (public, open source)
- Chrome Web Store publication ($5 dev account, privacy policy, screenshots)
- LinkedIn announcement post (the growth loop)
- Landing page explaining the project

### 💡 Ideas
- Firefox support (WebExtension API — minimal changes needed)
- Edge Add-ons store publication
- Safari support (longer term, requires Xcode wrapper)
- "Powered by César" watermark on shared screenshots
- Referral system: "installed by X users from your network"
- Partnership with LinkedIn anti-spam/creator integrity initiatives
- Conference talks / meetup presentations on engagement bait detection
- Open dataset of labeled parasitic vs legitimate lead magnets

---

## Technical debt & quality

### 📋 Planned
- Comprehensive test suite (synthetic posts for each detection pattern)
- LinkedIn DOM selector monitoring (they change frequently)
- Error reporting system (opt-in, captures PARSE_ERROR and selector failures)
- Performance profiling (scan time per post, LLM latency)
- TypeScript migration (type safety on detection engine)

### 💡 Ideas
- Automated visual regression testing on badge UI
- CI/CD pipeline with Chrome extension packaging
- Canary deployment (test new patterns on 10% of users before full rollout)
- Extension size budget monitoring
- Memory leak detection (long-running MutationObserver)

---

## Contributing

Pick any item and open an issue or PR. The most impactful areas for new contributors are:

1. **Regex patterns** — add patterns for new languages or edge cases
2. **LinkedIn DOM selectors** — these break frequently and need community monitoring
3. **LLM prompt tuning** — help reduce false positives with real-world examples
4. **Testing** — scroll your feed with debug mode on and report what César gets right and wrong

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.
