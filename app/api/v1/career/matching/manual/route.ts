import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { ManualMatchPayload, MatchResult } from '@/lib/career/types';

/** 手动能力匹配；不传 resumeId 时免登录 */
export async function POST(req: NextRequest) {
  let payload: ManualMatchPayload;
  try {
    payload = (await req.json()) as ManualMatchPayload;
  } catch {
    return withInsight<never>(() => Promise.reject(new Error('请求体不是合法 JSON')));
  }
  if (!payload?.targetRoleId) {
    return withInsight<never>(() => Promise.reject(new Error('缺少 targetRoleId')));
  }

  return withInsight<MatchResult>(() =>
    insightRequest<MatchResult>({
      method: 'POST',
      path: '/api/v1/matching/manual',
      body: {
        targetRoleId: payload.targetRoleId,
        skills: payload.skills ?? [],
        education: payload.education ?? '',
        experienceYears: payload.experienceYears ?? null,
        certificates: payload.certificates ?? [],
        resumeId: payload.resumeId ?? '',
        workStyleScore: payload.workStyleScore ?? null,
      },
      // 带 resumeId 时必须携带职能洞察登录态
      auth: Boolean(payload.resumeId),
    }),
  );
}
