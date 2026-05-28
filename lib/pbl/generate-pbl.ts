import type { GeneratedPBLContent } from '@/lib/types/generation';
import type { SceneOutline } from '@/lib/types/generation';
import type { AICallFn, GenerationResult } from '@/lib/generation/pipeline-types';

export async function generatePBLContent(
  _config: {
    projectTopic?: string;
    projectDescription?: string;
    targetSkills?: string[];
    issueCount?: number;
    language?: string;
  },
  _languageModel: unknown,
  _options?: { onProgress?: (msg: string) => void },
): Promise<GeneratedPBLContent> {
  return {
    projectConfig: {
      title: '',
      description: '',
      tasks: [],
    },
    agents: [],
    issueboard: { issues: [] },
  };
}

export async function generatePBLSceneContent(
  _outline: SceneOutline,
  _languageModel: unknown,
  _options?: { onProgress?: (msg: string) => void },
): Promise<GeneratedPBLContent | null> {
  return null;
}
