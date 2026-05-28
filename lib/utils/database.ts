export const db = {
  stageOutlines: {
    get: async (_stageId: string): Promise<{ stageId: string; outlines: unknown[]; createdAt: number; updatedAt: number } | undefined> => undefined,
    put: async (_record: { stageId: string; outlines: unknown[]; createdAt: number; updatedAt: number }) => {},
  },
} as const;
