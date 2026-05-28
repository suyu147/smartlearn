import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Resource, ResourceType } from '@/lib/types/resource';

interface ResourcesState {
  resources: Resource[];
  generatingTypes: ResourceType[];
  addResource: (resource: Resource) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  removeResource: (id: string) => void;
  setGeneratingTypes: (types: ResourceType[]) => void;
  getResourcesByType: (type: ResourceType) => Resource[];
  reset: () => void;
}

export const useResourcesStore = create<ResourcesState>()(
  persist(
    (set, get) => ({
      resources: [],
      generatingTypes: [],

      addResource: (resource) =>
        set((state) => ({ resources: [...state.resources, resource] })),

      updateResource: (id, updates) =>
        set((state) => ({
          resources: state.resources.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      removeResource: (id) =>
        set((state) => ({ resources: state.resources.filter((r) => r.id !== id) })),

      setGeneratingTypes: (generatingTypes) => set({ generatingTypes }),

      getResourcesByType: (type) => get().resources.filter((r) => r.type === type),

      reset: () => set({ resources: [], generatingTypes: [] }),
    }),
    { name: 'resources-storage' },
  ),
);
