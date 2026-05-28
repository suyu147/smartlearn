'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function CodeRunner({ content, title }: { content: string; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="secondary">代码</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-zinc-950 p-4">
          <pre className="overflow-x-auto text-sm text-green-400">
            <code>{content}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
