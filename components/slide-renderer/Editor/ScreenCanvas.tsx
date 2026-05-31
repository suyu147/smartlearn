'use client';

import { useMemo } from 'react';
import { useCanvasStore } from '@/lib/store/canvas';
import { useStageStore } from '@/lib/store/stage';
import { useSlideBackgroundStyle } from '@/lib/hooks/use-slide-background-style';
import { SpotlightOverlay } from '@/components/slide-renderer/Editor/SpotlightOverlay';
import { LaserOverlay } from '@/components/slide-renderer/Editor/LaserOverlay';
import { ScreenElement } from '@/components/slide-renderer/Editor/ScreenElement';
import type { PPTElement, SlideBackground } from '@/lib/types/slides';

export function ScreenCanvas() {
  const currentSceneId = useStageStore((s) => s.currentSceneId);
  const scenes = useStageStore((s) => s.scenes);
  const spotlightEffect = useCanvasStore((s) => s.spotlightEffect);
  const laserElementId = useCanvasStore((s) => s.laserElementId);

  const currentScene = useMemo(() => {
    if (!currentSceneId) return scenes[0] || null;
    return scenes.find((s) => s.id === currentSceneId) || null;
  }, [currentSceneId, scenes]);

  const slideData = useMemo(() => {
    if (!currentScene || currentScene.type !== 'slide') return null;
    const content = currentScene.content as { type: string; canvas?: import('@/lib/types/slides').Slide };
    return content?.canvas || null;
  }, [currentScene]);

  const { backgroundStyle } = useSlideBackgroundStyle(slideData?.background as SlideBackground | undefined);

  const elements = slideData?.elements || [];

  if (!slideData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <p className="text-gray-400">暂无内容</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={backgroundStyle}
    >
      {elements.map((element: PPTElement) => (
        <ScreenElement key={element.id} element={element} />
      ))}

      {spotlightEffect && <SpotlightOverlay elementId={spotlightEffect.elementId} />}
      {laserElementId && <LaserOverlay elementId={laserElementId} />}
    </div>
  );
}
