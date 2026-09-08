import { NextRequest } from 'next/server';
import {
  UPLOAD_TIMEOUT_MS,
  insightRequest,
  validateResumeFile,
  withInsight,
} from '@/lib/career/insight-proxy';
import type { ResumeRecord, UploadTask } from '@/lib/career/types';

/** 我的简历列表（需登录职能洞察） */
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get('limit') ?? 20;
  return withInsight<{ items: ResumeRecord[]; total: number }>(() =>
    insightRequest<{ items: ResumeRecord[]; total: number }>({
      path: '/api/v1/me/resumes',
      query: { limit },
      auth: true,
    }),
  );
}

/** 上传简历，返回异步解析任务（需登录职能洞察） */
export async function POST(req: NextRequest) {
  return withInsight<UploadTask>(async () => {
    const incoming = await req.formData();
    const file = incoming.get('file');
    if (!(file instanceof File)) {
      throw new Error('缺少简历文件');
    }
    const invalid = validateResumeFile(file);
    if (invalid) throw new Error(invalid);

    // 重新构造 FormData，确保以 file 字段透传给职能洞察
    const body = new FormData();
    body.append('file', file, file.name);

    return insightRequest<UploadTask>({
      method: 'POST',
      path: '/api/v1/resumes',
      formData: body,
      auth: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    });
  });
}
