'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useCanvasStore } from '@/lib/store/canvas';
import { useStageStore } from '@/lib/store/stage';
import { SceneProvider } from '@/lib/contexts/scene-context';
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar';
import { ScreenCanvas } from '@/components/slide-renderer/Editor/ScreenCanvas';
import type { Scene } from '@/lib/types/stage';

interface CanvasAreaProps {
  currentScene: Scene | null;
  currentSceneIndex: number;
  scenesCount: number;
  mode: string;
  engineState: string;
  whiteboardOpen: boolean;
  sidebarCollapsed: boolean;
  chatCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onPlayPause: () => void;
  onWhiteboardClose: () => void;
  isPresenting: boolean;
  onTogglePresentation: () => void;
  showStopDiscussion: boolean;
  onStopDiscussion: () => void;
}

export function CanvasArea({
  currentScene,
  currentSceneIndex,
  scenesCount,
  mode,
  engineState,
  whiteboardOpen,
  sidebarCollapsed,
  chatCollapsed,
  onToggleSidebar,
  onToggleChat,
  onPrevSlide,
  onNextSlide,
  onPlayPause,
  onWhiteboardClose,
  isPresenting,
  onTogglePresentation,
  showStopDiscussion,
  onStopDiscussion,
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setCanvasScale = useCanvasStore((s) => s.setCanvasScale);

  const slideContent = useMemo(() => {
    if (!currentScene) return null;
    if (currentScene.type === 'slide' && currentScene.content?.type === 'slide') {
      return (currentScene.content as { canvas?: import('@/lib/types/slides').Slide }).canvas || null;
    }
    return null;
  }, [currentScene]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 40;
      const containerHeight = container.clientHeight - 40;
      const slideRatio = 1000 / 562.5;
      const containerRatio = containerWidth / containerHeight;

      let scale: number;
      if (containerRatio > slideRatio) {
        scale = containerHeight / 562.5;
      } else {
        scale = containerWidth / 1000;
      }

      setCanvasScale(scale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [setCanvasScale]);

  return (
    <div className="flex flex-col h-full">
      {/* Slide viewport */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800 overflow-hidden"
      >
        {slideContent ? (
          <SceneProvider>
            <div
              className="relative bg-white shadow-2xl"
              style={{
                width: 1000,
                height: 562.5,
                transform: `scale(${useCanvasStore.getState().canvasScale})`,
                transformOrigin: 'center center',
              }}
            >
              <ScreenCanvas />
            </div>
          </SceneProvider>
        ) : (
          <div className="text-gray-400 dark:text-gray-500 text-center">
            <p className="text-lg">暂无幻灯片内容</p>
            <p className="text-sm mt-1">请先生成课件</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        currentSceneIndex={currentSceneIndex}
        scenesCount={scenesCount}
        engineState={engineState}
        onPrevSlide={onPrevSlide}
        onNextSlide={onNextSlide}
        onPlayPause={onPlayPause}
        onWhiteboardClose={onWhiteboardClose}
        isPresenting={isPresenting}
        onTogglePresentation={onTogglePresentation}
        whiteboardOpen={whiteboardOpen}
        sidebarCollapsed={sidebarCollapsed}
        chatCollapsed={chatCollapsed}
        onToggleSidebar={onToggleSidebar}
        onToggleChat={onToggleChat}
        showStopDiscussion={showStopDiscussion}
        onStopDiscussion={onStopDiscussion}
      />
    </div>
  );
}
