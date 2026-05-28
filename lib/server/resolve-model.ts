import { getModel } from '@/lib/ai/providers';
import type { ModelConfig } from '@/lib/types/provider';
import type { NextRequest } from 'next/server';

interface ResolveModelOptions {
  modelString?: string;
  modelId?: string;
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: ModelConfig['providerType'];
  requiresApiKey?: boolean;
}

export function resolveModel(config?: ResolveModelOptions & Partial<ModelConfig>) {
  const modelString = config?.modelString || config?.modelId || process.env.AI_MODEL || 'spark-4.0-turbo';
  const providerId = config?.providerId || (process.env.AI_PROVIDER as 'spark' | 'openai') || 'spark';
  const apiKey = config?.apiKey || process.env.SPARK_API_KEY || process.env.OPENAI_API_KEY || '';

  const modelConfig = providerId === 'spark'
    ? {
        providerId: 'spark' as const,
        modelId: modelString,
        apiKey,
        providerType: 'openai' as const,
        baseUrl: config?.baseUrl || process.env.SPARK_BASE_URL || 'https://spark-api-open.xf-yun.com/v1',
      }
    : {
        providerId,
        modelId: modelString,
        apiKey,
        ...(config?.baseUrl ? { baseUrl: config.baseUrl } : {}),
      };

  const result = getModel(modelConfig);
  return {
    ...result,
    apiKey,
  };
}

export function resolveModelFromHeaders(req: NextRequest) {
  const modelString = req.headers.get('x-model') || undefined;
  const apiKey = req.headers.get('x-api-key') || undefined;
  const baseUrl = req.headers.get('x-base-url') || undefined;
  const providerType = req.headers.get('x-provider-type') || undefined;

  return resolveModel({
    modelString,
    apiKey,
    baseUrl,
    providerType: providerType as ModelConfig['providerType'] | undefined,
  });
}
