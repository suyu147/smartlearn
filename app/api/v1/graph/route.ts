import { NextRequest } from 'next/server';
import { InsightError, insightErrorResponse, insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { GraphData } from '@/lib/graph/types';

/**
 * 知识图谱本体
 *
 * 转发职能洞察 `GET /api/v1/graph`。
 * 参数范围与后端保持一致：limit 取值 10-500，viewMode 仅 role / stack / entity。
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const viewMode = params.get('viewMode') || 'role';
  if (!['role', 'stack', 'entity'].includes(viewMode)) {
    return insightErrorResponse(
      new InsightError('viewMode 只能是 role、stack 或 entity', 400, 'graph_bad_request'),
    );
  }

  const rawLimit = Number(params.get('limit') ?? NaN);
  // 后端要求 10 <= limit <= 500，越界时回落到该视图的默认值
  const fallback = viewMode === 'entity' ? 220 : 100;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 10 && rawLimit <= 500
    ? Math.trunc(rawLimit)
    : fallback;

  return withInsight<GraphData>(() =>
    insightRequest<GraphData>({
      path: '/api/v1/graph',
      auth: true,
      query: {
        viewMode,
        limit,
        keyword: params.get('keyword') ?? undefined,
        roleId: viewMode === 'role' ? params.get('roleId') ?? undefined : undefined,
        techStack: viewMode === 'stack' ? params.get('techStack') ?? undefined : undefined,
        seniority: viewMode === 'stack' ? params.get('seniority') ?? undefined : undefined,
        entityType: viewMode === 'entity' ? params.get('entityType') ?? undefined : undefined,
        skillTier: params.get('skillTier') ?? undefined,
      },
    }),
  );
}
