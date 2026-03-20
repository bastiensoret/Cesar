# Privacy Policy

**César — Give back to César · Chrome Extension · Last updated: March 2026**

> **Summary:** César does not collect, store, or transmit any personal data. It has no backend server, no analytics, and no tracking. All processing happens locally in your browser.

## What César does

César is a Chrome extension that analyzes LinkedIn feed posts to detect "parasitic lead magnets" — posts that gate access to content the author did not create. It works by scanning the text visible in your LinkedIn feed using local regex patterns and behavioral heuristics.

## Data processed locally

César reads the text content of LinkedIn posts displayed in your feed. This text is processed entirely within your browser using pattern matching (Layer 1) and behavioral analysis (Layer 2). No data leaves your device for these layers.

## Optional AI verification (Layer 3)

If you choose to configure an API key, César will send the text of flagged posts to the LLM provider you selected for semantic analysis. This is entirely optional and requires you to:

- Provide your own API key (Anthropic, OpenAI, Google, or xAI)
- Explicitly enable AI verification

When AI verification is active, the post text and author name are sent directly from your browser to the LLM provider's API. César does not route this data through any intermediary server. The data handling is subject to your chosen provider's privacy policy.

## Data storage

César stores the following data locally in your browser using Chrome's `chrome.storage.local` API:

- Your API key (if provided)
- Your selected provider preference
- Extension settings (toggles, debug mode)
- Aggregate scan statistics (posts scanned count, posts flagged count)

This data never leaves your browser and is not accessible to any external service.

## Data collection

César does **not** collect:

- Personal information (name, email, profile data)
- Browsing history
- LinkedIn credentials or session tokens
- Analytics or usage telemetry
- Advertising identifiers

## Third-party services

César connects to third-party services only when you explicitly configure an API key for AI verification. The supported providers are:

- Anthropic API (api.anthropic.com)
- OpenAI API (api.openai.com)
- Google Generative Language API (generativelanguage.googleapis.com)
- xAI API (api.x.ai)

No data is sent to any of these services without your explicit action (configuring an API key and enabling AI verification).

## Permissions

César requests the following Chrome permissions:

- **storage**: To save your settings and API key locally
- **activeTab**: To access the LinkedIn tab where content is scanned
- **Host permissions for linkedin.com**: To inject the content script that scans posts
- **Host permissions for LLM APIs**: To send flagged posts for AI analysis (only used when an API key is configured)

## Open source

César is open source under the MIT license. You can inspect the complete source code to verify these privacy claims:

[github.com/bastiensoret/Cesar](https://github.com/bastiensoret/Cesar)

## Changes to this policy

If César ever introduces features that change how data is handled (such as a community backend for shared detections), this privacy policy will be updated and users will be notified through the extension's changelog.

## Contact

For questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/bastiensoret/Cesar/issues).

---

*César — Give back to César · v0.6.0 · MIT License*
