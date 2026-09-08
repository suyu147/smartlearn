'use client';

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { RadarAxis } from '@/lib/career/types';

interface CapabilityRadarProps {
  axes: RadarAxis[];
  height?: number;
}

/** 雷达图轴名的 i18n 键映射（与 service.buildRadarAxes 的轴名对应） */
const AXIS_KEYS: Record<string, string> = {
  技能: 'skills',
  经验: 'experience',
  学历: 'education',
  能力广度: 'breadth',
  综合素养: 'workStyle',
};

/**
 * 五维能力雷达图：岗位需求基准 vs 我的当前能力。
 * 与职能洞察 CapabilityRadarChart 口径一致，用 recharts 重绘。
 */
export function CapabilityRadar({ axes, height = 320 }: CapabilityRadarProps) {
  const { t } = useI18n();
  const targetLabel = t('career.radarTarget');
  const currentLabel = t('career.radarCurrent');

  const data = axes.map((axis) => ({
    axis: t(`career.axis.${AXIS_KEYS[axis.name] ?? 'skills'}`, { defaultValue: axis.name }),
    [targetLabel]: Math.round(axis.target),
    [currentLabel]: Math.round(axis.current),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={targetLabel}
            dataKey={targetLabel}
            stroke="var(--chart-2, #d58a24)"
            fill="var(--chart-2, #d58a24)"
            fillOpacity={0.08}
            strokeWidth={2}
          />
          <Radar
            name={currentLabel}
            dataKey={currentLabel}
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--popover-foreground)',
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="plainline"
            iconSize={14}
            wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
