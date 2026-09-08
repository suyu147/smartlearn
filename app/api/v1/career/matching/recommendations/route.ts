import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { RecommendationItem } from '@/lib/career/types';

/** 按已掌握技能推荐适配岗位（免登录） */
export async function POST(req: NextRequest) {
  let payload: { skills?: string[]; limit?: number };
  try {
    payload = (await req.json()) as { skills?: string[]; limit?: number };
  } catch {
    return withInsight<never>(() => Promise.reject(new Error('请求体不是合法 JSON')));
  }
  const skills = payload?.skills ?? [];
  if (!skills.length) {
    return withInsight<never>(() => Promise.reject(new Error('至少提供一项已掌握技能')));
  }

  return withInsight<{ items: RecommendationItem[]; total: number }>(() =>
    insightRequest<{ items: RecommendationItem[]; total: number }>({
      method: 'POST',
      path: '/api/v1/matching/recommendations',
      body: { skills, limit: payload?.limit ?? 8 },
    }),
  );
}
