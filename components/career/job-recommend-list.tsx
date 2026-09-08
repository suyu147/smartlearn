'use client';

import { ArrowRight, Target } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { RecommendationItem } from '@/lib/career/types';

interface JobRecommendListProps {
  items: RecommendationItem[];
  /** 当前目标岗位，用于高亮 */
  activeRoleId?: string;
  onSelect: (item: RecommendationItem) => void;
}

/** 推荐岗位卡片列表，点击可切换为目标岗位 */
export function JobRecommendList({ items, activeRoleId, onSelect }: JobRecommendListProps) {
  const { t } = useI18n();
  if (!items.length) return null;

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const active = item.roleId === activeRoleId;
        return (
          <li key={item.roleId}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="w-full rounded-lg border border-border/60 bg-card/50 p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <Target className="size-3.5 shrink-0 text-primary" />
                <strong className="min-w-0 flex-1 truncate text-sm font-medium">
                  {item.roleName}
                </strong>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {item.score}%
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
              {item.topGaps.length > 0 && (
                <p className="mt-1 pl-5.5 text-xs text-muted-foreground">
                  {t('career.jobGaps', { gaps: item.topGaps.join('、') })}
                </p>
              )}
              {active && (
                <p className="mt-1 pl-5.5 text-xs text-primary">{t('career.currentTarget')}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
