/**
 * 能力诊断（职能洞察）领域类型
 *
 * 字段命名与职能洞察 `frontend/src/types/domain.ts` 保持一致，
 * 代理层原样透传，前端不做字段映射。
 */

/** 分页信封 */
export interface PageData<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** 服务健康探测结果 */
export interface CareerHealth {
  status: 'healthy' | 'degraded';
  neo4j: boolean;
  mysql: boolean;
  agentProvider?: string;
  agentConfigured?: boolean;
}

/** 岗位技能 */
export interface JobSkill {
  id: string;
  name: string;
  weight: number;
  confidence?: string;
}

/** 岗位列表项 */
export interface JobSummary {
  id: string;
  name: string;
  field: string;
  postingCount: number;
  sourceCount: number | string;
  firstSeen: string;
  lastSeen: string;
  skills: JobSkill[];
  trendLabel?: string;
  trendDirection?: 'up' | 'down' | 'stable' | 'new' | 'insufficient';
}

/** 技能差距项 */
export interface SkillGap {
  skillId: string;
  skill: string;
  status: 'matched' | 'partial' | 'missing';
  level: string;
  importance: number;
  jobEvidence?: string;
  sourceUrls?: string[];
}

/** 匹配维度明细 */
export interface MatchDimension {
  name: string;
  weight: number;
  score: number;
}

/** 学历画像 */
export interface EducationProfile {
  provided: string;
  providedRank: number;
  required: string;
  requiredRank: number;
  current: number;
  target: number;
  matchScore: number;
  evidenceCount: number;
}

/** 经验画像 */
export interface ExperienceProfile {
  providedYears: number | null;
  requiredYears: number | null;
  current: number;
  target: number;
}

/** 手动匹配请求体 */
export interface ManualMatchPayload {
  targetRoleId: string;
  skills?: string[];
  education?: string;
  experienceYears?: number | null;
  certificates?: string[];
  resumeId?: string;
  workStyleScore?: number | null;
}

/** 匹配结果 */
export interface MatchResult {
  reportId: string;
  roleId: string;
  roleName: string;
  score: number;
  skillScore: number;
  breadthScore?: number;
  workStyleScore?: number;
  experienceRequirementMinYears?: number | null;
  algorithmVersion?: string;
  radarVersion?: string;
  /** 五维雷达图的「岗位需求基准」 */
  radarTargets?: {
    skills?: number;
    experience?: number;
    education?: number;
    breadth?: number;
    workStyle?: number;
  };
  dimensions: MatchDimension[];
  gaps: SkillGap[];
  notice: string;
  educationProfile?: EducationProfile;
  experienceProfile?: ExperienceProfile;
}

/** 推荐岗位项 */
export interface RecommendationItem {
  roleId: string;
  roleName: string;
  score: number;
  skillScore?: number;
  topGaps: string[];
  algorithmVersion?: string;
}

/** 学习方式自评（用于雷达图「综合素养」维） */
export interface WorkStyleAssessment {
  collaboration: number;
  adaptability: number;
  resilience: number;
  initiative: number;
}

export const DEFAULT_WORK_STYLE: WorkStyleAssessment = {
  collaboration: 60,
  adaptability: 60,
  resilience: 60,
  initiative: 60,
};

export const WORK_STYLE_ITEMS = [
  { key: 'collaboration', label: '沟通协作' },
  { key: 'adaptability', label: '学习适应' },
  { key: 'resilience', label: '抗压执行' },
  { key: 'initiative', label: '主动推进' },
] as const satisfies readonly { key: keyof WorkStyleAssessment; label: string }[];

/** 简历解析出的技能 */
export interface ResumeSkillItem {
  skill_id: string;
  skill_name: string;
  evidence: string;
  confidence: number;
}

/** 简历记录 */
export interface ResumeRecord {
  resumeId: string;
  skills: ResumeSkillItem[];
  education: string;
  experienceYears?: number | null;
  certificates: string[];
  warnings: string[];
  ocr?: { engine: string; language: string; pages: number } | null;
  confirmed?: boolean;
  fileName?: string;
  uploadedAt?: string;
  textPreview?: string;
}

/** 简历确认请求体 */
export interface ResumeConfirmPayload {
  skills?: string[];
  education?: string;
  experienceYears?: number | null;
  certificates?: string[];
}

/** 上传简历后返回的异步任务 */
export interface UploadTask {
  taskId: string;
  status: string;
  progress: number;
}

/** 解析任务状态 */
export interface ParseTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: ResumeRecord;
  error?: string | null;
}

/** 学习路径周任务 */
export interface LearningTask {
  period: string;
  title: string;
  actions: string[];
  deliverable: string;
}

/** 学习路径课程 */
export interface LearningCourse {
  name: string;
  url?: string;
  provider?: string;
}

/** 学习路径阶段 */
export interface LearningStage {
  stage: number;
  name: string;
  duration: string;
  estimatedHoursPerWeek?: number;
  goal?: string;
  skills: string[];
  prerequisites?: string[];
  courses?: Array<LearningCourse | string>;
  certificates?: string[];
  weeklyTasks?: LearningTask[];
  practiceProject?: string;
  acceptanceCriteria?: string[];
  outcome: string;
  planVersion?: string;
}

/** 学习路径 */
export interface LearningPath {
  id: string;
  reportId: string;
  stages: LearningStage[];
}

/** 雷达图单个轴 */
export interface RadarAxis {
  name: string;
  target: number;
  current: number;
}
