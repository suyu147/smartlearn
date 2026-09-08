import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { LearningPath } from '@/lib/career/types';

/**
 * 学习路径。职能洞察将其作为独立接口（不在匹配结果中返回），
 * 需要匹配报告 ID：POST /api/v1/learning-paths?reportId=xxx
 */
export async function POST(req: NextRequest) {
  const reportId = req.nextUrl.searchParams.get('reportId') ?? '';
  if (!reportId) {
    return withInsight<never>(() => Promise.reject(new Error('缺少 reportId')));
  }

  return withInsight<LearningPath>(() =>
    insightRequest<LearningPath>({
      method: 'POST',
      path: '/api/v1/learning-paths',
      query: { reportId },
      // 学习路径生成较慢（要查图谱 + 演化数据）
      timeoutMs: 120_000,
    }),
  );
}
