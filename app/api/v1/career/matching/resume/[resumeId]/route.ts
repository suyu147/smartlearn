import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { MatchResult } from '@/lib/career/types';

/** 用已确认的简历直接匹配目标岗位（需登录职能洞察） */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;
  const targetRoleId = req.nextUrl.searchParams.get('targetRoleId') ?? '';
  if (!targetRoleId) {
    return withInsight<never>(() => Promise.reject(new Error('缺少 targetRoleId')));
  }

  return withInsight<MatchResult>(() =>
    insightRequest<MatchResult>({
      method: 'POST',
      path: `/api/v1/matching/resume/${encodeURIComponent(resumeId)}`,
      query: { targetRoleId },
      auth: true,
    }),
  );
}
