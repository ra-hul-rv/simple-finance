export interface AssistantConfig {
  enabled: boolean;
  writesEnabled: boolean;
  url: string;
  key: string;
  model: string;
}

export function normalizeAiUrl(inputUrl?: string): string {
  const defaultUrl = 'http://host.docker.internal:11434/v1/chat/completions';
  if (!inputUrl || !inputUrl.trim()) {
    return defaultUrl;
  }
  const clean = inputUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/v1/chat/completions')) {
    return clean;
  }
  if (clean.endsWith('/v1')) {
    return `${clean}/chat/completions`;
  }
  return `${clean}/v1/chat/completions`;
}

export function getAssistantConfig(): AssistantConfig {
  return {
    enabled: process.env.AI_ENABLED === 'true',
    writesEnabled: process.env.AI_ALLOW_WRITES === 'true',
    url: normalizeAiUrl(process.env.AI_URL),
    key: process.env.AI_KEY || 'ollama',
    model: process.env.AI_MODEL || 'qwen2.5:3b',
  };
}

/**
 * Call Ollama ONLY - no cloud fallback.
 * Strictly self-hosted as per project requirements.
 */
export async function callAssistantAi({
  messages,
  temperature = 0.2,
  max_tokens = 2000,
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const config = getAssistantConfig();

  if (!config.enabled) {
    throw new Error('AI Assistant is currently disabled. Set AI_ENABLED=true in the environment to activate.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.key && config.key !== 'none') {
    headers['Authorization'] = config.key.startsWith('Bearer ') ? config.key : `Bearer ${config.key}`;
  }

  // 120-second timeout for local CPU inference
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

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
        stream: false,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Ollama returned an empty response.');
    }
    return content;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI request timed out after 120 seconds. The local Ollama model may be busy or overloaded.');
    }
    throw err;
  }
}
