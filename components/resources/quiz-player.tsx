'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import type { Quiz } from '@/lib/types/resource';

export function QuizPlayer({ content, title }: { content: string; title: string }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  let quizzes: Quiz[] = [];
  try {
    const parsed = parseJsonResponse<Quiz[]>(content);
    if (Array.isArray(parsed)) quizzes = parsed;
    else if (parsed) quizzes = [parsed as unknown as Quiz];
  } catch {
    quizzes = [];
  }

  if (quizzes.length === 0) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="secondary">{quizzes.length}题</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {quizzes.map((quiz, index) => (
          <div key={quiz.id || index} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">
                {index + 1}
              </Badge>
              <div>
                <p className="font-medium">{quiz.question}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {quiz.type === 'choice' ? '选择题' : quiz.type === 'fill' ? '填空题' : quiz.type === 'short_answer' ? '简答题' : quiz.type === 'coding' ? '编程题' : '案例分析'}
                  · 难度 {quiz.difficulty}/5
                </Badge>
              </div>
            </div>

            {quiz.options && quiz.options.length > 0 && (
              <div className="space-y-2 pl-6">
                {quiz.options.map((option, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() =>
                      setSelectedAnswers((prev) => ({ ...prev, [index]: option }))
                    }
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      selectedAnswers[index] === option
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="mr-2 font-medium">
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {showResults && quiz.explanation && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">解析：</p>
                <p className="mt-1 text-muted-foreground">{quiz.explanation}</p>
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-3">
          <Button onClick={() => setShowResults(true)} disabled={Object.keys(selectedAnswers).length === 0}>
            提交答案
          </Button>
          <Button variant="outline" onClick={() => { setSelectedAnswers({}); setShowResults(false); }}>
            重新作答
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
