'use client';

import { BookOpen } from 'lucide-react';
import type { Resource } from '@/lib/types/resource';
import { RESOURCE_TYPE_LABELS } from '@/lib/types/resource';
import { DocumentViewer } from '@/components/resources/document-viewer';
import { MindmapViewer } from '@/components/resources/mindmap-viewer';
import { QuizPlayer } from '@/components/resources/quiz-player';
import { CodeRunner } from '@/components/resources/code-runner';
import { VideoPlayer } from '@/components/resources/video-player';
import { PPTViewer } from './ppt-viewer';

interface Props {
  resource: Resource | null;
}

export function ResourceViewer({ resource }: Props) {
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
      {resource.type === 'quiz' && <QuizPlayer content={resource.content} title={resource.title} />}
      {resource.type === 'code' && <CodeRunner content={resource.content} title={resource.title} />}
      {resource.type === 'video' && (
        <VideoPlayer content={resource.content} title={resource.title} videoData={resource.metadata?.videoData} />
      )}
      {resource.type === 'reading' && <DocumentViewer content={resource.content} title={resource.title} />}
      {resource.type === 'ppt' && (
        <PPTViewer scenes={resource.metadata?.pptData} />
      )}
    </div>
  );
}