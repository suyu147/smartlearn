﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { NextRequest } from 'next/server';
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
          }

          let displayContent = fullContent;
          let inJsonBlock = false;
          let resultText = '';
          let i = 0;

          while (i < displayContent.length) {
            if (!inJsonBlock) {
              const jsonStart = displayContent.indexOf('```json', i);
              if (jsonStart === -1) {
                resultText += displayContent.slice(i);
                break;
              } else {
                resultText += displayContent.slice(i, jsonStart);
                i = jsonStart;
                inJsonBlock = true;
              }
            } else {
              const jsonEnd = displayContent.indexOf('```', i + 7);
              if (jsonEnd === -1) {
                break;
              } else {
                i = jsonEnd + 3;
                inJsonBlock = false;
              }
            }
          }

          const chunkSize = 20;
          for (let j = 0; j < resultText.length; j += chunkSize) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text: resultText.slice(j, j + chunkSize) })}\n\n`),
            );
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // 尝试解析 JSON，支持两种格式：直接是 dimensions 或者包裹在 { dimensions: ... } 中
          let profileUpdate: ProfileDimensions | null = null;
          
          // 首先尝试直接解析
          let parsed = parseJsonResponse<any>(fullContent);
          
          if (parsed) {
            if (parsed.dimensions) {
              // 格式1: { dimensions: { ... } }
              profileUpdate = parsed.dimensions;
            } else if (parsed.knowledgeBase) {
              // 格式2: 直接是 dimensions 对象
              profileUpdate = parsed;
            }
          }
          
          // 如果直接解析失败，尝试从文本中提取 JSON
          if (!profileUpdate) {
            const jsonMatch = fullContent.match(/\{[\s\S]*"knowledgeBase"[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
                if (parsed.dimensions) {
                  profileUpdate = parsed.dimensions;
                } else if (parsed.knowledgeBase) {
                  profileUpdate = parsed;
                }
              } catch (e) {
                console.error('Failed to parse extracted JSON:', e);
              }
            }
          }
          
          if (profileUpdate) {
            console.log('Profile updated successfully:', profileUpdate);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'profile_update', dimensions: profileUpdate })}\n\n`,
              ),
            );
          } else {
            console.log('No profile update found in response');
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
