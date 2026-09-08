'use client';

import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { LearningCourse, LearningStage } from '@/lib/career/types';

interface LearningPathCardProps {
  stages: LearningStage[];
}

function courseName(course: LearningCourse | string): string {
  return typeof course === 'string' ? course : String(course.name || '');
}
function courseUrl(course: LearningCourse | string): string {
  return typeof course === 'string' ? '' : String(course.url || '');
}
function courseProvider(course: LearningCourse | string): string {
  return typeof course === 'string' ? '' : String(course.provider || '');
}

/** 学习路径：阶段化建议列表 */
export function LearningPathCard({ stages }: LearningPathCardProps) {
  const { t } = useI18n();
  if (!stages.length) return null;

  return (
    <ol className="space-y-3">
      {stages.map((stage) => (
        <li key={stage.stage} className="flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
            {stage.stage}
          </span>
          <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm font-medium">{stage.name}</strong>
              <span className="text-xs text-muted-foreground">{stage.duration}</span>
              {stage.estimatedHoursPerWeek ? (
                <Badge variant="outline" className="text-[11px]">
                  {t('career.hoursPerWeek', { hours: stage.estimatedHoursPerWeek })}
                </Badge>
              ) : null}
            </div>

            {stage.skills.length > 0 && (
              <p className="mt-1.5 text-xs text-primary">
                {stage.skills.join('、')}
              </p>
            )}
            {stage.goal && (
              <p className="mt-1.5 text-xs text-muted-foreground">{stage.goal}</p>
            )}

            {stage.weeklyTasks && stage.weeklyTasks.length > 0 && (
              <ul className="mt-2 space-y-2">
                {stage.weeklyTasks.map((task) => (
                  <li key={task.period} className="rounded-md bg-muted/40 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {task.period}
                      </span>
                      <strong className="text-xs">{task.title}</strong>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {task.actions.map((action, index) => (
                        <li key={index} className="text-[11px] leading-relaxed text-muted-foreground">
                          · {action}
                        </li>
                      ))}
                    </ul>
                    {task.deliverable && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t('career.deliverable', { value: task.deliverable })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-2 space-y-1 text-[11px]">
              {stage.prerequisites && stage.prerequisites.length > 0 && (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{t('career.prerequisites')}</dt>
                  <dd className="min-w-0">{stage.prerequisites.join('、')}</dd>
                </div>
              )}
              {stage.courses && stage.courses.length > 0 && (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{t('career.courses')}</dt>
                  <dd className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                    {stage.courses.map((course, index) => {
                      const url = courseUrl(course);
                      return url ? (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={courseProvider(course) || t('career.openCourse')}
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          {courseName(course)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span key={index}>{courseName(course)}</span>
                      );
                    })}
                  </dd>
                </div>
              )}
              {stage.certificates && stage.certificates.length > 0 && (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{t('career.certOptions')}</dt>
                  <dd className="min-w-0">{stage.certificates.join('、')}</dd>
                </div>
              )}
              {stage.practiceProject && (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{t('career.practiceProject')}</dt>
                  <dd className="min-w-0">{stage.practiceProject}</dd>
                </div>
              )}
            </dl>

            {stage.acceptanceCriteria && stage.acceptanceCriteria.length > 0 && (
              <div className="mt-2 rounded-md bg-muted/40 p-2">
                <strong className="text-[11px]">{t('career.acceptance')}</strong>
                <ul className="mt-1 space-y-0.5">
                  {stage.acceptanceCriteria.map((criterion, index) => (
                    <li key={index} className="text-[11px] leading-relaxed text-muted-foreground">
                      · {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {stage.outcome && (
              <p className="mt-2 text-[11px] text-muted-foreground">{stage.outcome}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
