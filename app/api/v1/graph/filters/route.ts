import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { GraphFilterOptions } from '@/lib/graph/types';

/** 图谱筛选项：视图、技术栈、能力层级、职级、实体类型 */
export async function GET() {
  return withInsight<GraphFilterOptions>(() =>
    insightRequest<GraphFilterOptions>({
      path: '/api/v1/graph/filters',
      auth: true,
    }),
  );
}
