export function getServerWebSearchProviders() {
  const providers: Record<string, string> = {};
  if (process.env.TAVILY_API_KEY) providers.tavily = process.env.TAVILY_API_KEY;
  return providers;
}

export function getServerImageProviders() {
  const providers: Record<string, string> = {};
  return providers;
}

export function getServerVideoProviders() {
  const providers: Record<string, string> = {};
  return providers;
}

export function resolveWebSearchApiKey(clientApiKey?: string): string | null {
  return clientApiKey || process.env.TAVILY_API_KEY || null;
}

export function resolveASRApiKey(providerId: string, clientApiKey?: string): string {
  if (clientApiKey) return clientApiKey;
  switch (providerId) {
    case 'openai-whisper':
      return process.env.OPENAI_API_KEY || '';
    case 'spark':
      return process.env.SPARK_API_KEY || '';
    default:
      return process.env.OPENAI_API_KEY || '';
  }
}

export function resolveASRBaseUrl(providerId: string, clientBaseUrl?: string): string | undefined {
  if (clientBaseUrl) return clientBaseUrl;
  switch (providerId) {
    case 'spark':
      return process.env.SPARK_BASE_URL || 'https://spark-api-open.xf-yun.com/v1';
    default:
      return undefined;
  }
}

export function getServerTTSProviders() {
  const providers: Record<string, string> = {};
  if (process.env.SPARK_API_KEY) providers.spark = process.env.SPARK_API_KEY;
  return providers;
}
