import { create } from 'zustand';

export const PAINT_COLORS = ['#AACCD6', '#4382DF', '#FFE8BE', '#F7DD7D'];

type ClayState = {
  resetTick: number;
  wireframe: boolean;
  shapeKeyActive: boolean;
  selectedColor: string;
  status: string;
  meshInfo: {
    vertexCount: number;
    triangleCount: number;
    hasUv: boolean;
    hasColor: boolean;
    morphTargets: string[];
  } | null;
  hit: { x: number; y: number; z: number } | null;
  setStatus: (s: string) => void;
  reset: () => void;
  toggleWireframe: () => void;
  toggleShapeKey: () => void;
  setSelectedColor: (c: string) => void;
  setMeshInfo: (info: ClayState['meshInfo']) => void;
  setHit: (hit: ClayState['hit']) => void;
};

export const useClayStore = create<ClayState>((set) => ({
  resetTick: 0,
  wireframe: false,
  shapeKeyActive: false,
  selectedColor: PAINT_COLORS[1],
  status: 'init',
  meshInfo: null,
  hit: null,
  setStatus: (s) => set({ status: s }),
  reset: () => set((s) => ({ resetTick: s.resetTick + 1 })),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
  toggleShapeKey: () => set((s) => ({ shapeKeyActive: !s.shapeKeyActive })),
  setSelectedColor: (c) => set({ selectedColor: c }),
  setMeshInfo: (info) => set({ meshInfo: info }),
  setHit: (hit) => set({ hit }),
}));
