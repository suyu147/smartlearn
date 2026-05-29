import { NextRequest } from 'next/server';
import { streamLLM } from '@/lib/ai/llm';
import { getModel } from '@/lib/ai/providers';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import type { ProfileDimensions } from '@/lib/types/profile';
import type { LearningPath, LearningPathNode } from '@/lib/types/learning-path';
import pathPlanPrompt from '@/lib/prompts/path-plan-prompt.json';

const PATH_SYSTEM_PROMPT = pathPlanPrompt.systemPrompt;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, profile } = body as {
      goal: string;
      profile: ProfileDimensions | null;
    };

    const providerId = (process.env.AI_PROVIDER as 'spark' | 'openai' | 'deepseek') || 'deepseek';
    const modelId = process.env.AI_MODEL || 'deepseek-chat';
    
    // 根据 providerId 获取对应的 API key
    let apiKey = '';
    switch (providerId) {
      case 'spark':
        apiKey = process.env.SPARK_API_KEY || '';
        break;
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY || '';
        break;
      case 'deepseek':
        apiKey = process.env.DEEPSEEK_API_KEY || '';
        break;
      case 'kimi':
        apiKey = process.env.KIMI_API_KEY || '';
        break;
      case 'glm':
        apiKey = process.env.GLM_API_KEY || '';
        break;
      case 'qwen':
        apiKey = process.env.QWEN_API_KEY || '';
        break;
      default:
        apiKey = process.env.OPENAI_API_KEY || '';
    }

    const modelConfig = providerId === 'spark'
      ? {
          providerId: 'spark' as const,
          modelId,
          apiKey,
          providerType: 'openai' as const,
          baseUrl: process.env.SPARK_BASE_URL || 'https://spark-api-open.xf-yun.com/v1',
        }
      : { providerId, modelId, apiKey };

    const { model } = getModel(modelConfig);

    const profileContext = profile
      ? `\n\n${JSON.stringify(profile, null, 2)}`
      : '\n\nNo profile available, plan for beginner level';

    const result = streamLLM(
      {
        model,
        system: PATH_SYSTEM_PROMPT,
        prompt: `${goal}${profileContext}`,
        maxOutputTokens: 4096,
      },
      'path-plan',
    );

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullContent = '';

        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'agent_start', agent: 'path' })}\n\n`,
            ),
          );

          for await (const chunk of result.textStream) {
            fullContent += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text_delta', text: chunk })}\n\n`,
              ),
            );
          }

          const pathData = parseJsonResponse<{
            goal: string;
            estimatedDays: number;
            nodes: LearningPathNode[];
            edges: { from: string; to: string }[];
          }>(fullContent);

          if (pathData) {
            const learningPath: LearningPath = {
              id: crypto.randomUUID(),
              userId: 'current',
              goal: pathData.goal || goal,
              nodes: pathData.nodes || [],
              edges: pathData.edges || [],
              estimatedDays: pathData.estimatedDays || 30,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'path_update', path: learningPath })}\n\n`,
              ),
            );
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'agent_end', agent: 'path' })}\n\n`,
            ),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
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
