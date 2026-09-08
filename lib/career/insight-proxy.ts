/**
 * 职能洞察（Career Insight）服务端代理
 *
 * 「能力诊断」页面不直连职能洞察后端（其 CORS 只放行自己的前端源），
 * 而是由 smartlearn 的服务端路由做薄转发。本模块提供转发所需的公共能力：
 *
 *   1. 服务账号登录 + token 缓存（职能洞察 token 有效期 12 小时），对浏览器完全透明
 *   2. 统一解包 `{ code, message, data }` 信封并转换为 smartlearn 的 `{ success, data }`
 *   3. 5xx / 超时 / 401 等异常转换为统一的 smartlearn 风格错误响应
 *
 * 仅可在服务端（Route Handler）中引用。
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

/** 单次转发请求的超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 30_000;
/** 上传简历的接口解析较慢，单独放宽超时 */
export const UPLOAD_TIMEOUT_MS = 120_000;
/** 提前多少毫秒认为 token 已过期（12 小时有效期，留 5 分钟余量） */
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

function baseUrl(): string {
  const value = process.env.CAREER_INSIGHT_BASE_URL?.trim();
  if (!value) {
    throw new InsightError(
      'CAREER_INSIGHT_BASE_URL is not configured',
      503,
      'career_not_configured',
    );
  }
  return value.replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// 错误类型
// ---------------------------------------------------------------------------

export class InsightError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'career_insight_error') {
    super(message);
    this.name = 'InsightError';
    this.status = status;
    this.code = code;
  }
}

/** 统一的错误响应：{ success: false, error: { message, code } } */
export function insightErrorResponse(error: unknown): NextResponse {
  if (error instanceof InsightError) {
    return NextResponse.json(
      { success: false, error: { message: error.message, code: error.code } },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  // AbortError 由超时控制抛出
  if (error instanceof DOMException && error.name === 'AbortError') {
    return NextResponse.json(
      {
        success: false,
        error: { message: '职业数据服务响应超时，请稍后重试', code: 'career_insight_timeout' },
      },
      { status: 504 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: { message: `职业数据服务不可用：${message}`, code: 'career_insight_unavailable' },
    },
    { status: 502 },
  );
}

// ---------------------------------------------------------------------------
// Token 缓存
// ---------------------------------------------------------------------------

interface CachedToken {
  value: string;
  /** 绝对过期时间戳（毫秒） */
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;
let tokenPromise: Promise<string> | null = null;

function currentToken(): string | null {
  if (!tokenCache) return null;
  // 临近过期就当作已过期，避免使用即将失效的 token
  if (tokenCache.expiresAt - TOKEN_EXPIRY_MARGIN_MS <= Date.now()) {
    tokenCache = null;
    return null;
  }
  return tokenCache.value;
}

async function login(): Promise<string> {
  const username = process.env.CAREER_INSIGHT_USERNAME?.trim();
  const password = process.env.CAREER_INSIGHT_PASSWORD?.trim();
  if (!username || !password) {
    throw new InsightError(
      'CAREER_INSIGHT_USERNAME / CAREER_INSIGHT_PASSWORD is not configured',
      503,
      'career_not_configured',
    );
  }

  const response = await fetch(`${baseUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, portal: 'personal' }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new InsightError(
      '职业数据服务账号登录失败，请检查 CAREER_INSIGHT_USERNAME / CAREER_INSIGHT_PASSWORD',
      503,
      'career_login_failed',
    );
  }

  const payload = (await response.json()) as {
    code?: number;
    message?: string;
    data?: { accessToken?: string; expiresAt?: number | string };
  };
  const accessToken = payload.data?.accessToken;
  if (!accessToken) {
    throw new InsightError('职业数据服务登录响应缺少 accessToken', 502, 'career_login_invalid');
  }

  // expiresAt 为秒级时间戳；缺失时按 12 小时有效期兜底
  const expiresAtSeconds = Number(payload.data?.expiresAt ?? 0);
  const expiresAt = expiresAtSeconds > 0 ? expiresAtSeconds * 1000 : Date.now() + 12 * 60 * 60 * 1000;

  tokenCache = { value: accessToken, expiresAt };
  return accessToken;
}

/** 获取可用 token（并发共享同一次登录请求） */
async function getToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    tokenCache = null;
    tokenPromise = null;
  }
  const cached = currentToken();
  if (cached) return cached;
  if (tokenPromise) return tokenPromise;

  tokenPromise = login().finally(() => {
    tokenPromise = null;
  });
  return tokenPromise;
}

/** 仅供测试使用：清空 token 缓存 */
export function resetTokenCacheForTest(): void {
  tokenCache = null;
  tokenPromise = null;
}

// ---------------------------------------------------------------------------
// 转发
// ---------------------------------------------------------------------------

export interface InsightRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 相对路径，例如 `/api/v1/jobs` 或 `/health` */
  path: string;
  /** 查询参数 */
  query?: Record<string, string | number | undefined>;
  /** JSON 请求体 */
  body?: unknown;
  /** 表单请求体（简历上传），与 body 互斥 */
  formData?: FormData;
  /** 是否需要携带职能洞察的登录态 */
  auth?: boolean;
  /** 自定义超时（毫秒） */
  timeoutMs?: number;
}

/** 解析职能洞察信封，失败时抛出 InsightError */
export function unwrapEnvelope<T>(payload: unknown): T {
  if (payload === null || typeof payload !== 'object') {
    throw new InsightError('职业数据服务返回了无法识别的响应', 502, 'career_bad_response');
  }
  const envelope = payload as { code?: number; message?: string; data?: T };
  // 部分错误路径（如 FastAPI 校验失败）不经过信封，直接是 { detail: ... }
  const detail = (payload as { detail?: unknown }).detail;
  if (envelope.code === undefined && detail !== undefined) {
    const text = typeof detail === 'string' ? detail : JSON.stringify(detail);
    throw new InsightError(`职业数据服务拒绝了该请求：${text}`, 400, 'career_insight_rejected');
  }
  return (envelope.data ?? payload) as T;
}

/**
 * 向职能洞察发一次请求，返回已解包的 data。
 * 遇到 401 会自动重新登录并重试一次。
 */
export async function insightRequest<T>(options: InsightRequestOptions): Promise<T> {
  const url = new URL(baseUrl() + options.path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // FormData 必须让 fetch 自己设置带 boundary 的 Content-Type
    if (options.formData === undefined) headers['Content-Type'] = 'application/json';

    return fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.formData
        ? options.formData
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  };

  const needsAuth = options.auth ?? false;
  let response = await send(needsAuth ? await getToken() : null);

  if (response.status === 401 && needsAuth) {
    // token 过期：强制重登后重试一次
    response = await send(await getToken(true));
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new InsightError('职业数据服务返回了非 JSON 响应', 502, 'career_bad_response');
    }
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ??
      (payload as { detail?: string })?.detail ??
      `职业数据服务返回 HTTP ${response.status}`;
    throw new InsightError(message, response.status >= 500 ? 502 : response.status, 'career_insight_failed');
  }

  return unwrapEnvelope<T>(payload);
}

/** 成功响应：{ success: true, data } */
export function insightSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, data }, init);
}

/**
 * Route Handler 的统一包装：捕获异常并转换为 smartlearn 风格错误响应。
 */
export async function withInsight<T>(
  handler: () => Promise<T>,
  init?: ResponseInit,
): Promise<NextResponse> {
  try {
    return insightSuccess(await handler(), init);
  } catch (error) {
    return insightErrorResponse(error);
  }
}

/** 简历上传的类型与大小白名单（与职能洞察后端保持一致） */
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'] as const;

export function validateResumeFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const ok = RESUME_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!ok) return `仅支持 ${RESUME_ALLOWED_EXTENSIONS.join(' / ')} 格式的简历`;
  if (file.size > RESUME_MAX_BYTES) return '简历文件不能超过 10 MB';
  if (file.size === 0) return '简历文件为空';
  return null;
}
