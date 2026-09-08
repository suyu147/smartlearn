/**
 * 知识图谱（职能洞察图谱）领域类型
 *
 * 字段与职能洞察后端 `GET /api/v1/graph`、`/api/v1/graph/filters`
 * 以及 `frontend/src/types/domain.ts` 中的 GraphData 保持一致。
 * smartlearn 侧只做展示，不落库、不与项目内其他模块交互。
 */

/** 三种图谱视图 */
export type GraphViewMode = 'role' | 'stack' | 'entity';

/** 技能能力层级 */
export type SkillTier = 'core' | 'advanced' | 'bonus';

/** 岗位职级 */
export type Seniority = 'entry' | 'intermediate' | 'senior' | 'unclassified';

/** 图谱节点 */
export interface GraphEntityNode {
  id: string;
  name: string;
  /** 实体类型：job / skill / certificate / course / report / signal / topic ... */
  type: string;
  /** 展示层级文案，例如「岗位」「核心能力」 */
  level?: string;
  /** 0-100 权重，用于节点大小 */
  value?: number;
  /** 各实体自己的属性，按类型不同而不同 */
  properties?: Record<string, unknown>;
}

/** 图谱关系 */
export interface GraphEntityEdge {
  id: string;
  source: string;
  target: string;
  /** 关系文案，例如「核心能力」 */
  relation?: string;
  weight?: number;
  tier?: string;
  evidenceScope?: string;
}

/** 图谱统计信息 */
export interface GraphStatistics {
  roleCount?: number;
  skillCount?: number;
  relationCount?: number;
  typeCounts?: Record<string, number>;
}

/** `GET /api/v1/graph` 返回体 */
export interface GraphData {
  viewMode?: GraphViewMode | string;
  nodes: GraphEntityNode[];
  edges: GraphEntityEdge[];
  totalNodes: number;
  totalEdges: number;
  /** 节点数是否被 limit 截断 */
  truncated?: boolean;
  appliedFilters?: Record<string, unknown>;
  statistics?: GraphStatistics;
}

/** 筛选项（下拉/胶囊的单个选项） */
export interface GraphFilterOption {
  value: string;
  label: string;
  count?: number;
  tokens?: string[];
}

/** `GET /api/v1/graph/filters` 返回体 */
export interface GraphFilterOptions {
  viewModes: GraphFilterOption[];
  techStacks: GraphFilterOption[];
  skillTiers: GraphFilterOption[];
  seniorityLevels: GraphFilterOption[];
  entityTypes: GraphFilterOption[];
  method: {
    techStack: string;
    skillTier: string;
    seniority: string;
  };
}

/** 图谱查询条件（对应后端 query 参数） */
export interface GraphQuery {
  viewMode: GraphViewMode;
  /** 岗位视图：中心岗位 id；留空由后端挑选招聘量最高的岗位 */
  roleId?: string;
  keyword?: string;
  /** 技术栈视图 */
  techStack?: string;
  skillTier?: SkillTier | '';
  /** 技术栈视图 */
  seniority?: Seniority | '';
  /** 全实体视图 */
  entityType?: string;
  limit?: number;
}

/** `GET /api/v1/graph/nodes/{id}` 返回体 */
export interface GraphNodeDetail {
  id?: string;
  name?: string;
  type?: string;
  level?: string;
  properties?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 画布场景（d3-force 渲染所需）
// ---------------------------------------------------------------------------

/** 渲染用的节点类别 key（技能按能力层级进一步细分） */
export type SceneCategory =
  | 'job'
  | 'skillCore'
  | 'skillAdvanced'
  | 'skillBonus'
  | 'posting'
  | 'certificate'
  | 'course'
  | 'major'
  | 'standard'
  | 'requirement'
  | 'report'
  | 'signal'
  | 'topic'
  | 'snapshot'
  | 'period'
  | 'other';

export interface SceneNode {
  id: string;
  label: string;
  /** 后端原始类型（job / skill / course ...） */
  type: string;
  category: SceneCategory;
  color: string;
  radius: number;
  /** 后端 level 文案 */
  level: string;
  value: number;
  properties?: Record<string, unknown>;
  /** d3-force 注入的布局字段 */
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SceneLink {
  id: string;
  source: string | SceneNode;
  target: string | SceneNode;
  relation: string;
  weight: number;
}

export interface GraphScene {
  nodes: SceneNode[];
  links: SceneLink[];
  /** 当前图里出现过的类别（用于图例），按节点数降序 */
  categories: SceneCategory[];
  truncated: boolean;
}
