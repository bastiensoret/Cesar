const LLM_TIMEOUT_MS = 15000;

/**
 * Fetch with timeout to prevent hanging LLM calls.
 */
export async function fetchWithTimeout(url, options, timeoutMs = LLM_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function handleAPIError(response) {
  const err = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('INVALID_API_KEY');
  if (response.status === 429) throw new Error('RATE_LIMITED');
  throw new Error(`API_ERROR_${response.status}: ${err.error?.message || 'Unknown'}`);
}

export function parseJSON(text) {
  try {
    // Strategy 1: Direct parse
    return JSON.parse(text.trim());
  } catch (_e1) {
    try {
      // Strategy 2: Strip markdown fences
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return JSON.parse(clean);
    } catch (_e2) {
      // Strategy 3: Extract JSON object from anywhere in the text
      try {
        const jsonMatch3 = text.match(/\{[\s\S]*\}/);
        if (jsonMatch3) {
          return JSON.parse(jsonMatch3[0]);
        }
      } catch (_e3) {
        // Strategy 3 found a match but it wasn't valid JSON
      }

      // Strategy 4: Try to fix truncated JSON (missing closing brace/quotes)
      try {
        const jsonMatch4 = text.match(/\{[\s\S]*/);
        if (jsonMatch4) {
          let partial = jsonMatch4[0];
          const quoteCount = (partial.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) partial += '"';
          if (!partial.trim().endsWith('}')) partial += '}';
          return JSON.parse(partial);
        }
      } catch (_e4) {
        // All strategies failed
      }

      console.error(
        '[César] Failed to parse LLM response (all strategies):',
        text.substring(0, 500)
      );
      throw new Error('PARSE_ERROR: ' + text.substring(0, 200));
    }
  }
}
