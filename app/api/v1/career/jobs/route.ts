import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { PageData, JobSummary } from '@/lib/career/types';

/** 岗位列表（免登录），用于目标岗位下拉数据源 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return withInsight<PageData<JobSummary>>(() =>
    insightRequest<PageData<JobSummary>>({
      path: '/api/v1/jobs',
      query: {
        page: params.get('page') ?? 1,
        pageSize: params.get('pageSize') ?? 100,
        keyword: params.get('keyword') ?? undefined,
        sort: params.get('sort') ?? undefined,
      },
    }),
  );
}
