'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Network, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  GraphCanvas,
} from '@/components/knowledge-graph/graph-canvas';
import {
  ALL,
  GraphControls,
  type GraphQueryState,
} from '@/components/knowledge-graph/graph-controls';
import { NodeDetailPanel } from '@/components/knowledge-graph/node-detail-panel';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  buildGraphScene,
  fetchGraph,
  fetchGraphFilters,
  fetchNodeDetail,
} from '@/lib/graph/service';
import type {
  GraphData,
  GraphFilterOptions,
  GraphNodeDetail,
  GraphViewMode,
  SkillTier,
} from '@/lib/graph/types';
import { useI18n } from '@/lib/hooks/use-i18n';

const DEFAULT_QUERY: GraphQueryState = {
  keyword: '',
  techStack: '',
  skillTier: '',
  seniority: '',
  entityType: '',
};

/** 下拉的「全部」哨兵值还原为空字符串 */
const norm = (value: string) => (value === ALL ? '' : value);

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function KnowledgeGraphPage() {
  const { t } = useI18n();

  const [viewMode, setViewMode] = useState<GraphViewMode>('role');
  const [query, setQuery] = useState<GraphQueryState>(DEFAULT_QUERY);
  const [filters, setFilters] = useState<GraphFilterOptions | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<GraphNodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // 筛选项只加载一次（服务层内部有 5 分钟缓存）
  useEffect(() => {
    let alive = true;
    fetchGraphFilters()
      .then((data) => {
        if (alive) setFilters(data);
      })
      .catch(() => {
        /* 筛选器加载失败不阻断主流程，退化为不显示下拉选项 */
      });
    return () => {
      alive = false;
    };
  }, []);

  // 关键词输入防抖，避免每次按键都回源查询
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(query.keyword.trim()), 450);
    return () => clearTimeout(timer);
  }, [query.keyword]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchGraph({
        viewMode,
        keyword: debouncedKeyword,
        techStack: norm(query.techStack),
        skillTier: norm(query.skillTier) as SkillTier | '',
        seniority: norm(query.seniority),
        entityType: norm(query.entityType),
      });
      setGraph(data);
      setSelectedId('');
      setDetail(null);
    } catch (reason) {
      setError(errorMessage(reason));
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, [
    viewMode,
    debouncedKeyword,
    query.techStack,
    query.skillTier,
    query.seniority,
    query.entityType,
    reloadToken,
  ]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  // 选中节点后加载属性详情
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    fetchNodeDetail(selectedId)
      .then((data) => {
        if (alive) setDetail(data);
      })
      .catch(() => {
        if (alive) setDetail(null);
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  const scene = useMemo(
    () =>
      graph
        ? buildGraphScene(graph)
        : { nodes: [], links: [], categories: [], truncated: false },
    [graph],
  );

  const selectedNode = useMemo(
    () => scene.nodes.find((node) => node.id === selectedId) ?? null,
    [scene.nodes, selectedId],
  );

  const relationCount = useMemo(() => {
    if (!selectedId) return 0;
    return scene.links.filter((link) => {
      const s = typeof link.source === 'string' ? link.source : link.source.id;
      const t = typeof link.target === 'string' ? link.target : link.target.id;
      return s === selectedId || t === selectedId;
    }).length;
  }, [scene.links, selectedId]);

  const typeCounts = graph?.statistics?.typeCounts;
  const totalNodes = graph?.totalNodes ?? 0;
  const totalEdges = graph?.totalEdges ?? 0;

  return (
    <div className="flex h-full flex-col bg-[#fafbfe]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-100 bg-white px-6 py-3.5 shadow-sm">
        <Link
          href="/home"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-bold text-gray-800">
            {t('kg.title')}
          </h1>
          <p className="text-[11px] text-gray-400">{t('kg.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-gray-500">
          <span>
            {t('kg.stats.nodes')} <b className="text-gray-700">{totalNodes}</b>
          </span>
          <span>
            {t('kg.stats.relations')} <b className="text-gray-700">{totalEdges}</b>
          </span>
          {scene.truncated && (
            <span className="text-amber-600">{t('kg.stats.truncated')}</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <GraphControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        query={query}
        onQueryChange={(patch) => setQuery((prev) => ({ ...prev, ...patch }))}
        onReset={() => setQuery(DEFAULT_QUERY)}
        onRefresh={() => setReloadToken((token) => token + 1)}
        loading={loading}
      />

      {/* Graph area */}
      <div className="relative flex-1 overflow-hidden">
        <GraphCanvas
          nodes={scene.nodes}
          links={scene.links}
          searchTerm={query.keyword}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((prev) => (prev === id ? '' : id))}
        />

        {/* Legend */}
        {scene.categories.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-[420px] rounded-lg bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
              {t('kg.legend')}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
              {scene.categories.map((category) => (
                <span key={category} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  {CATEGORY_LABELS[category]}
                  {typeCounts?.[category] ? ` (${typeCounts[category]})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hint */}
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-white/80 px-3 py-1.5 text-[11px] text-gray-400 shadow-sm backdrop-blur-sm">
          {t('kg.hint')}
        </div>

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] text-gray-500 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              {t('kg.loading')}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fafbfe]">
            <div className="max-w-md rounded-xl border border-red-100 bg-white px-6 py-5 text-center shadow-sm">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
              <p className="mb-1 text-[14px] font-semibold text-gray-800">
                {t('kg.errorTitle')}
              </p>
              <p className="mb-3 text-[12px] leading-relaxed text-gray-500">
                {t('kg.errorHint')}
                {error ? `（${error}）` : ''}
              </p>
              <Button size="sm" onClick={() => setReloadToken((token) => token + 1)}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t('kg.retry')}
              </Button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && graph && scene.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fafbfe]">
            <div className="max-w-sm rounded-xl border border-gray-100 bg-white px-6 py-5 text-center shadow-sm">
              <Network className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="mb-1 text-[14px] font-semibold text-gray-800">
                {t('kg.emptyTitle')}
              </p>
              <p className="mb-3 text-[12px] leading-relaxed text-gray-500">
                {t('kg.emptyHint')}
              </p>
              <Button size="sm" variant="outline" onClick={() => setQuery(DEFAULT_QUERY)}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t('kg.reset')}
              </Button>
            </div>
          </div>
        )}

        <NodeDetailPanel
          node={selectedNode}
          detail={detail}
          loading={detailLoading}
          relationCount={relationCount}
          onClose={() => setSelectedId('')}
        />
      </div>
    </div>
  );
}
