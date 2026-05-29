import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
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
    immer((set, get) => ({
      profile: null,
      isChatOpen: false,
      isGenerating: false,

      setProfile: (profile) => {
        console.log('Setting profile:', profile);
        set({ profile });
      },

      updateDimensions: (dimensions) => {
        console.log('Updating dimensions with:', dimensions);
        set((state) => {
          const currentDimensions = state.profile?.dimensions ?? { ...DEFAULT_DIMENSIONS };
          
          // 深度合并 dimensions
          const mergedDimensions: ProfileDimensions = {
            knowledgeBase: {
              ...currentDimensions.knowledgeBase,
              ...dimensions.knowledgeBase,
              subjects: dimensions.knowledgeBase?.subjects ?? currentDimensions.knowledgeBase.subjects,
            },
            cognitiveStyle: {
              ...currentDimensions.cognitiveStyle,
              ...dimensions.cognitiveStyle,
            },
            learningGoals: {
              ...currentDimensions.learningGoals,
              ...dimensions.learningGoals,
              shortTerm: dimensions.learningGoals?.shortTerm ?? currentDimensions.learningGoals.shortTerm,
            },
            weakPoints: {
              ...currentDimensions.weakPoints,
              ...dimensions.weakPoints,
              topics: dimensions.weakPoints?.topics ?? currentDimensions.weakPoints.topics,
              errorPatterns: dimensions.weakPoints?.errorPatterns ?? currentDimensions.weakPoints.errorPatterns,
            },
            timePreference: {
              ...currentDimensions.timePreference,
              ...dimensions.timePreference,
            },
            interests: {
              ...currentDimensions.interests,
              ...dimensions.interests,
              domains: dimensions.interests?.domains ?? currentDimensions.interests.domains,
              preferredFormats: dimensions.interests?.preferredFormats ?? currentDimensions.interests.preferredFormats,
            },
            learningPace: {
              ...currentDimensions.learningPace,
              ...dimensions.learningPace,
            },
            errorPatterns: {
              ...currentDimensions.errorPatterns,
              ...dimensions.errorPatterns,
              commonMistakes: dimensions.errorPatterns?.commonMistakes ?? currentDimensions.errorPatterns.commonMistakes,
              difficultAreas: dimensions.errorPatterns?.difficultAreas ?? currentDimensions.errorPatterns.difficultAreas,
            },
          };

          const newProfile: LearningProfile = {
            id: state.profile?.id ?? crypto.randomUUID(),
            userId: 'current',
            createdAt: state.profile?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: (state.profile?.version ?? 0) + 1,
            dimensions: mergedDimensions,
            conversationHistory: state.profile?.conversationHistory ?? [],
          };
          
          console.log('New profile created:', newProfile);
          return { profile: newProfile };
        });
      },

      setChatOpen: (isChatOpen) => set({ isChatOpen }),

      setGenerating: (isGenerating) => set({ isGenerating }),

      addConversationMessage: (message) =>
        set((state) => {
          const currentProfile = state.profile;
          const newProfile: LearningProfile = currentProfile ? {
            ...currentProfile,
            conversationHistory: [...currentProfile.conversationHistory, message],
            updatedAt: new Date().toISOString(),
          } : {
            id: crypto.randomUUID(),
            userId: 'current',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            dimensions: { ...DEFAULT_DIMENSIONS },
            conversationHistory: [message],
          };
          return { profile: newProfile };
        }),

      reset: () => set({ profile: null, isChatOpen: false, isGenerating: false }),
    })),
    { name: 'learning-profile-storage' },
  ),
);
