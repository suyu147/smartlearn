import { createOpenAI } from '@ai-sdk/openai';

export interface SparkConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export function createSparkModel(modelId: string, config: SparkConfig) {
  const baseUrl = config.baseUrl || 'https://spark-api-open.xf-yun.com/v1';

  const spark = createOpenAI({
    apiKey: config.apiKey,
    baseURL: baseUrl,
  });

  return spark.chat(modelId);
}

export const SPARK_MODELS = [
  {
    id: 'lite',
    name: '星火 Lite',
    contextWindow: 8000,
    outputWindow: 4096,
    capabilities: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'generalv3',
    name: '星火 Pro',
    contextWindow: 8000,
    outputWindow: 8192,
    capabilities: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'pro-128k',
    name: '星火 Pro-128K',
    contextWindow: 128000,
    outputWindow: 4096,
    capabilities: { streaming: true, tools: true, vision: false },
  },
  {
    id: '4.0Ultra',
    name: '星火 4.0 Ultra',
    contextWindow: 32000,
    outputWindow: 32000,
    capabilities: { streaming: true, tools: true, vision: true },
  },
];
