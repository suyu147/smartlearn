'use client';

import { useState } from 'react';
import { AppNav } from '@/components/app-nav';
import { PathTimeline } from '@/components/learning-path/path-timeline';
import { PathProgress } from '@/components/learning-path/path-progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Route, Target, Loader2 } from 'lucide-react';
import { useLearningPathStore } from '@/lib/store/learning-path';
import { useLearningProfileStore } from '@/lib/store/learning-profile';
import { useSettingsStore } from '@/lib/store/settings';
import { useResourcesStore } from '@/lib/store/resources';

export default function LearningPathPage() {
  const [goal, setGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const { path, setPath } = useLearningPathStore();
  const { profile } = useLearningProfileStore();
  const { providerId, modelId, apiKey, baseUrl } = useSettingsStore();
  const { resources } = useResourcesStore();

  const handlePlan = async () => {
    if (!goal.trim()) return;
    setIsPlanning(true);

    try {
      const response = await fetch('/api/path/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          profile: profile?.dimensions || null,
          resources: resources.map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            knowledgePoints: r.metadata?.knowledgePoints,
          })),
          aiConfig: { providerId, modelId, apiKey, baseUrl },
        }),
      });

      if (!response.ok) throw new Error('Planning failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'path_update' && data.path) {
                  setPath(data.path);
                }
              } catch {
                // skip
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Path planning error:', error);
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <div className="container flex-1 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">学习路径</h1>
          <p className="text-muted-foreground">
            根据您的画像和学习目标，规划个性化学习路径
          </p>
        </div>

        <div className="mb-6 rounded-lg border p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              设定学习目标
            </CardTitle>
            <CardDescription>
              告诉我您想学什么，Path Agent 将为您规划最优学习路径
            </CardDescription>
          </CardHeader>
          <div className="flex gap-3">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="例如：掌握机器学习基础、学会Python数据分析..."
              className="flex-1"
            />
            <Button onClick={handlePlan} disabled={!goal.trim() || isPlanning} className="gap-2">
              {isPlanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  规划中...
                </>
              ) : (
                <>
                  <Route className="h-4 w-4" />
                  规划路径
                </>
              )}
            </Button>
          </div>
        </div>

        {path ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PathTimeline />
            </div>
            <div>
              <PathProgress />
            </div>
          </div>
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Route className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">尚未规划学习路径</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                设定学习目标后，Path Agent 将为您生成个性化学习路径
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
