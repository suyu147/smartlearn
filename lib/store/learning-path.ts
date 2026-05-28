import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearningPath, PathNodeStatus } from '@/lib/types/learning-path';

interface LearningPathState {
  path: LearningPath | null;
  isPlanning: boolean;
  setPath: (path: LearningPath | null) => void;
  updateNodeStatus: (nodeId: string, status: PathNodeStatus) => void;
  setPlanning: (planning: boolean) => void;
  reset: () => void;
}

export const useLearningPathStore = create<LearningPathState>()(
  persist(
    (set) => ({
      path: null,
      isPlanning: false,

      setPath: (path) => set({ path }),

      updateNodeStatus: (nodeId, status) =>
        set((state) => {
          if (!state.path) return state;
          return {
            path: {
              ...state.path,
              nodes: state.path.nodes.map((n) =>
                n.id === nodeId ? { ...n, status } : n,
              ),
            },
          };
        }),

      setPlanning: (isPlanning) => set({ isPlanning }),

      reset: () => set({ path: null, isPlanning: false }),
    }),
    { name: 'learning-path-storage' },
  ),
);
