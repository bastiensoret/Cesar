import { SYSTEM_PROMPT } from '../system-prompt.js';
import { fetchWithTimeout, handleAPIError, parseJSON } from '../utils.js';

const LLM_MAX_TOKENS = 800;

export async function callOpenAICompat(apiKey, model, endpoint, userMessage) {
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: LLM_MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) return handleAPIError(response);

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || '';
  return parseJSON(text);
}
