import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InsightError,
  RESUME_MAX_BYTES,
  insightRequest,
  resetTokenCacheForTest,
  unwrapEnvelope,
  validateResumeFile,
} from '@/lib/career/insight-proxy';

const BASE = 'http://career-insight.test';
const LOGIN_PATH = `${BASE}/api/v1/auth/login`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 生成一个 token 过期的登录响应（expiresAt 为秒级时间戳） */
function loginResponse(token: string) {
  return jsonResponse({
    code: 0,
    message: 'ok',
    data: {
      accessToken: token,
      expiresAt: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      user: { id: 'u1', username: 'user', displayName: '个人用户', role: 'personal' },
    },
  });
}

describe('unwrapEnvelope', () => {
  it('解包 { code, message, data } 信封', () => {
    expect(unwrapEnvelope<{ a: number }>({ code: 0, message: 'ok', data: { a: 1 } })).toEqual({ a: 1 });
  });

  it('缺少 data 时原样返回整个响应体', () => {
    expect(unwrapEnvelope({ status: 'healthy' })).toEqual({ status: 'healthy' });
  });

  it('FastAPI 的 { detail } 校验错误转换为 InsightError', () => {
    expect(() => unwrapEnvelope({ detail: 'There was an error parsing the body' })).toThrow(InsightError);
  });

  it('非对象响应抛出 InsightError', () => {
    expect(() => unwrapEnvelope('not-json')).toThrow(InsightError);
  });
});

describe('validateResumeFile', () => {
  function file(name: string, size: number): File {
    return { name, size } as File;
  }

  it('接受白名单内的格式', () => {
    for (const name of ['a.pdf', 'a.docx', 'a.txt', 'a.md']) {
      expect(validateResumeFile(file(name, 1024))).toBeNull();
    }
  });

  it('拒绝白名单外的格式', () => {
    expect(validateResumeFile(file('a.png', 1024))).toContain('仅支持');
  });

  it('拒绝超过 10 MB 的文件', () => {
    expect(validateResumeFile(file('a.pdf', RESUME_MAX_BYTES + 1))).toContain('10 MB');
  });

  it('拒绝空文件', () => {
    expect(validateResumeFile(file('a.pdf', 0))).toContain('为空');
  });
});

describe('insightRequest', () => {
  beforeEach(() => {
    resetTokenCacheForTest();
    process.env.CAREER_INSIGHT_BASE_URL = BASE;
    process.env.CAREER_INSIGHT_USERNAME = 'user';
    process.env.CAREER_INSIGHT_PASSWORD = 'secret';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('免登录请求不注入 Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ code: 0, message: 'ok', data: { status: 'healthy' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const data = await insightRequest<{ status: string }>({ path: '/health' });

    expect(data).toEqual({ status: 'healthy' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('需要登录时换取 token 并注入 Authorization', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loginResponse('token-a'))
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: 'ok', data: { items: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    await insightRequest({ path: '/api/v1/me/resumes', auth: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe(LOGIN_PATH);
    const [, init] = fetchMock.mock.calls[1];
    expect(init.headers.Authorization).toBe('Bearer token-a');
  });

  it('token 在有效期内复用，不会重复登录', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url) === LOGIN_PATH) return Promise.resolve(loginResponse('token-a'));
      return Promise.resolve(jsonResponse({ code: 0, message: 'ok', data: { ok: true } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await insightRequest({ path: '/api/v1/me/resumes', auth: true });
    await insightRequest({ path: '/api/v1/me/resumes', auth: true });

    const loginCalls = fetchMock.mock.calls.filter(
      ([url]) => String(url) === LOGIN_PATH,
    );
    expect(loginCalls).toHaveLength(1);
  });

  it('遇到 401 自动重新登录并重试一次', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loginResponse('token-expired'))
      .mockResolvedValueOnce(jsonResponse({ message: 'token expired' }, 401))
      .mockResolvedValueOnce(loginResponse('token-fresh'))
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: 'ok', data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await insightRequest<{ ok: boolean }>({
      path: '/api/v1/me/resumes',
      auth: true,
    });

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('5xx 转换为 502 的 InsightError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, 500)),
    );

    await expect(insightRequest({ path: '/api/v1/jobs' })).rejects.toMatchObject({
      status: 502,
    });
  });

  it('未配置 base url 时抛出 503', async () => {
    delete process.env.CAREER_INSIGHT_BASE_URL;
    await expect(insightRequest({ path: '/health' })).rejects.toMatchObject({
      status: 503,
      code: 'career_not_configured',
    });
  });

  it('把查询参数拼到 URL 上并忽略空值', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 0, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await insightRequest({
      path: '/api/v1/jobs',
      query: { page: 1, pageSize: 20, keyword: undefined },
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/api/v1/jobs');
    expect(url.searchParams.get('pageSize')).toBe('20');
    expect(url.searchParams.has('keyword')).toBe(false);
  });
});
