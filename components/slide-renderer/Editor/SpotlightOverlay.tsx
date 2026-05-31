'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useCanvasStore } from '@/lib/store/canvas';
import { useStageStore } from '@/lib/store/stage';
import { useMemo } from 'react';
import type { PPTElement } from '@/lib/types/slides';

interface SpotlightOverlayProps {
  elementId: string;
}

export function SpotlightOverlay({ elementId }: SpotlightOverlayProps) {
  const scenes = useStageStore((s) => s.scenes);
  const currentSceneId = useStageStore((s) => s.currentSceneId);
  const spotlightEffect = useCanvasStore((s) => s.spotlightEffect);

  const elementRect = useMemo(() => {
    const scene = currentSceneId ? scenes.find((s) => s.id === currentSceneId) : null;
    if (!scene || scene.type !== 'slide') return null;

    const content = scene.content as { type: string; canvas?: import('@/lib/types/slides').Slide };
    const slide = content?.canvas;
    if (!slide) return null;

    const element = slide.elements.find((el: PPTElement) => el.id === elementId);
    if (!element) return null;

    return {
      x: element.left,
      y: element.top,
      width: element.width,
      height: element.height,
    };
  }, [scenes, currentSceneId, elementId]);

  if (!elementRect || !spotlightEffect) return null;

  const padding = 12;
  const dimness = spotlightEffect.dimness ?? 0.5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 50 }}
      >
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={elementRect.x - padding}
                y={elementRect.y - padding}
                width={elementRect.width + padding * 2}
                height={elementRect.height + padding * 2}
                rx={8}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`rgba(0, 0, 0, ${dimness})`}
            mask="url(#spotlight-mask)"
          />
        </svg>
      </motion.div>
    </AnimatePresence>
  );
}
