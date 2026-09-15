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

async function executeCall(
  config: AiConfig,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  max_tokens: number
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.key && config.key !== 'none') {
    headers['Authorization'] = config.key.startsWith('Bearer ') ? config.key : `Bearer ${config.key}`;
  }

  console.log(`[AI Helper] Routing request to ${config.name} (${config.url})...`);

  // 180-second timeout to prevent indefinite hangs while supporting slow CPU inference
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API returned an empty completion response.');
    }
    return content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after 180 seconds connecting to ${config.name} (${config.url}).`);
    }
    throw err;
  }
}

export async function callAi({
  messages,
  temperature = 0.1,
  max_tokens = 2000,
  provider,
  allowFallback = true,
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  provider?: string | null;
  allowFallback?: boolean;
}): Promise<string | null> {
  const primaryConfig = getAiConfig(provider);

  try {
    return await executeCall(primaryConfig, messages, temperature, max_tokens);
  } catch (primaryErr: any) {
    console.warn(
      `[AI Helper] ${primaryConfig.name} failed: ${primaryErr.message}`
    );

    // If primary provider fails and fallback is enabled, try the alternative
    if (allowFallback) {
      const fallbackProvider = primaryConfig.provider === 'local' ? 'nvidia' : 'local';
      const fallbackConfig = getAiConfig(fallbackProvider);

      try {
        console.log(`[AI Helper] Attempting automatic fallback to ${fallbackConfig.name}...`);
        const fallbackResult = await executeCall(fallbackConfig, messages, temperature, max_tokens);
        console.log(`[AI Helper] Successfully processed via fallback (${fallbackConfig.name})!`);
        return fallbackResult;
      } catch (fallbackErr: any) {
        console.error(`[AI Helper] Fallback to ${fallbackConfig.name} also failed:`, fallbackErr.message);
        throw new Error(
          `${primaryConfig.name} failed (${primaryErr.message}), and fallback ${fallbackConfig.name} failed (${fallbackErr.message}).`
        );
      }
    }

    throw primaryErr;
  }
}
