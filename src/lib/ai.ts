export interface AiConfig {
  url: string;
  key: string;
  model: string;
}

export function getAiConfig(): AiConfig {
  const url =
    process.env.AI_URL ||
    process.env.NVIDIA_AI_URL ||
    'http://host.docker.internal:11434/v1/chat/completions';

  const key =
    process.env.AI_KEY ||
    process.env.NVIDIA_AI_KEY ||
    'ollama';

  const model =
    process.env.AI_MODEL ||
    process.env.NVIDIA_AI_MODEL ||
    'qwen2.5:3b';

  return { url, key, model };
}

export async function callAi({
  messages,
  temperature = 0.1,
  max_tokens = 2000,
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}): Promise<string | null> {
  const { url, key, model } = getAiConfig();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (key && key !== 'none') {
    headers['Authorization'] = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Helper] API error from ${url} (${response.status}):`, errText);
      return null;
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    console.error(`[AI Helper] Failed to connect to AI service at ${url}:`, error?.message || error);
    return null;
  }
}
