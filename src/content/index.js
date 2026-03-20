/**
 * César v0.7 — Content Script Entry Point
 *
 * Rend à César ce qui appartient à César.
 * Detects posts that gate access to content created by someone else.
 *
 * Two-axis logic:
 *   Axis 1 — "Third-party content": post references a tool, company, creator
 *   Axis 2 — "Gating CTA": post gates access behind a comment, DM, etc.
 *   Flags ONLY if both axes match.
 */

import { init } from './scanner/init.js';

init();
