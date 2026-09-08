'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { SceneLink, SceneNode } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

interface SimNode extends SceneNode, SimulationNodeDatum {}
interface SimLink extends SceneLink, SimulationLinkDatum<SimNode> {}

export interface GraphCanvasProps {
  nodes: SceneNode[];
  links: SceneLink[];
  /** 画布内即时过滤用的关键词（命中高亮，未命中淡出） */
  searchTerm?: string;
  selectedId?: string;
  onSelect?: (nodeId: string) => void;
  className?: string;
}

/** 力导向图谱画布：缩放平移 / 拖拽节点 / 点击选中 / 关键词高亮 */
export function GraphCanvas({
  nodes,
  links,
  searchTerm = '',
  selectedId = '',
  onSelect,
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const [, setTick] = useState(0);
  const [hoverId, setHoverId] = useState<string>('');
  const dragNodeRef = useRef<SimNode | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const simNodes = useMemo<SimNode[]>(
    () => nodes.map((node) => ({ ...node })),
    [nodes],
  );
  const simLinks = useMemo<SimLink[]>(
    () => links.map((link) => ({ ...link })),
    [links],
  );

  // 力导向仿真：数据变化时重建
  useEffect(() => {
    const width = svgRef.current?.clientWidth || 1200;
    const height = svgRef.current?.clientHeight || 800;

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => {
            const s = d.source as SimNode;
            const t = d.target as SimNode;
            return (s.radius ?? 16) + (t.radius ?? 16) + 46;
          })
          .strength(0.28),
      )
      .force('charge', forceManyBody().strength(-360).distanceMax(560))
      .force('center', forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        'collision',
        forceCollide<SimNode>()
          .radius((d) => (d.radius ?? 16) + 10)
          .strength(0.85),
      )
      .force('x', forceX(width / 2).strength(0.03))
      .force('y', forceY(height / 2).strength(0.03))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    sim.on('tick', () => setTick((t) => t + 1));
    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [simNodes, simLinks]);

  // 缩放平移
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        if (gRef.current) {
          select(gRef.current).attr('transform', event.transform.toString());
        }
      });
    select(svgRef.current).call(zoomBehavior);
    select(svgRef.current).call(
      zoomBehavior.transform,
      zoomIdentity.translate(0, 0).scale(1),
    );
    return () => {
      if (svgRef.current) {
        select(svgRef.current).on('.zoom', null);
      }
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, node: SimNode) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragNodeRef.current = node;
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
    simRef.current?.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const node = dragNodeRef.current;
    if (!node || !svgRef.current) return;
    const start = dragStartRef.current;
    if (start && !start.moved) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 4 || dy > 4) start.moved = true;
    }
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = gRef.current?.getScreenCTM();
    if (ctm) {
      const svgPt = pt.matrixTransform(ctm.inverse());
      node.fx = svgPt.x;
      node.fy = svgPt.y;
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const node = dragNodeRef.current;
      const start = dragStartRef.current;
      (e.target as Element).releasePointerCapture(e.pointerId);
      if (node) {
        simRef.current?.alphaTarget(0);
        node.fx = null;
        node.fy = null;
        // 未拖动视为点击
        if (!start?.moved && onSelect) onSelect(node.id);
      }
      dragNodeRef.current = null;
      dragStartRef.current = null;
    },
    [onSelect],
  );

  // 命中搜索的节点
  const keyword = searchTerm.trim().toLowerCase();
  const matches = useCallback(
    (node: SimNode) =>
      !keyword || node.label.toLowerCase().includes(keyword),
    [keyword],
  );
  const hasSearch = keyword.length > 0;

  // 选中节点的邻居
  const neighborIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    for (const link of simLinks) {
      const s = typeof link.source === 'string' ? link.source : link.source.id;
      const t = typeof link.target === 'string' ? link.target : link.target.id;
      if (s === selectedId) set.add(t);
      if (t === selectedId) set.add(s);
    }
    return set;
  }, [simLinks, selectedId]);

  const isFaded = useCallback(
    (node: SimNode) => {
      if (selectedId) {
        return node.id !== selectedId && !neighborIds.has(node.id);
      }
      return hasSearch && !matches(node);
    },
    [selectedId, neighborIds, hasSearch, matches],
  );

  return (
    <svg
      ref={svgRef}
      className={cn('h-full w-full', className)}
      style={{ background: '#fafbfe' }}
    >
      <g ref={gRef}>
        {simLinks.map((link) => {
          const s = link.source as SimNode;
          const t = link.target as SimNode;
          if (s.x == null || s.y == null || t.x == null || t.y == null) return null;
          const related =
            selectedId &&
            (s.id === selectedId || t.id === selectedId);
          const faded =
            selectedId
              ? !related
              : hasSearch && !matches(s) && !matches(t);
          return (
            <line
              key={link.id}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={related ? '#3b6ef0' : faded ? '#e8ecf2' : '#c5cfe0'}
              strokeWidth={related ? 2 : faded ? 0.5 : 1}
              strokeOpacity={related ? 0.85 : faded ? 0.3 : 0.6}
            />
          );
        })}

        {simNodes.map((node) => {
          if (node.x == null || node.y == null) return null;
          const faded = isFaded(node);
          const selected = node.id === selectedId;
          const highlighted = !selectedId && hasSearch && matches(node);
          const alwaysLabel = node.category === 'job' || node.radius >= 18;
          const showLabel =
            alwaysLabel || selected || hoverId === node.id || highlighted;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onPointerDown={(e) => handlePointerDown(e, node)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onMouseEnter={() => setHoverId(node.id)}
              onMouseLeave={() => setHoverId((id) => (id === node.id ? '' : id))}
              style={{ cursor: 'grab' }}
            >
              {(highlighted || selected) && (
                <circle
                  r={node.radius + 7}
                  fill="none"
                  stroke={selected ? '#3b6ef0' : node.color}
                  strokeWidth={selected ? 3 : 2.5}
                  strokeOpacity={0.45}
                />
              )}
              <circle
                r={node.radius}
                fill={faded ? '#e8ecf2' : node.color}
                fillOpacity={faded ? 0.4 : 0.9}
                stroke={selected ? '#1d4ed8' : faded ? '#d0d7e2' : '#fff'}
                strokeWidth={selected ? 3 : 2}
                style={{ transition: 'fill-opacity 0.25s' }}
              />
              {node.category === 'job' && (
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={12}
                  fontWeight={600}
                  fill={faded ? '#a0aab8' : '#fff'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label.length > 6 ? `${node.label.slice(0, 5)}…` : node.label}
                </text>
              )}
              {showLabel && node.category !== 'job' && (
                <text
                  textAnchor="middle"
                  y={node.radius + 13}
                  fontSize={11}
                  fill={faded ? '#b6bfcc' : '#33415c'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label.length > 10 ? `${node.label.slice(0, 9)}…` : node.label}
                </text>
              )}
              {node.category !== 'job' && !showLabel && (
                <title>{node.label}</title>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
