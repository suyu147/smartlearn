# smartlearn 项目长期记忆

## 项目概况
- Next.js 15 App Directory + shadcn/ui + Tailwind v4 + react-i18next（zh-CN 默认）+ recharts + Prisma
- 前端 API 约定：`lib/api-client.ts` 的 apiFetch/apiGet/apiPost/apiPut/apiDelete/apiUpload，统一 `{success, data}` 信封
- i18n 词条文件：`lib/i18n/locales/zh-CN.json` / `en-US.json`，修改时务必用**精准字符串插入**，不要整体重写 JSON（会重排格式产生巨大 diff）
- 认证：middleware 在 `AUTH_MODE=multi` 下对 `/api/v1/((?!auth/|health).*)` 要求 Bearer token；本地测试可用环境变量 `AUTH_MODE=disabled` 覆盖，不改 .env 文件

## 能力诊断功能（2026-09-07 接入，详见当日日志）
- 架构：smartlearn 只做前端页面 + `app/api/v1/career/*` 薄代理；能力计算全部在职能洞察后端 http://121.43.156.61
- 代理模块 `lib/career/insight-proxy.ts`：服务账号 token 缓存、401 重登重试、信封解包
- 环境变量：`CAREER_INSIGHT_BASE_URL` / `CAREER_INSIGHT_USERNAME` / `CAREER_INSIGHT_PASSWORD`（当前临时用 user/123456，待用户换专用账号，只改 .env）

## 知识图谱功能（2026-09-08 接入，详见当日日志）
- 同样走薄代理：`app/api/v1/graph/*`（graph / graph/filters / graph/nodes/[nodeId]），复用同一个 insight-proxy
- 数据层 `lib/graph/{types,service}.ts`；页面 `app/knowledge-graph/`（原写死的 ML 图谱已删除）+ `components/knowledge-graph/`
- i18n 命名空间 `kg.*`

## 已知环境坑
- **next dev 在本项目下 worker 不稳定**：动态路由偶发 500（"Jest worker encountered child process exceptions"），与代码无关；验证功能用 `npx next build` + `npx next start`
- `npx next lint` 预先损坏："Cannot find module 'eslint-config-next/core-web-vitals'"
- Windows Git Bash 下 curl 发 UTF-8 中文 JSON 会乱码，接口探测改用 Python urllib（print 中文还要包一层 `io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`）
- i18n 精准插入时，nav 段正则必须加行首锚定 `(?m)^  "nav": \{`，否则会命中别的块里缩进 4 的嵌套 `"nav"`
- 测试：vitest（node 环境，`@` 别名，`**/__tests__/**/*.test.ts`）；当前 190 个测试全过
