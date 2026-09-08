'use client';

import { Check, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { SkillGap } from '@/lib/career/types';

interface SkillGapListProps {
  gaps: SkillGap[];
  limit?: number;
}

/** 技能差距：已匹配 / 待补齐 两栏 */
export function SkillGapList({ gaps, limit = 20 }: SkillGapListProps) {
  const { t } = useI18n();
  const matched = gaps
    .filter((gap) => gap.status === 'matched')
    .sort((a, b) => b.importance - a.importance);
  const missing = gaps
    .filter((gap) => gap.status !== 'matched')
    .sort((a, b) => b.importance - a.importance);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <GapColumn
        title={t('career.matched')}
        tone="matched"
        items={matched}
        limit={limit}
        emptyText={t('career.matchedEmpty')}
      />
      <GapColumn
        title={t('career.missing')}
        tone="missing"
        items={missing}
        limit={limit}
        emptyText={t('career.missingEmpty')}
      />
    </div>
  );
}

function GapColumn({
  title,
  tone,
  items,
  limit,
  emptyText,
}: {
  title: string;
  tone: 'matched' | 'missing';
  items: SkillGap[];
  limit: number;
  emptyText: string;
}) {
  const { t } = useI18n();
  const shown = items.slice(0, limit);
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <Badge variant="secondary" className="tabular-nums">
          {items.length}
        </Badge>
      </div>
      {shown.length === 0 ? (
        <p className="py-3 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((gap) => (
            <li
              key={gap.skillId}
              title={t('career.gapTitle', {
                importance: Math.round(gap.importance),
                level: gap.level,
              })}
              className={cn(
                'flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
                tone === 'matched'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
            >
              {tone === 'matched' ? (
                <Check className="size-3 shrink-0" />
              ) : (
                <Plus className="size-3 shrink-0" />
              )}
              <span>{gap.skill}</span>
            </li>
          ))}
          {items.length > shown.length && (
            <li className="px-1 py-1 text-xs text-muted-foreground">
              {t('career.moreItems', { count: items.length - shown.length })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
