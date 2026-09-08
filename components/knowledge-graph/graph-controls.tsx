'use client';

import { RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GraphFilterOptions, GraphViewMode } from '@/lib/graph/types';
import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';

/** 下拉里代表「全部」的哨兵值（shadcn Select 不接受空字符串） */
export const ALL = 'all';

export interface GraphQueryState {
  keyword: string;
  techStack: string;
  skillTier: string;
  seniority: string;
  entityType: string;
}

export interface GraphControlsProps {
  viewMode: GraphViewMode;
  onViewModeChange: (mode: GraphViewMode) => void;
  filters: GraphFilterOptions | null;
  query: GraphQueryState;
  onQueryChange: (patch: Partial<GraphQueryState>) => void;
  onReset: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

const VIEW_MODES: { value: GraphViewMode; key: string }[] = [
  { value: 'role', key: 'kg.viewRole' },
  { value: 'stack', key: 'kg.viewStack' },
  { value: 'entity', key: 'kg.viewEntity' },
];

export function GraphControls({
  viewMode,
  onViewModeChange,
  filters,
  query,
  onQueryChange,
  onReset,
  onRefresh,
  loading,
}: GraphControlsProps) {
  const { t } = useI18n();

  const viewModeLabel = (mode: GraphViewMode) => {
    const fromApi = filters?.viewModes.find((item) => item.value === mode)?.label;
    return fromApi || t(`kg.view${mode[0].toUpperCase()}${mode.slice(1)}`);
  };

  return (
    <div className="flex flex-col gap-2.5 border-b border-gray-100 bg-white px-6 py-2.5">
      {/* 第一行：视图切换 + 搜索 + 操作 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                'rounded-md px-3 py-1 text-[13px] font-medium transition-colors',
                viewMode === mode.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {viewModeLabel(mode.value)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query.keyword}
            onChange={(e) => onQueryChange({ keyword: e.target.value })}
            placeholder={
              viewMode === 'role'
                ? t('kg.searchRolePlaceholder')
                : t('kg.searchPlaceholder')
            }
            className="h-8 w-56 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-7 text-[13px] text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {query.keyword && (
            <button
              type="button"
              onClick={() => onQueryChange({ keyword: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px]"
            onClick={onReset}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('kg.reset')}
          </Button>
          <Button
            size="sm"
            className="h-8 text-[13px]"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            {t('kg.refresh')}
          </Button>
        </div>
      </div>

      {/* 第二行：按视图展示的筛选器 */}
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
        {viewMode === 'stack' && (
          <>
            <FilterSelect
              label={t('kg.techStack')}
              value={query.techStack}
              onChange={(value) => onQueryChange({ techStack: value })}
              options={filters?.techStacks}
              allLabel={t('kg.allStacks')}
            />
            <FilterSelect
              label={t('kg.seniority')}
              value={query.seniority}
              onChange={(value) => onQueryChange({ seniority: value })}
              options={filters?.seniorityLevels}
              allLabel={t('kg.allSeniority')}
            />
          </>
        )}

        {viewMode === 'entity' && (
          <FilterSelect
            label={t('kg.entityType')}
            value={query.entityType}
            onChange={(value) => onQueryChange({ entityType: value })}
            options={filters?.entityTypes}
            allLabel={t('kg.allEntities')}
          />
        )}

        {viewMode === 'role' && (
          <span className="text-gray-400">{t('kg.roleHint')}</span>
        )}

        {/* 能力层级：三个视图通用 */}
        <div className="flex items-center gap-1.5">
          <span>{t('kg.skillTier')}</span>
          <div className="flex items-center gap-1">
            <TierChip
              active={!query.skillTier}
              label={t('kg.all')}
              onClick={() => onQueryChange({ skillTier: '' })}
            />
            {(filters?.skillTiers ?? []).map((item) => (
              <TierChip
                key={item.value}
                active={query.skillTier === item.value}
                label={item.label}
                onClick={() => onQueryChange({ skillTier: item.value })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TierChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[12px] transition-colors',
        active
          ? 'border-blue-200 bg-blue-50 text-blue-600'
          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700',
      )}
    >
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string; count?: number }[];
  allLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="whitespace-nowrap">{label}</span>
      <Select value={value || ALL} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-[150px] text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {(options ?? []).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
              {typeof item.count === 'number' ? ` (${item.count})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
