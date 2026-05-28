import { create } from 'zustand';

interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  [key: string]: unknown;
}

interface SpotlightEffect {
  elementId: string;
  dimness: number;
}

interface LaserEffect {
  elementId: string;
  color: string;
}

interface CanvasState {
  elements: CanvasElement[];
  selectedElementId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  whiteboardOpen: boolean;
  whiteboardClearing: boolean;
  spotlightEffect: SpotlightEffect | null;
  laserEffect: LaserEffect | null;
  playingVideoElementId: string | null;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  setSelectedElementId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setWhiteboardOpen: (open: boolean) => void;
  setWhiteboardClearing: (clearing: boolean) => void;
  setSpotlight: (elementId: string, options: { dimness: number }) => void;
  setLaser: (elementId: string, options: { color: string }) => void;
  clearAllEffects: () => void;
  playVideo: (elementId: string) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  elements: [],
  selectedElementId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  whiteboardOpen: false,
  whiteboardClearing: false,
  spotlightEffect: null,
  laserEffect: null,
  playingVideoElementId: null,
  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el,
      ),
    })),
  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    })),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (panX, panY) => set({ panX, panY }),
  setWhiteboardOpen: (whiteboardOpen) => set({ whiteboardOpen }),
  setWhiteboardClearing: (whiteboardClearing) => set({ whiteboardClearing }),
  setSpotlight: (elementId, options) =>
    set({ spotlightEffect: { elementId, dimness: options.dimness } }),
  setLaser: (elementId, options) =>
    set({ laserEffect: { elementId, color: options.color } }),
  clearAllEffects: () => set({ spotlightEffect: null, laserEffect: null }),
  playVideo: (elementId) => set({ playingVideoElementId: elementId }),
  clearCanvas: () =>
    set({ elements: [], selectedElementId: null, zoom: 1, panX: 0, panY: 0 }),
}));
