/**
 * 能力诊断服务层
 *
 * 面向页面的函数封装，全部基于 apiFetch 调用 smartlearn 自己的薄代理路由
 * （/api/v1/career/*），由代理层负责注入职能洞察的鉴权头。
 */

import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/lib/api-client';
import type {
  JobSummary,
  LearningPath,
  ManualMatchPayload,
  MatchResult,
  PageData,
  ParseTask,
  RecommendationItem,
  ResumeConfirmPayload,
  ResumeRecord,
  UploadTask,
  CareerHealth,
  WorkStyleAssessment,
  RadarAxis,
} from '@/lib/career/types';

const BASE = '/api/v1/career';

// ---------------------------------------------------------------------------
// 轻量结果缓存
// ---------------------------------------------------------------------------

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}
const cache = new Map<string, CacheEntry>();

function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value as T);
  return loader().then((value) => {
    cache.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  });
}

/** 写操作后清空缓存（简历增删会改变列表） */
function invalidate(prefix: string) {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// ---------------------------------------------------------------------------
// 健康探测
// ---------------------------------------------------------------------------

export function checkHealth(): Promise<CareerHealth> {
  return apiGet<CareerHealth>(`${BASE}/health`);
}

// ---------------------------------------------------------------------------
// 岗位
// ---------------------------------------------------------------------------

/** 岗位列表；默认按招聘证据量取前 pageSize 个 */
export function listJobs(params: { keyword?: string; pageSize?: number; page?: number } = {}): Promise<PageData<JobSummary>> {
  const { keyword = '', pageSize = 100, page = 1 } = params;
  const key = `jobs:${page}:${pageSize}:${keyword}`;
  return cached(key, 60_000, () => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword.trim()) query.set('keyword', keyword.trim());
    return apiGet<PageData<JobSummary>>(`${BASE}/jobs?${query.toString()}`);
  });
}

// ---------------------------------------------------------------------------
// 匹配
// ---------------------------------------------------------------------------

/** 手动能力匹配 */
export function runManualMatch(payload: ManualMatchPayload): Promise<MatchResult> {
  return apiPost<MatchResult>(`${BASE}/matching/manual`, payload);
}

/** 用已确认的简历匹配目标岗位 */
export function matchWithResume(resumeId: string, targetRoleId: string): Promise<MatchResult> {
  return apiPost<MatchResult>(
    `${BASE}/matching/resume/${encodeURIComponent(resumeId)}?targetRoleId=${encodeURIComponent(targetRoleId)}`,
  );
}

/** 按已掌握技能推荐适配岗位 */
export function recommendRoles(skills: string[], limit = 8): Promise<{ items: RecommendationItem[]; total: number }> {
  return apiPost<{ items: RecommendationItem[]; total: number }>(`${BASE}/matching/recommendations`, { skills, limit });
}

/** 生成学习路径（依赖匹配报告 ID） */
export function getLearningPath(reportId: string): Promise<LearningPath> {
  return apiPost<LearningPath>(`${BASE}/matching/learning-path?reportId=${encodeURIComponent(reportId)}`);
}

// ---------------------------------------------------------------------------
// 简历
// ---------------------------------------------------------------------------

/** 上传简历，返回异步解析任务 */
export async function uploadResume(file: File): Promise<UploadTask> {
  const body = new FormData();
  body.append('file', file);
  const task = await apiUpload<UploadTask>(`${BASE}/resumes`, body);
  invalidate('resumes');
  return task;
}

/** 查询解析任务进度 */
export function pollTask(taskId: string): Promise<ParseTask> {
  return apiGet<ParseTask>(`${BASE}/tasks/${encodeURIComponent(taskId)}`);
}

/**
 * 轮询直至解析结束。
 * @param intervalMs 轮询间隔，默认 1.5s
 * @param timeoutMs 最长等待时间，默认 120s
 */
export async function waitForParse(
  taskId: string,
  options: { intervalMs?: number; timeoutMs?: number; onProgress?: (task: ParseTask) => void } = {},
): Promise<ResumeRecord> {
  const { intervalMs = 1500, timeoutMs = 120_000, onProgress } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const task = await pollTask(taskId);
    onProgress?.(task);
    if (task.status === 'completed' && task.result) return task.result;
    if (task.status === 'failed') throw new Error(task.error || '简历解析失败');
    if (Date.now() >= deadline) throw new Error('简历解析超时，请稍后重试');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** 确认简历解析结果 */
export async function confirmResume(
  resumeId: string,
  payload: ResumeConfirmPayload,
): Promise<{ resumeId: string; confirmed: boolean; skillCount: number }> {
  const result = await apiPut<{ resumeId: string; confirmed: boolean; skillCount: number }>(
    `${BASE}/resumes/${encodeURIComponent(resumeId)}/confirmation`,
    payload as ResumeConfirmPayload,
  );
  invalidate('resumes');
  return result;
}

/** 我的简历列表 */
export function listMyResumes(limit = 20): Promise<{ items: ResumeRecord[]; total: number }> {
  return cached(`resumes:${limit}`, 60_000, () =>
    apiGet<{ items: ResumeRecord[]; total: number }>(`${BASE}/resumes?limit=${limit}`),
  );
}

/** 删除简历 */
export async function deleteResume(resumeId: string): Promise<{ resumeId: string; deleted: boolean }> {
  const result = await apiDelete<{ resumeId: string; deleted: boolean }>(
    `${BASE}/resumes/${encodeURIComponent(resumeId)}`,
  );
  invalidate('resumes');
  return result;
}

// ---------------------------------------------------------------------------
// 派生计算
// ---------------------------------------------------------------------------

/** 工作方式自评均分（0-100） */
export function workStyleAverage(workStyle: WorkStyleAssessment): number {
  const values = Object.values(workStyle);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + Number(value), 0) / values.length);
}

/**
 * 计算五维雷达图数据。
 *
 * 「岗位需求基准」取后端返回的 radarTargets，「我的当前能力」按职能洞察
 * CapabilityRadarChart 的口径计算：技能/学历/能力广度取匹配维度分，
 * 经验按年限相对 8 年饱和计算，综合素养取自评均分。
 */
export function buildRadarAxes(
  result: MatchResult,
  options: { workStyle: WorkStyleAssessment; experienceYears?: number | null },
): RadarAxis[] {
  const { workStyle, experienceYears } = options;
  const dimensionMap = new Map(result.dimensions.map((item) => [item.name, item.score]));
  const targets = result.radarTargets ?? {};
  const educationProfile = result.educationProfile;

  // 缺少 radarTargets 时退化为「岗位要求重要性」的最高值
  const skillTargetFallback = result.gaps.reduce((max, gap) => Math.max(max, Number(gap.importance) || 0), 0);

  const clamp = (value: number) => Math.max(0, Math.min(Number(value) || 0, 100));
  const target = (key: keyof NonNullable<MatchResult['radarTargets']>, fallback = 0) =>
    clamp(targets[key] ?? fallback);

  const experienceCurrent =
    experienceYears === undefined || experienceYears === null
      ? Math.round(result.experienceProfile?.current ?? dimensionMap.get('experience') ?? 0)
      : Math.round(Math.min(Math.max(experienceYears, 0) / 8, 1) * 100);

  return [
    {
      name: '技能',
      target: target('skills', skillTargetFallback),
      current: Math.round(dimensionMap.get('skills') ?? result.skillScore ?? 0),
    },
    { name: '经验', target: target('experience'), current: experienceCurrent },
    {
      name: '学历',
      target: target('education', educationProfile?.target || 0),
      current: Math.round(educationProfile?.current ?? dimensionMap.get('education') ?? 0),
    },
    { name: '能力广度', target: target('breadth'), current: Math.round(result.breadthScore || 0) },
    { name: '综合素养', target: target('workStyle'), current: workStyleAverage(workStyle) },
  ];
}

/** 匹配维度名称的中文标签 */
export const DIMENSION_LABELS: Record<string, string> = {
  skills: '岗位能力',
  education: '学历',
  experience: '经验',
  certificates: '证书',
};

/** 匹配总分对应的一句话结论（返回 i18n 键，由页面翻译） */
export function conclusionKey(score: number): string {
  if (score >= 80) return 'career.conclusion.high';
  if (score >= 60) return 'career.conclusion.good';
  if (score >= 40) return 'career.conclusion.basic';
  if (score >= 20) return 'career.conclusion.low';
  return 'career.conclusion.lowest';
}
