/**
 * 知识图谱服务层
 *
 * 面向 `/knowledge-graph` 页面的封装：全部走 smartlearn 自己的薄代理路由
 * `/api/v1/graph/*`，由代理层注入职能洞察的鉴权头。
 * 本模块只做展示数据的整理，不写库、不与项目内其他模块交互。
 */

import { apiGet } from '@/lib/api-client';
import type {
  GraphData,
  GraphFilterOptions,
  GraphNodeDetail,
  GraphQuery,
  GraphScene,
  SceneCategory,
  SceneLink,
  SceneNode,
} from '@/lib/graph/types';

const BASE = '/api/v1/graph';

// ---------------------------------------------------------------------------
// 视觉映射
// ---------------------------------------------------------------------------

/** 后端实体类型 → 中文标签兜底（正常情况下优先使用 /graph/filters 返回的 label） */
export const ENTITY_LABELS: Record<string, string> = {
  job: '岗位角色',
  posting: '招聘记录',
  skill: '技能实体',
  certificate: '能力证书',
  course: '学习课程',
  major: '相关专业',
  standard: '职业标准',
  requirement: '职业要求',
  report: '趋势报告',
  signal: '趋势信号',
  topic: '趋势主题',
  snapshot: '需求快照',
  period: '时间周期',
};

/** 渲染类别 → 颜色（浅色主题，与 smartlearn 现有图表配色协调） */
export const CATEGORY_COLORS: Record<SceneCategory, string> = {
  job: '#3b6ef0',
  skillCore: '#00a9a1',
  skillAdvanced: '#3d6f9e',
  skillBonus: '#b98834',
  posting: '#9aa5b1',
  certificate: '#915f9c',
  course: '#4b769f',
  major: '#6f8c58',
  standard: '#7f9290',
  requirement: '#bd7a2a',
  report: '#c14e5a',
  signal: '#e08a3c',
  topic: '#8b6f4e',
  snapshot: '#607d8b',
  period: '#587a73',
  other: '#a0aab8',
};

export const CATEGORY_LABELS: Record<SceneCategory, string> = {
  job: '岗位角色',
  skillCore: '核心能力',
  skillAdvanced: '进阶能力',
  skillBonus: '加分能力',
  posting: '招聘记录',
  certificate: '能力证书',
  course: '学习课程',
  major: '相关专业',
  standard: '职业标准',
  requirement: '职业要求',
  report: '趋势报告',
  signal: '趋势信号',
  topic: '趋势主题',
  snapshot: '需求快照',
  period: '时间周期',
  other: '其他实体',
};

/** 技能按能力层级细分；非技能按实体类型映射 */
export function categoryOf(node: {
  type?: string;
  level?: string;
  properties?: Record<string, unknown>;
}): SceneCategory {
  const type = String(node.type ?? '');
  if (type === 'job') return 'job';
  if (type === 'skill') {
    const tier = String(node.properties?.tier ?? '');
    if (tier === 'core' || node.level === CATEGORY_LABELS.skillCore) return 'skillCore';
    if (tier === 'advanced' || node.level === CATEGORY_LABELS.skillAdvanced) return 'skillAdvanced';
    if (tier === 'bonus' || node.level === CATEGORY_LABELS.skillBonus) return 'skillBonus';
    return 'skillBonus';
  }
  const known: Record<string, SceneCategory> = {
    posting: 'posting',
    certificate: 'certificate',
    course: 'course',
    major: 'major',
    standard: 'standard',
    requirement: 'requirement',
    report: 'report',
    signal: 'signal',
    topic: 'topic',
    snapshot: 'snapshot',
    period: 'period',
  };
  return known[type] ?? 'other';
}

/** 节点半径：岗位最大，其余按后端 value(0-100) 缩放 */
export function radiusOf(node: { type?: string; value?: number }): number {
  const value = Number.isFinite(node.value) ? Number(node.value) : 0;
  if (node.type === 'job') return 32;
  return Math.round(Math.min(24, Math.max(10, 10 + value / 7)));
}

/** 把后端图谱数据转换为画布场景数据 */
export function buildGraphScene(data: GraphData): GraphScene {
  const nodes: SceneNode[] = (data.nodes ?? []).map((node) => {
    const category = categoryOf(node);
    return {
      id: node.id,
      label: node.name,
      type: node.type,
      category,
      color: CATEGORY_COLORS[category],
      radius: radiusOf(node),
      level: node.level ?? '',
      value: Number.isFinite(node.value) ? Number(node.value) : 0,
      properties: node.properties,
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const links: SceneLink[] = (data.edges ?? [])
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relation: edge.relation ?? '',
      weight: Number.isFinite(edge.weight) ? Number(edge.weight) : 0,
    }));

  const counts = new Map<SceneCategory, number>();
  for (const node of nodes) counts.set(node.category, (counts.get(node.category) ?? 0) + 1);
  const categories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  return { nodes, links, categories, truncated: Boolean(data.truncated) };
}

// ---------------------------------------------------------------------------
// 查询参数
// ---------------------------------------------------------------------------

/** 各视图的默认节点上限（与职能洞察前端保持一致） */
export function defaultLimit(viewMode: GraphQuery['viewMode']): number {
  return viewMode === 'entity' ? 220 : 100;
}

/** 只保留当前视图生效的参数，其余置空，避免后端读到无意义的组合 */
export function normalizeQuery(query: GraphQuery): Record<string, string> {
  const params: Record<string, string> = {
    viewMode: query.viewMode,
    limit: String(query.limit ?? defaultLimit(query.viewMode)),
  };
  if (query.keyword?.trim()) params.keyword = query.keyword.trim();
  if (query.skillTier) params.skillTier = query.skillTier;
  if (query.viewMode === 'role' && query.roleId) params.roleId = query.roleId;
  if (query.viewMode === 'stack') {
    if (query.techStack) params.techStack = query.techStack;
    if (query.seniority) params.seniority = query.seniority;
  }
  if (query.viewMode === 'entity' && query.entityType) params.entityType = query.entityType;
  return params;
}

export function buildGraphUrl(query: GraphQuery): string {
  const search = new URLSearchParams(normalizeQuery(query)).toString();
  return `${BASE}${search ? `?${search}` : ''}`;
}

// ---------------------------------------------------------------------------
// 请求
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

/** 筛选项（视图/技术栈/层级/职级/实体类型），5 分钟内复用 */
export function fetchGraphFilters(): Promise<GraphFilterOptions> {
  return cached('graph:filters', 5 * 60 * 1000, () =>
    apiGet<GraphFilterOptions>(`${BASE}/filters`),
  );
}

/** 图谱本体：节点 + 关系 + 统计 */
export function fetchGraph(query: GraphQuery): Promise<GraphData> {
  return apiGet<GraphData>(buildGraphUrl(query));
}

/** 节点详情属性（点击节点后在详情面板展示） */
export function fetchNodeDetail(nodeId: string): Promise<GraphNodeDetail> {
  return apiGet<GraphNodeDetail>(`${BASE}/nodes/${encodeURIComponent(nodeId)}`);
}

// ---------------------------------------------------------------------------
// 详情面板：属性 → 可读条目
// ---------------------------------------------------------------------------

/** 后端属性 key → 中文标签（与职能洞察 GraphView 保持一致） */
export const PROPERTY_LABELS: Record<string, string> = {
  entity_name: '规范名称',
  role_name: '岗位名称',
  skill_type: '技能类型',
  name: '名称',
  type: '类型',
  definition: '定义',
  definition_canonical: '职业定义',
  issuer_canonical: '颁发机构',
  provider_canonical: '课程提供方',
  objectives_clean: '课程目标',
  learning_outcomes_clean: '学习成果',
  discipline_name: '学科',
  occupation_name: '职业名称',
  requirement_type: '要求类型',
  evidence_text_clean: '证据',
  source_url: '来源地址',
  published_date_clean: '发布时间',
  time_id: '周期标识',
  period: '统计周期',
  start_date: '开始日期',
  end_date: '结束日期',
  source_record_count: '来源记录数',
  posting_count: '样本量',
  roleFamily: '岗位类别',
  techStacks: '技术栈',
  seniority: '职级',
  postingCount: '招聘样本量',
  skillType: '技能类型',
  confidence: '置信度',
  tier: '能力层级',
  importance: '重要度',
  sourceCount: '来源数',
  evidenceCount: '证据数',
  evidenceScope: '证据范围',
};

export interface NodeFact {
  label: string;
  value: string;
}

const TIER_LABELS: Record<string, string> = {
  core: '核心能力',
  advanced: '进阶能力',
  bonus: '加分能力',
};

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join('、');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** 把节点属性整理成详情面板可展示的条目（最多 max 条，跳过空值与链接） */
export function buildNodeFacts(
  properties: Record<string, unknown> | undefined,
  max = 10,
): NodeFact[] {
  if (!properties) return [];
  return Object.entries(properties)
    .filter(([key, value]) => {
      if (value === '' || value === null || value === undefined) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return Boolean(PROPERTY_LABELS[key]) && !/url/i.test(key);
    })
    .slice(0, max)
    .map(([key, value]) => ({
      label: PROPERTY_LABELS[key],
      value: key === 'tier' ? TIER_LABELS[String(value)] ?? formatValue(value) : formatValue(value),
    }));
}

/** 属性里的外链（来源地址等），在详情面板单独展示 */
export function extractSourceUrls(
  properties: Record<string, unknown> | undefined,
  max = 5,
): string[] {
  if (!properties) return [];
  const urls: string[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(collect);
      return;
    }
    if (typeof value !== 'string') return;
    value
      .split(/[\s,;|]+/)
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//i.test(item))
      .forEach((item) => {
        if (!urls.includes(item)) urls.push(item);
      });
  };
  Object.entries(properties).forEach(([key, value]) => {
    if (/source|url/i.test(key)) collect(value);
  });
  return urls.slice(0, max);
}
