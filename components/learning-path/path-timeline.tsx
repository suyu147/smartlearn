'use client';

import { useLearningPathStore } from '@/lib/store/learning-path';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Lock,
  PlayCircle,
  ChevronRight,
} from 'lucide-react';
import type { PathNodeStatus } from '@/lib/types/learning-path';

const statusConfig: Record<PathNodeStatus, { icon: React.ElementType; color: string; label: string }> = {
  locked: { icon: Lock, color: 'text-muted-foreground', label: '未解锁' },
  available: { icon: Circle, color: 'text-blue-500', label: '可学习' },
  in_progress: { icon: PlayCircle, color: 'text-amber-500', label: '学习中' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: '已完成' },
};

export function PathTimeline() {
  const { path, updateNodeStatus } = useLearningPathStore();

  if (!path) return null;

  return (
    <div className="space-y-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">学习路径：{path.goal}</h2>
        <Badge variant="secondary">预计 {path.estimatedDays} 天</Badge>
      </div>

      <div className="relative space-y-3">
        {path.nodes.map((node, index) => {
          const config = statusConfig[node.status];
          const Icon = config.icon;

          return (
            <div key={node.id} className="relative">
              {index < path.nodes.length - 1 && (
                <div className="absolute left-[19px] top-10 h-[calc(100%-8px)] w-0.5 bg-border" />
              )}

              <Card
                className={`transition-all ${
                  node.status === 'available' || node.status === 'in_progress'
                    ? 'hover:shadow-md cursor-pointer'
                    : node.status === 'locked'
                      ? 'opacity-60'
                      : ''
                }`}
                onClick={() => {
                  if (node.status === 'available') {
                    updateNodeStatus(node.id, 'in_progress');
                  }
                }}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{node.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {node.knowledgePoints.map((kp) => (
                        <Badge key={kp} variant="secondary" className="text-xs">
                          {kp}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>预计 {node.estimatedMinutes} 分钟</span>
                      <span>{node.resources.length} 个资源</span>
                      {node.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNodeStatus(node.id, 'completed');
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          标记完成
                        </Button>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
