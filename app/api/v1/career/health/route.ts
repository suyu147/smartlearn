import { NextRequest } from 'next/server';
import { insightRequest, withInsight } from '@/lib/career/insight-proxy';
import type { CareerHealth } from '@/lib/career/types';

/** 探测职能洞察服务可用性（免登录） */
export async function GET(_req: NextRequest) {
  return withInsight<CareerHealth>(() =>
    insightRequest<CareerHealth>({ path: '/health' }),
  );
}
