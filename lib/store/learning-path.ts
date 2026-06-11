import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearningPath, PathNodeStatus } from '@/lib/types/learning-path';
import { useSessionsStore } from './sessions';

interface StoredPathData {
  [sessionId: string]: LearningPath;
}

interface LearningPathState {
  storedPaths: StoredPathData;
  path: LearningPath | null;
  isPlanning: boolean;

  setPath: (path: LearningPath | null) => void;
  updateNodeStatus: (nodeId: string, status: PathNodeStatus) => void;
  setPlanning: (planning: boolean) => void;
  loadPathForSession: (sessionId: string) => void;
  reset: () => void;
  getPathForSession: (sessionId: string) => LearningPath | null;
  /** 彻底删除指定会话的路径数据 */
  deleteSessionData: (sessionId: string) => void;
}

export const useLearningPathStore = create<LearningPathState>()(
  persist(
    (set, get) => ({
      storedPaths: {},
      path: null,
      isPlanning: false,

      setPath: (newPath) => {
        const sessionId = useSessionsStore.getState().currentSessionId;
        if (!sessionId) return;
        set((state) => ({
          path: newPath,
          storedPaths: newPath
            ? { ...state.storedPaths, [sessionId]: newPath }
            : state.storedPaths,
        }));
      },

      updateNodeStatus: (nodeId, status) => {
        const sessionId = useSessionsStore.getState().currentSessionId;
        set((state) => {
          const currentPath = state.path ?? state.storedPaths[sessionId ?? ''] ?? null;
          if (!currentPath) return state;
          const updatedPath = {
            ...currentPath,
            nodes: currentPath.nodes.map((n) =>
              n.id === nodeId ? { ...n, status } : n,
            ),
          };
          if (!sessionId) return { path: updatedPath };
          return {
            path: updatedPath,
            storedPaths: { ...state.storedPaths, [sessionId]: updatedPath },
          };
        });
      },

      setPlanning: (isPlanning) => set({ isPlanning }),

      loadPathForSession: (sessionId) => {
        set((state) => ({
          path: state.storedPaths[sessionId] ?? null,
        }));
      },

      reset: () => {
        const sessionId = useSessionsStore.getState().currentSessionId;
        if (!sessionId) return set({ path: null });
        set((state) => {
          const { [sessionId]: _, ...rest } = state.storedPaths;
          return { storedPaths: rest, path: null, isPlanning: false };
        });
      },

      getPathForSession: (sessionId: string) => {
        return get().storedPaths[sessionId] ?? null;
      },

      deleteSessionData: (sessionId: string) => {
        set((state) => {
          const { [sessionId]: _, ...rest } = state.storedPaths;
          return { storedPaths: rest, path: state.path, isPlanning: state.isPlanning };
        });
      },
    }),
    {
      name: 'learning-path-storage',
      version: 2,
      partialize: (state) => ({ storedPaths: state.storedPaths }),
      migrate: () => ({ storedPaths: {} }),
    },
  ),
);