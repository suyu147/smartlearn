你正在帮我把一个 Next.js 项目从"前端驱动调多个 API"改造为"后端 LangGraph StateGraph 驱动"。



\## 🎯 目标



把资源生成/节点规划/评估等逻辑从前端 workspace/page.tsx 和分散的 API 路由中提取出来，统一放到 LangGraph 的 StateGraph 中编排。目标是让评委读代码时能直观看到："有多个 Agent 在协作"，而不是"前端 for 循环调 API"。



\## 🗂️ 必须先读的 5 个文件



按顺序读，读了再动手改代码：



1\. `后端Graph驱动改造计划书.md` — 架构设计文档，所有改造都按这个来，不要自己设计新架构

2\. `lib/orchestration/director-graph.ts` — 已有的 LangGraph 骨架，了解 StateGraph 写法和 config.writer() 推送事件的方式

3\. `app/api/generate/resources/route.ts` — 当前资源生成的核心路由（约350行），生成函数都是私有函数（generateDocumentResource/generateDefaultResource/generateReadingResource），需要提取到 Graph 节点中

4\. `app/workspace/page.tsx` — 前端编排入口（约700行），要改造成只消费 SSE 事件的薄消费者

5\. `lib/ai/llm.ts` — streamLLM/callLLM 工具函数，必须复用



\## 🧱 已经存在、必须直接复用的基础设施



这些代码已经工作，直接 import 使用，不要重写：



\- `streamLLM()` 和 `callLLM()` in `lib/ai/llm.ts` — 调 LLM

\- `parseJsonResponse()` in `lib/generation/json-repair.ts` — 从 LLM 文本中容错提取 JSON

\- `resolveModel()` in `lib/server/resolve-model.ts` — 从 aiConfig 创建模型实例

\- `decideNodeResourcePlan()` / `buildNodeDecisionContext()` in `lib/generation/resource-decision.ts` — 规则层资源决策

\- Prompt 模板 in `lib/prompts/\*.json` — path-plan-prompt / evaluation-prompt / resource-prompts / tutor-chat-prompt

\- `useLearningPathStore` in `lib/store/learning-path.ts` — 前端路径/节点/资源的 Zustand store

\- `useResourceDecisionsStore` in `lib/store/resource-decisions.ts` — 前端资源决策记录

\- 类型定义 in `lib/types/` — LearningPathNode / Resource / ProfileDimensions 等，不可修改



注意：`app/api/generate/resources/route.ts` 中的 generateDocumentResource / generateDefaultResource / generateReadingResource 是私有函数，不能直接 import。需要将它们提取到 `lib/learning-graph/helpers/` 目录下作为独立模块导出，然后 Graph 节点和旧 API 路由都引用这个模块。



\## 🔧 LangGraph SSE 集成方式



参考 director-graph.ts 的做法：

1\. Graph 节点通过 `config.configurable.writer` 推送事件，writer 类型是 `(event: LearnEvent) => void`

2\. `/api/learn/route.ts` 中创建 ReadableStream，把 writer 绑定到 `controller.enqueue`

3\. 调用 `graph.stream(initialState, { configurable: { writer } })`

4\. 不需要使用 LangGraph 的内置 checkpointing，每次请求都是无状态的

5\. 不要使用 `lib/orchestration/ai-sdk-adapter.ts`（它是空实现），直接用 `streamLLM()` 调 LLM



\## 🏗️ 按计划书的 Graph 架构来实现



遵循 `后端Graph驱动改造计划书.md` 中的 §3-§5 设计，不要自己发明新架构。



\### Graph 状态结构（State）



```typescript

{

&#x20; action: 'start' | 'node\_complete' | 'quiz\_result' | 'tutor\_chat',

&#x20; sessionId: string,

&#x20; profile: ProfileDimensions,              // 画像维度

&#x20; learningGoal: string,                    // 用户原始描述

&#x20; completedNodes: LearningPathNode\[],      // 已学完的节点

&#x20; currentNodeId: string | null,            // 当前节点 ID

&#x20; currentNode: LearningPathNode | null,    // 规划出的当前节点

&#x20; quizResults: QuizResult\[],               // 测验结果

&#x20; message: string,                         // 辅导消息

&#x20; aiConfig: { providerId, modelId, apiKey, baseUrl },

&#x20; generatedResources: Resource\[],          // 生成的资源

&#x20; evaluationResult: EvaluationResult | null,

&#x20; updatedProfile: ProfileDimensions | null,

&#x20; pptScenes: Scene\[] | null,

&#x20; phase: string,                           // 当前阶段

}

```



\### Graph 节点（按 `lib/learning-graph/nodes/` 目录结构建文件）



1\. \*\*`router.ts`\*\* — 根据 `action` 字段路由到对应节点，作为 Graph 入口

2\. \*\*`plan-node.ts`\*\* — 调用 LLM 规划 1 个节点。参考计划书 §5.3

3\. \*\*`generate-resources.ts`\*\* — 先用 decideNodeResourcePlan() 做规则层决策，再调用生成函数。参考计划书 §5.4

4\. \*\*`evaluate.ts`\*\* — 根据 quiz 结果评估节点完成度。参考计划书 §5.5

5\. \*\*`update-profile.ts`\*\* — 用评估结果增量更新画像（随学随新）。参考计划书 §5.6

6\. \*\*`tutor-respond.ts`\*\* — 对话式辅导。参考计划书 §5.7



文件 `graph.ts` 把上述节点组装成 StateGraph，定义 `Annotation.Root`。参考 `director-graph.ts` 的写法。



\### Graph 拓扑

START → router

router ──(start)──→ plan\_node → generate\_resources → END

router ──(node\_complete)──→ evaluate → update\_profile → plan\_node → generate\_resources → END

router ──(quiz\_result)──→ evaluate → update\_profile → END

router ──(tutor\_chat)──→ tutor\_respond → END





\### API 入口



新建 `app/api/learn/route.ts`，替代 workspace/page.tsx 中对多个 API 的分散调用。参考计划书 §5.1。



\### 前端改造



`app/workspace/page.tsx` 中的编排逻辑（约500行）删除，改为只调用 `/api/learn` 并消费 SSE 事件。参考计划书 §5.5。



\## ✅ 实施步骤



\### 阶段一：把 Graph 跑起来（最小可运行闭环）



\*\*目标\*\*: `POST /api/learn` 能收到请求 → Graph 执行 plan\_node → 返回 1 个节点 → 前端展示



1\. 先在 `lib/learning-graph/` 目录下新建 `graph.ts` + `state.ts` + `nodes/router.ts` + `nodes/plan-node.ts`

2\. `graph.ts` 里只放 `plan\_node` 一个节点，让 StateGraph 先跑通

3\. 新建 `app/api/learn/route.ts`，调用 `graph.stream()` 并转发 SSE 到前端

4\. 写一个最小的前端测试：在 workspace/page.tsx 临时加一个按钮调 `POST /api/learn { action: "start", ... }`

5\. `npm run build` 通过 → 阶段一完成



\*\*验收标准\*\*: POST /api/learn body: { action: "start", profile: {...}, goal: "...", aiConfig: {...} } 返回 SSE 流，包含 { type: "node\_ready", node: {...} } 事件，node 符合 LearningPathNode 类型



\### 阶段二：接入资源生成



\*\*目标\*\*: Graph 走完 plan\_node → generate\_resources 两节点链路



1\. 将 `app/api/generate/resources/route.ts` 中的 generateDocumentResource/generateDefaultResource/generateReadingResource 提取到 `lib/learning-graph/helpers/resource-generators.ts`

2\. 新建 `nodes/generate-resources.ts` — 复用 decideNodeResourcePlan() 和提取出的生成函数

3\. 在 graph.ts 加入 generate\_resources 节点，建立 router → plan\_node → generate\_resources 的边

4\. 前端 workspace/page.tsx 的 generateNodeResources 改为消费 /api/learn 的 SSE 事件

5\. `npm run build` 通过



\### 阶段三：接入评估 + 画像增量更新



\*\*目标\*\*: evaluate → update\_profile → 下次 plan\_node 能感知画像变化



1\. 新建 `nodes/evaluate.ts` + `nodes/update-profile.ts`

2\. 加入 Graph，建立完整链路

3\. /api/learn 接收 action="node\_complete" 请求

4\. `npm run build` 通过



\### 阶段四：接入辅导 + 完善前端



\*\*目标\*\*: 用户提问 → tutor\_respond → 返回回答



1\. 新建 `nodes/tutor-respond.ts`

2\. /api/learn 接收 action="tutor\_chat" 请求

3\. 完善 workspace/page.tsx 对 SSE 事件的渲染

4\. `npm run build` 通过



\### 阶段五：清理旧文件



1\. 可以安全删除的文件：

&#x20;  - `lib/orchestration/director-graph.ts` — 旧骨架

&#x20;  - `lib/orchestration/stateless-generate.ts` — 空实现

&#x20;  - `lib/orchestration/director-prompt.ts` — 空实现

&#x20;  - `lib/orchestration/tool-schemas.ts` — 空实现

&#x20;  - `lib/orchestration/ai-sdk-adapter.ts` — 空实现

&#x20;  - `lib/orchestration/prompt-builder.ts` — 课堂场景，不适用

&#x20;  - `lib/orchestration/registry/` — 课堂 Agent 注册表

2\. 保留但标记为 DEPRECATED 的文件：

&#x20;  - `app/api/generate/resources/route.ts` — 逻辑已融入 Graph，保留作为备用入口

&#x20;  - `app/api/path/plan/route.ts` — 同上

&#x20;  - `app/api/evaluate/route.ts` — 同上

&#x20;  - `app/api/tutor/chat/route.ts` — 同上



\### 阶段六：完善文档



1\. 从 `第十五届中国软件杯大学生软件设计大赛A3赛题赛题初步解读\_0424.html` 中提取赛题要求

2\. 加到 `后端Graph驱动改造计划书.md` 末尾作为附录



\## 🚫 硬性约束（违反就立即失败）



1\. \*\*绝不修改 `lib/types/` 里的任何类型定义\*\* — LearningPathNode/Resource/ProfileDimensions 保持不变

2\. \*\*保持 SSE 事件格式兼容\*\* — resource\_delta/node\_ready/evaluation\_result/profile\_update 等事件格式与现有前端解析逻辑一致

3\. \*\*复用现有工具函数\*\* — streamLLM/callLLM/parseJsonResponse/resolveModel/decideNodeResourcePlan 等已经稳定工作，不要重写

4\. \*\*每个 Graph 节点文件不超过 150 行\*\* — 超过则将辅助逻辑提取到 `lib/learning-graph/helpers/`

5\. \*\*Graph 节点只接受 State 返回 State 的部分字段\*\* — 不要引入新的外部依赖

6\. \*\*使用正确的类型名\*\* — LearningPathNode（不是 Node）, ProfileDimensions（不是 LearnerProfile）, Resource

