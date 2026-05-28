import { NextRequest } from 'next/server';
import { streamLLM } from '@/lib/ai/llm';
import { getModel } from '@/lib/ai/providers';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import type { ResourceType, Resource } from '@/lib/types/resource';
import resourcePrompts from '@/lib/prompts/resource-prompts.json';

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  document: 'document',
  mindmap: 'mindmap',
  quiz: 'quiz',
  video: 'video',
  code: 'code',
  reading: 'reading',
};

function getModelConfig() {
  const apiKey = process.env.SPARK_API_KEY || process.env.OPENAI_API_KEY || '';
  const providerId = (process.env.AI_PROVIDER as 'spark' | 'openai' | 'deepseek') || 'spark';
  const modelId = process.env.AI_MODEL || 'spark-4.0-turbo';

  return providerId === 'spark'
    ? {
        providerId: 'spark' as const,
        modelId,
        apiKey,
        providerType: 'openai' as const,
        baseUrl: process.env.SPARK_BASE_URL || 'https://spark-api-open.xf-yun.com/v1',
      }
    : { providerId, modelId, apiKey };
}

async function generateResource(
  type: ResourceType,
  knowledgePoints: string[],
): Promise<{ content: string; title: string }> {
  const { model } = getModel(getModelConfig());
  const prompt = resourcePrompts[type as keyof typeof resourcePrompts];

  const result = await streamLLM(
    {
      model,
      system: prompt,
      prompt: `Generate ${RESOURCE_TYPE_LABELS[type]} for: ${knowledgePoints.join(', ')}`,
      maxOutputTokens: 4096,
    },
    `resource-${type}`,
  );

  const content = await result.text;
  const title = `${knowledgePoints.join(', ')} - ${RESOURCE_TYPE_LABELS[type]}`;

  return { content, title };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { knowledgePoints, resourceTypes } = body as {
      knowledgePoints: string[];
      resourceTypes: ResourceType[];
    };

    const types = resourceTypes.length > 0 ? resourceTypes : (['document', 'mindmap', 'quiz', 'code', 'reading'] as ResourceType[]);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for (const type of types) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'agent_start', agent: type, task: `Generating ${RESOURCE_TYPE_LABELS[type]}` })}\n\n`,
              ),
            );

            const { content, title } = await generateResource(type, knowledgePoints);

            const resource: Resource = {
              id: crypto.randomUUID(),
              userId: 'current',
              type,
              title,
              content,
              sourceAgent: type,
              status: 'ready',
              createdAt: new Date().toISOString(),
              metadata: {
                knowledgePoints,
              },
            };

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'resource_delta', resource })}\n\n`,
              ),
            );

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'agent_end', agent: type })}\n\n`,
              ),
            );
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', agent: type, message: String(error) })}\n\n`,
              ),
            );
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'generation_complete' })}\n\n`),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { message: String(error) } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
