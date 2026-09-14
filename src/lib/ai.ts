export interface AiConfig {
  provider: 'local' | 'nvidia';
  url: string;
  key: string;
  model: string;
  name: string;
}

export function getAiConfig(preferredProvider?: string | null): AiConfig {
  const provider = preferredProvider === 'nvidia' ? 'nvidia' : 'local';

  if (provider === 'nvidia') {
    return {
      provider: 'nvidia',
      name: 'Nvidia Cloud (Llama 3.2 11B)',
      url: process.env.NVIDIA_AI_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
      key: process.env.NVIDIA_AI_KEY || 'Bearer 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',
      model: process.env.NVIDIA_AI_MODEL || 'meta/llama-3.2-11b-vision-instruct',
    };
  }

  return {
    provider: 'local',
    name: 'Local Ollama (Qwen 2.5 3B)',
    url: process.env.AI_URL || 'http://host.docker.internal:11434/v1/chat/completions',
    key: process.env.AI_KEY || 'ollama',
    model: process.env.AI_MODEL || 'qwen2.5:3b',
  };
}

export async function callAi({
  messages,
  temperature = 0.1,
  max_tokens = 2000,
  provider,
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  provider?: string | null;
}): Promise<string | null> {
  const config = getAiConfig(provider);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.key && config.key !== 'none') {
    headers['Authorization'] = config.key.startsWith('Bearer ') ? config.key : `Bearer ${config.key}`;
  }

  try {
    console.log(`[AI Helper] Routing request to ${config.name} (${config.url})...`);
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Helper] API error from ${config.url} (${response.status}):`, errText);
      return null;
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    console.error(`[AI Helper] Failed to connect to ${config.name} at ${config.url}:`, error?.message || error);
    return null;
  }
}
