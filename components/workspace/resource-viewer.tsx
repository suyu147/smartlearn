'use client';

import { useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { RESOURCE_TYPE_LABELS, type Resource, type ResourceType } from '@/lib/types/resource';
import { DocumentViewer } from '@/components/resources/document-viewer';
import { MindmapViewer } from '@/components/resources/mindmap-viewer';
import { QuizPlayer } from '@/components/resources/quiz-player';
import { CodeRunner } from '@/components/resources/code-runner';
import { VideoPlayer } from '@/components/resources/video-player';
import { PPTViewer } from './ppt-viewer';
import { ReadingViewer } from '@/components/resources/reading-viewer';

interface QuizResultPayload {
  score: number;
  completed: boolean;
}

interface Props {
  resource: Resource | null;
  sessionId?: string | null;
  nodeId?: string | null;
  onQuizResult?: (resource: Resource, result: QuizResultPayload) => void;
  onResourceView?: (nodeId: string, type: ResourceType, dwellMs: number) => void;
}

export function ResourceViewer({ resource, sessionId, nodeId, onQuizResult, onResourceView }: Props) {
  const startedAtRef = useRef<number | null>(null);
  const previousResourceRef = useRef<Resource | null>(null);

  useEffect(() => {
    const reportView = (target: Resource | null) => {
      if (!target || !sessionId || !nodeId || !onResourceView || startedAtRef.current === null) return;
      const dwellMs = Math.round(performance.now() - startedAtRef.current);
      if (dwellMs > 0) onResourceView(nodeId, target.type, dwellMs);
    };

    reportView(previousResourceRef.current);
    previousResourceRef.current = resource;
    startedAtRef.current = resource ? performance.now() : null;

    return () => {
      reportView(resource);
    };
  }, [nodeId, onResourceView, resource, sessionId]);

  if (!resource) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium text-muted-foreground">点击左侧资源开始学习</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            选择学习路径中的一个资源，它将在这里展示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {RESOURCE_TYPE_LABELS[resource.type]}
        </span>
        <h2 className="text-lg font-semibold">{resource.title}</h2>
      </div>

      {resource.type === 'document' && <DocumentViewer content={resource.content} title={resource.title} />}
      {resource.type === 'mindmap' && <MindmapViewer content={resource.content} title={resource.title} />}
      {resource.type === 'quiz' && (
        <QuizPlayer
          content={resource.content}
          title={resource.title}
          onResult={(result) => onQuizResult?.(resource, result)}
        />
      )}
      {resource.type === 'code' && <CodeRunner content={resource.content} title={resource.title} />}
      {resource.type === 'video' && (
        <VideoPlayer content={resource.content} title={resource.title} videoData={resource.metadata?.videoData} />
      )}
      {resource.type === 'reading' && <ReadingViewer content={resource.content} title={resource.title} />}
      {resource.type === 'ppt' && (
        <PPTViewer scenes={resource.metadata?.pptData} />
      )}
    </div>
  );
}