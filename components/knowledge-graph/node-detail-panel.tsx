'use client';

import { ExternalLink, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_LABELS, buildNodeFacts, extractSourceUrls } from '@/lib/graph/service';
import type { GraphNodeDetail, SceneNode } from '@/lib/graph/types';
import { useI18n } from '@/lib/hooks/use-i18n';

export interface NodeDetailPanelProps {
  node: SceneNode | null;
  detail: GraphNodeDetail | null;
  loading?: boolean;
  relationCount: number;
  onClose: () => void;
}

/** 节点详情面板：展示实体属性、证据来源与关联关系数 */
export function NodeDetailPanel({
  node,
  detail,
  loading,
  relationCount,
  onClose,
}: NodeDetailPanelProps) {
  const { t } = useI18n();
  if (!node) return null;

  const properties = detail?.properties ?? node.properties;
  const facts = buildNodeFacts(properties);
  const urls = extractSourceUrls(properties);
  const typeLabel = CATEGORY_LABELS[node.category];

  return (
    <aside className="absolute right-4 top-4 z-10 flex max-h-[calc(100%-2rem)] w-[320px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="flex items-start gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: node.color }}
            />
            <h3 className="truncate text-[14px] font-semibold text-gray-800">
              {node.label}
            </h3>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[11px]">
              {typeLabel}
            </Badge>
            {node.level && node.level !== typeLabel && (
              <Badge variant="outline" className="text-[11px]">
                {node.level}
              </Badge>
            )}
            <span className="text-[11px] text-gray-400">
              {t('kg.detail.relations')} {relationCount}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
          {node.category === 'job'
            ? t('kg.detail.jobDesc')
            : t('kg.detail.entityDesc')}
        </p>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-[12px] text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('kg.detail.loading')}
          </div>
        )}

        {!loading && facts.length > 0 && (
          <dl className="space-y-2">
            {facts.map((fact, index) => (
              <div key={`${fact.label}-${index}`}>
                <dt className="text-[11px] text-gray-400">{fact.label}</dt>
                <dd className="break-words text-[12.5px] leading-relaxed text-gray-700">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {!loading && facts.length === 0 && (
          <p className="py-4 text-[12px] text-gray-400">
            {t('kg.detail.empty')}
          </p>
        )}

        {urls.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-1.5 text-[11px] text-gray-400">
              {t('kg.detail.sources')}
            </p>
            <ul className="space-y-1">
              {urls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="break-all">{url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
