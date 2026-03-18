import { SYSTEM_PROMPT } from '../system-prompt.js';
import { fetchWithTimeout, handleAPIError, parseJSON } from '../utils.js';

const LLM_MAX_TOKENS = 800;

export async function callGemini(apiKey, model, userMessage) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: LLM_MAX_TOKENS },
    }),
  });

  if (!response.ok) return handleAPIError(response);

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseJSON(text);
}
