'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, FileText, ChevronDown, ChevronUp, Image as ImageIcon, Palette } from 'lucide-react';
import { parseVideoScript, type VideoGenerationResult } from '@/lib/video/generate';

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}分${sec > 0 ? sec + '秒' : ''}` : `${sec}秒`;
}

export function VideoPlayer({ content, title, videoData }: { content: string; title: string; videoData?: VideoGenerationResult }) {
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [showFullScript, setShowFullScript] = useState(false);

  const parsed = videoData || parseVideoScript(content);
  const hasScenes = parsed.scenes.length > 0;
  const totalDuration = parsed.scenes.reduce((sum, s) => sum + s.duration, 0);

  const toggleScene = (index: number) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedScenes(new Set(parsed.scenes.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedScenes(new Set());
  };

  let accumulatedTime = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          {title}
          {hasScenes && (
            <Badge variant="secondary">{parsed.scenes.length}个片段</Badge>
          )}
          {totalDuration > 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(totalDuration)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsed.style && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">统一风格：</span>
            <span className="text-sm font-medium">{parsed.style}</span>
          </div>
        )}

        {parsed.coverImageUrl && (
          <div className="relative overflow-hidden rounded-lg border">
            <img
              src={parsed.coverImageUrl}
              alt="视频封面"
              className="w-full object-cover"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {hasScenes && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">分镜脚本（每片段10秒）</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  全部展开
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  全部收起
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {parsed.scenes.map((scene, index) => {
                  const widthPercent = (scene.duration / totalDuration) * 100;
                  const colors = [
                    'bg-blue-500',
                    'bg-cyan-500',
                    'bg-teal-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-orange-500',
                  ];
                  return (
                    <div
                      key={index}
                      className={`${colors[index % colors.length]} transition-all hover:opacity-80`}
                      style={{ width: `${widthPercent}%` }}
                      title={`片段${index + 1}: ${scene.title || formatDuration(scene.duration)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>0:10</span>
                <span>0:20</span>
                <span>0:30</span>
                <span>0:40</span>
                <span>0:50</span>
                <span>1:00</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {parsed.scenes.map((scene, index) => {
                  const isExpanded = expandedScenes.has(index);
                  const startTime = accumulatedTime;
                  accumulatedTime += scene.duration;
                  const endTime = accumulatedTime;
                  return (
                    <div key={index} className="relative pl-10">
                      <div className="absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                      <Card size="sm">
                        <CardHeader
                          className="cursor-pointer"
                          onClick={() => toggleScene(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                片段 {index + 1}
                              </Badge>
                              <span className="text-sm font-medium">
                                {scene.title || `片段 ${index + 1}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDuration(startTime)}-{formatDuration(endTime)}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="space-y-2 pt-0">
                            {scene.description && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">画面描述</p>
                                <p className="text-sm">{scene.description}</p>
                              </div>
                            )}
                            {scene.narration && (
                              <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs font-medium text-muted-foreground">旁白</p>
                                <p className="text-sm italic">{scene.narration}</p>
                              </div>
                            )}
                            {(scene.style || parsed.style) && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Palette className="h-3 w-3" />
                                <span>{scene.style || parsed.style}</span>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">完整脚本</h3>
          </div>
          <div
            className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 ${
              !showFullScript && !hasScenes ? 'line-clamp-[20]' : !showFullScript ? 'line-clamp-6' : ''
            }`}
          >
            {parsed.script}
          </div>
          {!showFullScript && (
            <Button variant="ghost" size="sm" onClick={() => setShowFullScript(true)}>
              展开完整脚本
            </Button>
          )}
          {showFullScript && (
            <Button variant="ghost" size="sm" onClick={() => setShowFullScript(false)}>
              收起脚本
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
