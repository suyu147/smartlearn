import { NextRequest } from 'next/server';
import { streamLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';
import type { ProviderId } from '@/lib/types/provider';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import type { ResourceType, Resource } from '@/lib/types/resource';
import type { ProfileDimensions } from '@/lib/types/profile';
import resourcePrompts from '@/lib/prompts/resource-prompts.json';

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  document: 'document',
  mindmap: 'mindmap',
  quiz: 'quiz',
  video: 'video',
  code: 'code',
  reading: 'reading',
  ppt: 'ppt',
};

async function generateResource(
  type: ResourceType,
  knowledgePoints: string[],
  profile?: ProfileDimensions | null,
  aiConfig?: { providerId?: string; modelId?: string; apiKey?: string; baseUrl?: string },
): Promise<{ content: string; title: string }> {
  const { model } = resolveModel({
    providerId: aiConfig?.providerId as ProviderId | undefined,
    modelString: aiConfig?.modelId,
    apiKey: aiConfig?.apiKey,
    baseUrl: aiConfig?.baseUrl,
  });
  const prompt = resourcePrompts[type as keyof typeof resourcePrompts];

  // 构建个性化提示词
  let personalizedPrompt = `Generate ${RESOURCE_TYPE_LABELS[type]} for: ${knowledgePoints.join(', ')}`;
  
  if (profile) {
    personalizedPrompt += `\n\nStudent profile for personalization:\n${JSON.stringify(profile, null, 2)}`;
  }

  const result = await streamLLM(
    {
      model,
      system: prompt,
      prompt: personalizedPrompt,
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
    const { knowledgePoints, resourceTypes, profile, aiConfig } = body as {
      knowledgePoints: string[];
      resourceTypes: ResourceType[];
      profile?: ProfileDimensions | null;
      aiConfig?: { providerId?: string; modelId?: string; apiKey?: string; baseUrl?: string };
    };

    console.log('Generating resources with profile:', profile ? 'yes' : 'no');

    const types = resourceTypes.length > 0 ? resourceTypes : (['document', 'mindmap', 'quiz', 'code', 'reading'] as ResourceType[]);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        // 安全 enqueue：客户端断开连接时静默失败
        const safeEnqueue = (data: string) => {
          try { controller.enqueue(encoder.encode(data)); } catch { /* 客户端已断开 */ }
        };

        for (const type of types) {
          try {
            safeEnqueue(
              `data: ${JSON.stringify({ type: 'agent_start', agent: type, task: `Generating ${RESOURCE_TYPE_LABELS[type]}` })}\n\n`,
            );

            const { content, title } = await generateResource(type, knowledgePoints, profile, aiConfig);

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
                profileUsed: !!profile,
              },
            };

            if (type === 'video') {
              const { parseVideoScript } = await import('@/lib/video/generate');
              const videoData = parseVideoScript(content);
              if (resource.metadata) {
                resource.metadata.videoData = videoData;
              }
            }

            console.log('Generated resource:', resource.title);

            safeEnqueue(
              `data: ${JSON.stringify({ type: 'resource_delta', resource })}\n\n`,
            );

            safeEnqueue(
              `data: ${JSON.stringify({ type: 'agent_end', agent: type })}\n\n`,
            );
          } catch (error) {
            console.error('Error generating resource:', error);
            safeEnqueue(
              `data: ${JSON.stringify({ type: 'error', agent: type, message: String(error) })}\n\n`,
            );
          }
        }

        safeEnqueue(
          `data: ${JSON.stringify({ type: 'generation_complete' })}\n\n`,
        );
        try { controller.close(); } catch { /* 已关闭 */ }
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
    console.error('Resource generation error:', error);
    return new Response(
      JSON.stringify({ error: { message: String(error) } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
