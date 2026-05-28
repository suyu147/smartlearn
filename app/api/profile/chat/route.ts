﻿﻿﻿﻿﻿﻿﻿import { NextRequest } from 'next/server';
import { streamLLM } from '@/lib/ai/llm';
import { getModel } from '@/lib/ai/providers';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import type { ProfileDimensions, ConversationMessage } from '@/lib/types/profile';
import { DEFAULT_DIMENSIONS } from '@/lib/types/profile';
import profileChatPrompt from '@/lib/prompts/profile-chat-prompt.json';

const PROFILE_SYSTEM_PROMPT = profileChatPrompt.systemPrompt;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, profile, conversationHistory } = body as {
      message: string;
      profile: { dimensions: ProfileDimensions } | null;
      conversationHistory: ConversationMessage[];
    };

    const apiKey = process.env.SPARK_API_KEY || process.env.OPENAI_API_KEY || '';
    const providerId = (process.env.AI_PROVIDER as 'spark' | 'openai' | 'deepseek') || 'spark';
    const modelId = process.env.AI_MODEL || 'spark-4.0-turbo';

    const modelConfig = providerId === 'spark'
      ? {
          providerId: 'spark' as const,
          modelId,
          apiKey,
          providerType: 'openai' as const,
          baseUrl: process.env.SPARK_BASE_URL || 'https://spark-api-open.xf-yun.com/v1',
        }
      : {
          providerId,
          modelId,
          apiKey,
        };

    const { model } = getModel(modelConfig);

    const currentDimensions = profile?.dimensions || DEFAULT_DIMENSIONS;

    const chatMessages = [
      ...conversationHistory.slice(-10).map((m: ConversationMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const result = streamLLM(
      {
        model,
        system: PROFILE_SYSTEM_PROMPT + `\n\n${JSON.stringify(currentDimensions, null, 2)}`,
        messages: chatMessages,
        maxOutputTokens: 2048,
      },
      'profile-chat',
    );

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullContent = '';

        try {
          for await (const chunk of result.textStream) {
            fullContent += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text: chunk })}\n\n`),
            );
          }

          const profileUpdate = parseJsonResponse<ProfileDimensions>(fullContent);
          if (profileUpdate) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'profile_update', dimensions: profileUpdate })}\n\n`,
              ),
            );
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`),
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
