export type ResourceType = 'document' | 'mindmap' | 'quiz' | 'video' | 'code' | 'reading' | 'ppt';

export type ResourceStatus = 'generating' | 'ready' | 'failed';

export interface Resource {
  id: string;
  userId: string;
  type: ResourceType;
  title: string;
  content: string;
  metadata?: {
    difficulty?: number;
    knowledgePoints?: string[];
    duration?: number;
    language?: string;
    profileUsed?: boolean;
    videoData?: import('@/lib/video/generate').VideoGenerationResult;
    pptData?: import('@/lib/types/stage').Scene[];
  };
  sourceAgent: string;
  status: ResourceStatus;
  createdAt: string;
}

export interface Quiz {
  id: string;
  type: 'choice' | 'fill' | 'short_answer' | 'coding' | 'case_analysis';
  difficulty: 1 | 2 | 3 | 4 | 5;
  knowledgePoints: string[];
  question: string;
  options?: string[];
  answer: string | string[];
  explanation: string;
  hints: string[];
  autoGradable: boolean;
}

export interface ResourceReference {
  resourceId: string;
  type: ResourceType;
  title: string;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  document: '讲解文档',
  mindmap: '思维导图',
  quiz: '练习题目',
  video: '教学视频',
  code: '代码案例',
  reading: '拓展阅读',
  ppt: '动态课件',
};

export const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  document: 'FileText',
  mindmap: 'GitBranch',
  quiz: 'CheckSquare',
  video: 'Play',
  code: 'Code',
  reading: 'BookOpen',
  ppt: 'Presentation',
};
