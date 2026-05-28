import type { SceneOutline } from '@/lib/types/generation';
import type { Scene } from '@/lib/types/stage';
import type { AICallFn, GenerationCallbacks, GenerationResult } from './pipeline-types';

export interface GenerationSession {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
}

export function createGenerationSession(): GenerationSession {
  return {
    id: `session_${Date.now()}`,
    status: 'idle',
    progress: 0,
  };
}

export async function runGenerationPipeline(
  _outlines: SceneOutline[],
  _aiCall: AICallFn,
  _stageId: string,
  _callbacks?: GenerationCallbacks,
  _options?: Record<string, unknown>,
): Promise<GenerationResult<Scene[]>> {
  return {
    success: false,
    error: 'Pipeline not implemented',
  };
}
