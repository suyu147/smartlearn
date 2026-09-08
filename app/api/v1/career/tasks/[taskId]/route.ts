import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { ParseTask } from '@/lib/career/types';

/** 查询简历解析任务进度（需登录职能洞察） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  return withInsight<ParseTask>(() =>
    insightRequest<ParseTask>({
      path: `/api/v1/tasks/${encodeURIComponent(taskId)}`,
      auth: true,
    }),
  );
}
