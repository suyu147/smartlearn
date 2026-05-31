'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useCanvasStore } from '@/lib/store/canvas';
import { useStageStore } from '@/lib/store/stage';
import { useMemo } from 'react';
import type { PPTElement } from '@/lib/types/slides';

interface LaserOverlayProps {
  elementId: string;
}

export function LaserOverlay({ elementId }: LaserOverlayProps) {
  const scenes = useStageStore((s) => s.scenes);
  const currentSceneId = useStageStore((s) => s.currentSceneId);
  const laserOptions = useCanvasStore((s) => s.laserOptions);

  const elementCenter = useMemo(() => {
    const scene = currentSceneId ? scenes.find((s) => s.id === currentSceneId) : null;
    if (!scene || scene.type !== 'slide') return null;

    const content = scene.content as { type: string; canvas?: import('@/lib/types/slides').Slide };
    const slide = content?.canvas;
    if (!slide) return null;

    const element = slide.elements.find((el: PPTElement) => el.id === elementId);
    if (!element) return null;

    return {
      x: element.left + element.width / 2,
      y: element.top + element.height / 2,
    };
  }, [scenes, currentSceneId, elementId]);

  if (!elementCenter) return null;

  const color = laserOptions?.color || '#ff0000';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute pointer-events-none"
        style={{
          left: elementCenter.x,
          top: elementCenter.y,
          zIndex: 60,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.6, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}, 0 0 24px ${color}40`,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
