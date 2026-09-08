'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';
import type { JobSummary } from '@/lib/career/types';

interface JobSelectProps {
  jobs: JobSummary[];
  value: string;
  onChange: (roleId: string, roleName: string) => void;
  /** 关键词远程搜索；不传则只在已加载列表内过滤 */
  onSearch?: (keyword: string) => Promise<JobSummary[]>;
  disabled?: boolean;
}

/**
 * 目标岗位选择器。
 * 岗位库有数百条，默认展示已加载的热门岗位，输入关键词时调用远程搜索补全。
 */
export function JobSelect({ jobs, value, onChange, onSearch, disabled }: JobSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [remote, setRemote] = useState<JobSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const selected = useMemo(
    () => [...jobs, ...remote].find((job) => job.id === value),
    [jobs, remote, value],
  );

  // 输入关键词 → 远程搜索（300ms 防抖）
  useEffect(() => {
    if (!onSearch || !open) return;
    const text = keyword.trim();
    if (!text) {
      setRemote([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      onSearch(text)
        .then((items) => {
          if (!cancelled) setRemote(items);
        })
        .catch(() => {
          if (!cancelled) setRemote([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, open, onSearch]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const options = useMemo(() => {
    const merged = new Map<string, JobSummary>();
    [...jobs, ...remote].forEach((job) => merged.set(job.id, job));
    const list = [...merged.values()];
    const text = keyword.trim().toLowerCase();
    const filtered = text
      ? list.filter(
          (job) =>
            job.name.toLowerCase().includes(text) ||
            (job.field || '').toLowerCase().includes(text),
        )
      : list;
    return filtered.slice(0, 50);
  }, [jobs, remote, keyword]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors',
          'hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('min-w-0 flex-1 truncate text-left', !selected && 'text-muted-foreground')}>
          {selected ? selected.name : t('career.selectRole')}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="border-b p-2">
            <Input
              autoFocus
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t('career.searchRole')}
              className="h-8 text-xs"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {searching && (
              <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {t('career.searching')}
              </li>
            )}
            {!searching && options.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                {t('career.noMatchJob')}
              </li>
            )}
            {options.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(job.id, job.name);
                    setOpen(false);
                    setKeyword('');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{job.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {job.field} · {t('career.postingEvidence', { count: job.postingCount })}
                    </span>
                  </span>
                  {job.id === value && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
