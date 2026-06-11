/**
 * 智能资源生成决策模块
 *
 * 基于节点内容分析 + 用户画像，决定当前节点需要生成哪些类型的资源。
 * 避免盲目生成全部 6 种类型，减少不必要的 API 调用和等待时间。
 */

import type { ResourceType } from '@/lib/types/resource';
import type { ProfileDimensions } from '@/lib/types/profile';

// ============================================================
// 规则引擎：资源类型 → 适用场景关键字
// ============================================================

/** code 资源仅在以下主题类型中生成 */
const CODE_KEYWORDS = [
  // 编程语言
  '编程', '代码', '函数', '变量', '类', '对象', '算法', '数据结构',
  'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'Go', 'Rust',
  'SQL', 'HTML', 'CSS', 'React', 'Vue', 'Node', 'API', 'SDK',
  // 开发工具
  'Git', 'Docker', '命令行', '终端', 'Shell', '调试', '测试',
  // 框架
  '框架', '库', '包', '模块', '依赖', '导入', '导出', '接口',
  // 算法相关
  '排序', '搜索', '递归', '迭代', '遍历', '图', '树', '哈希',
  '动态规划', '贪心', '回溯', '分治',
];

/** video 资源仅在需要操作演示的节点中生成 */
const VIDEO_KEYWORDS = [
  // 操作演示类
  '操作', '演示', '实验', '安装', '配置', '部署', '搭建',
  '调试', '运行', '启动', '设置', '连接', '创建项目',
  // 工具使用类
  '命令行', '终端', 'IDE', '编辑器', '浏览器', '开发者工具',
  // 动手实践类
  '实践', '动手', '实操', '项目实战', '案例', '示例',
  // 复杂流程类
  '流程', '步骤', '过程', '方法', '技巧',
];

// ============================================================
// 核心决策函数
// ============================================================

export interface ResourceDecision {
  /** 需要生成的资源类型列表 */
  types: ResourceType[];
  /** 决策理由 */
  reasoning: string[];
  /** 被跳过的资源类型及原因 */
  skipped: { type: ResourceType; reason: string }[];
}

export interface DecisionInput {
  /** 节点知识点列表 */
  knowledgePoints: string[];
  /** 节点标题 */
  nodeTitle: string;
  /** 用户画像（可选，用于个性化决策） */
  profile?: ProfileDimensions | null;
  /** 该节点已存在的资源类型（用于去重） */
  existingTypes?: ResourceType[];
}

/**
 * 智能决策：判断当前节点应生成哪些资源类型
 */
export function decideResourceTypes(input: DecisionInput): ResourceDecision {
  const { knowledgePoints, nodeTitle, profile, existingTypes = [] } = input;

  const allText = `${nodeTitle} ${knowledgePoints.join(' ')}`.toLowerCase();
  const reasoning: string[] = [];
  const skipped: ResourceDecision['skipped'] = [];
  const types: ResourceType[] = [];

  // 获取用户偏好格式（如果有画像）
  const userPrefers = profile?.interests?.preferredFormats ?? [];

  // --- 基础资源（总是生成） ---
  addType('document', '所有节点都需要文档说明');
  addType('mindmap', '思维导图帮助梳理知识结构');
  addType('quiz', '练习题巩固学习效果');
  addType('reading', '拓展阅读丰富知识面');

  // --- 条件资源：code ---
  if (matchKeywords(allText, CODE_KEYWORDS)) {
    addType('code', '节点涉及编程/算法内容，提供代码案例');
  } else {
    skipType('code', '节点不涉及编程内容，跳过代码生成');
  }

  // --- 条件资源：video ---
  const needsVideo = matchKeywords(allText, VIDEO_KEYWORDS);
  const userWantsVideo = userPrefers.includes('video');
  if (needsVideo || userWantsVideo) {
    const reason = needsVideo
      ? '节点包含操作演示需求'
      : '用户偏好视频格式';
    addType('video', reason);
  } else {
    skipType('video', '节点无操作演示需求且用户未偏好视频');
  }

  return { types, reasoning, skipped };

  // --- helpers ---
  function addType(type: ResourceType, reason: string) {
    if (existingTypes.includes(type)) {
      skipped.push({ type, reason: '已存在，跳过' });
      return;
    }
    types.push(type);
    reasoning.push(`[${type}] ${reason}`);
  }

  function skipType(type: ResourceType, reason: string) {
    skipped.push({ type, reason });
    reasoning.push(`[跳过 ${type}] ${reason}`);
  }
}

/**
 * 检查文本中是否包含任意关键字
 */
function matchKeywords(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}

/**
 * 快速判断：当前节点是否需要 PPT（课件）资源
 * PPT 适用于首次学习的节点，不适合纯复习/测验节点
 */
export function shouldGeneratePPT(knowledgePoints: string[], existingPPT: boolean): boolean {
  if (existingPPT) return false;
  // PPT 总是生成（教学用课件）
  return knowledgePoints.length > 0;
}