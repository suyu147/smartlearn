import { NextRequest } from 'next/server';
import { streamLLM } from '@/lib/ai/llm';
import { getModel } from '@/lib/ai/providers';
import tutorChatPrompt from '@/lib/prompts/tutor-chat-prompt.json';

const TUTOR_SYSTEM_PROMPT = tutorChatPrompt.systemPrompt;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory } = body as {
      message: string;
      conversationHistory: { role: string; content: string }[];
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

    const chatMessages = [
      ...conversationHistory.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const result = streamLLM(
      {
        model,
        system: TUTOR_SYSTEM_PROMPT,
        messages: chatMessages,
        maxOutputTokens: 2048,
      },
      'tutor-chat',
    );

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'agent_start', agent: 'tutor' })}\n\n`,
            ),
          );

          for await (const chunk of result.textStream) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text_delta', text: chunk })}\n\n`,
              ),
            );
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'agent_end', agent: 'tutor' })}\n\n`,
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
