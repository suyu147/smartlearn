'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  GitBranch,
  CheckSquare,
  Play,
  Code,
  BookOpen,
  Eye,
} from 'lucide-react';
import { useResourcesStore } from '@/lib/store/resources';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_ICONS, type ResourceType } from '@/lib/types/resource';
import { DocumentViewer } from './document-viewer';
import { MindmapViewer } from './mindmap-viewer';
import { QuizPlayer } from './quiz-player';
import { CodeRunner } from './code-runner';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  GitBranch,
  CheckSquare,
  Play,
  Code,
  BookOpen,
};

export function ResourceGrid() {
  const { resources } = useResourcesStore();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  const selected = resources.find((r) => r.id === selectedResource);

  if (resources.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">暂无学习资源</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            输入知识点并点击&ldquo;生成资源&rdquo;，多智能体将为您协同创建个性化学习资源
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {selected ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedResource(null)}
              className="mb-3"
            >
              ← 返回资源列表
            </Button>
            {selected.type === 'document' && (
              <DocumentViewer content={selected.content} title={selected.title} />
            )}
            {selected.type === 'mindmap' && (
              <MindmapViewer content={selected.content} title={selected.title} />
            )}
            {selected.type === 'quiz' && (
              <QuizPlayer content={selected.content} title={selected.title} />
            )}
            {selected.type === 'code' && (
              <CodeRunner content={selected.content} title={selected.title} />
            )}
            {(selected.type === 'video' || selected.type === 'reading') && (
              <Card>
                <CardHeader>
                  <CardTitle>{selected.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {selected.content}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resources.map((resource) => {
              const Icon = iconMap[RESOURCE_TYPE_ICONS[resource.type]] || FileText;
              return (
                <Card
                  key={resource.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => setSelectedResource(resource.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {RESOURCE_TYPE_LABELS[resource.type]}
                        </Badge>
                      </div>
                      {resource.status === 'generating' && (
                        <Badge variant="outline" className="text-xs animate-pulse">
                          生成中
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {resource.content.slice(0, 100)}...
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
