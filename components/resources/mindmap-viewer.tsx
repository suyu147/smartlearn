'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MindmapViewer({ content, title }: { content: string; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/50 p-4">
          <pre className="text-sm whitespace-pre-wrap">{content}</pre>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          思维导图以 Markdown 格式展示，支持 Markmap 渲染
        </p>
      </CardContent>
    </Card>
  );
}
