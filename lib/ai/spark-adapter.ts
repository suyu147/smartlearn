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
    id: 'spark-x2',
    name: '星火 X2',
    contextWindow: 128000,
    outputWindow: 8192,
    capabilities: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'spark-4.0-turbo',
    name: '星火 4.0 Turbo',
    contextWindow: 128000,
    outputWindow: 8192,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  {
    id: 'spark-x1.5',
    name: '星火 X1.5（推理）',
    contextWindow: 64000,
    outputWindow: 8192,
    capabilities: {
      streaming: true,
      tools: true,
      vision: false,
      thinking: { toggleable: true, budgetAdjustable: false, defaultEnabled: true },
    },
  },
];
