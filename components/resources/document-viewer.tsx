'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DocumentViewer({ content, title }: { content: string; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {content}
        </div>
      </CardContent>
    </Card>
  );
}
