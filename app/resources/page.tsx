'use client';

import { useState } from 'react';
import { AppNav } from '@/components/app-nav';
import { ResourceGrid } from '@/components/resources/resource-grid';
import { AgentStatusPanel } from '@/components/agent/agent-status-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, User } from 'lucide-react';
import { useResourcesStore } from '@/lib/store/resources';
import { useLearningProfileStore } from '@/lib/store/learning-profile';
import type { ResourceType, Resource } from '@/lib/types/resource';
import { RESOURCE_TYPE_LABELS } from '@/lib/types/resource';

const resourceTypes: ResourceType[] = ['document', 'mindmap', 'quiz', 'video', 'code', 'reading'];

export default function ResourcesPage() {
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ResourceType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { generatingTypes, setGeneratingTypes, addResource } = useResourcesStore();
  const { profile } = useLearningProfileStore();

  const toggleType = (type: ResourceType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleGenerate = async () => {
    if (!knowledgePoint.trim()) return;
    setIsGenerating(true);
    const types = selectedTypes.length > 0 ? selectedTypes : resourceTypes;
    setGeneratingTypes(types);

    try {
      const response = await fetch('/api/generate/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgePoints: [knowledgePoint],
          resourceTypes: types,
          profile: profile?.dimensions || null,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          console.log('Received SSE chunk:', chunk);
          
          // Process SSE events
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log('Parsed SSE data:', data);
                
                if (data.type === 'resource_delta' && data.resource) {
                  console.log('Adding resource to store:', data.resource);
                  addResource(data.resource as Resource);
                } else if (data.type === 'generation_complete') {
                  console.log('Generation complete');
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
      setGeneratingTypes([]);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <div className="container flex-1 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">资源中心</h1>
          <p className="text-muted-foreground">
            多智能体协同生成个性化学习资源
          </p>
        </div>

        <div className="mb-6 rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {profile?.dimensions ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ 学习画像已加载 - 资源将根据您的学习特征个性化生成
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  ⚠ 尚未构建学习画像 - 建议先去构建画像获得更好的个性化资源
                </span>
              )}
            </span>
          </div>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={knowledgePoint}
                onChange={(e) => setKnowledgePoint(e.target.value)}
                placeholder="输入知识点，如：机器学习基础、Python数据结构..."
                className="pl-9"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!knowledgePoint.trim() || isGenerating}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? '生成中...' : '生成资源'}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {resourceTypes.map((type) => (
              <Badge
                key={type}
                variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleType(type)}
              >
                {RESOURCE_TYPE_LABELS[type]}
              </Badge>
            ))}
            <span className="self-center text-xs text-muted-foreground">
              {selectedTypes.length === 0 ? '未选择则生成全部类型' : `已选${selectedTypes.length}种`}
            </span>
          </div>
        </div>

        {(isGenerating || generatingTypes.length > 0) && (
          <div className="mb-6">
            <AgentStatusPanel />
          </div>
        )}

        <ResourceGrid />
      </div>
    </div>
  );
}
