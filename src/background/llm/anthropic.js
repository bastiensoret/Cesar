import { SYSTEM_PROMPT } from '../system-prompt.js';
import { fetchWithTimeout, handleAPIError, parseJSON } from '../utils.js';

const LLM_MAX_TOKENS = 800;

export async function callAnthropic(apiKey, model, userMessage) {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: LLM_MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) await handleAPIError(response);

  const result = await response.json();

  // Log cache performance
  const usage = result.usage || {};
  if (usage.cache_read_input_tokens > 0) {
    console.log(`[César] Prompt cache HIT — saved ${usage.cache_read_input_tokens} tokens`);
  } else if (usage.cache_creation_input_tokens > 0) {
    console.log(
      `[César] Prompt cache CREATED — ${usage.cache_creation_input_tokens} tokens cached`
    );
  }

  const text = result.content?.[0]?.text || '';
  return parseJSON(text);
}
