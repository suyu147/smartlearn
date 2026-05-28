import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearningProfile, ProfileDimensions, ConversationMessage } from '@/lib/types/profile';
import { DEFAULT_DIMENSIONS } from '@/lib/types/profile';

interface LearningProfileState {
  profile: LearningProfile | null;
  isChatOpen: boolean;
  isGenerating: boolean;
  setProfile: (profile: LearningProfile | null) => void;
  updateDimensions: (dimensions: Partial<ProfileDimensions>) => void;
  setChatOpen: (open: boolean) => void;
  setGenerating: (generating: boolean) => void;
  addConversationMessage: (message: ConversationMessage) => void;
  reset: () => void;
}

export const useLearningProfileStore = create<LearningProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isChatOpen: false,
      isGenerating: false,

      setProfile: (profile) => set({ profile }),

      updateDimensions: (dimensions) =>
        set((state) => {
          if (!state.profile) return state;
          return {
            profile: {
              ...state.profile,
              dimensions: { ...state.profile.dimensions, ...dimensions },
              version: state.profile.version + 1,
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      setChatOpen: (isChatOpen) => set({ isChatOpen }),

      setGenerating: (isGenerating) => set({ isGenerating }),

      addConversationMessage: (message) =>
        set((state) => {
          if (!state.profile) return state;
          return {
            profile: {
              ...state.profile,
              conversationHistory: [...state.profile.conversationHistory, message],
            },
          };
        }),

      reset: () => set({ profile: null, isChatOpen: false, isGenerating: false }),
    }),
    { name: 'learning-profile-storage' },
  ),
);
