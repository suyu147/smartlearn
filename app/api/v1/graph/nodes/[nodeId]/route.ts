import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { GraphNodeDetail } from '@/lib/graph/types';

/** 单个图谱节点的属性详情 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  return withInsight<GraphNodeDetail>(() =>
    insightRequest<GraphNodeDetail>({
      path: `/api/v1/graph/nodes/${encodeURIComponent(nodeId)}`,
      auth: true,
    }),
  );
}
