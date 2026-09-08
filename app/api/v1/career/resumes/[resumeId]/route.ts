import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';

/** 删除我的简历（需登录职能洞察） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;
  return withInsight<{ resumeId: string; deleted: boolean }>(() =>
    insightRequest<{ resumeId: string; deleted: boolean }>({
      method: 'DELETE',
      path: `/api/v1/me/resumes/${encodeURIComponent(resumeId)}`,
      auth: true,
    }),
  );
}
