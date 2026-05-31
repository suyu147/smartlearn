'use client';

import type { PPTElement } from '@/lib/types/slides';

interface ScreenElementProps {
  element: PPTElement;
}

export function ScreenElement({ element }: ScreenElementProps) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.left,
    top: element.top,
    width: element.width,
    height: element.height,
    transform: element.rotate ? `rotate(${element.rotate}deg)` : undefined,
    opacity: element.opacity,
  };

  switch (element.type) {
    case 'text':
      return (
        <div
          style={{
            ...baseStyle,
            fontSize: (element as Record<string, unknown>).fontSize as number | undefined,
            color: (element as Record<string, unknown>).color as string | undefined,
            fontWeight: (element as Record<string, unknown>).fontWeight as string | number | undefined,
            textAlign: ((element as Record<string, unknown>).textAlign as string | undefined) as React.CSSProperties['textAlign'],
            lineHeight: (element as Record<string, unknown>).lineHeight as number | string | undefined,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
          }}
        >
          {String((element as Record<string, unknown>).content || '')}
        </div>
      );

    case 'image':
      return (
        <div style={baseStyle}>
          <img
            src={String((element as Record<string, unknown>).src || '')}
            alt={String((element as Record<string, unknown>).alt || '')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>
      );

    case 'shape':
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: (element as Record<string, unknown>).fill as string | undefined,
            borderRadius: (element as Record<string, unknown>).borderRadius as number | undefined,
            border: (element as Record<string, unknown>).border as string | undefined,
          }}
        />
      );

    case 'latex': {
      const latexContent = String((element as Record<string, unknown>).latex || '');
      return (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <span className="text-sm">{latexContent}</span>
        </div>
      );
    }

    case 'chart':
      return (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: 4,
          }}
        >
          <span className="text-xs text-gray-400">图表</span>
        </div>
      );

    case 'table':
      return (
        <div
          style={{
            ...baseStyle,
            overflow: 'auto',
          }}
        >
          <span className="text-xs text-gray-400">表格</span>
        </div>
      );

    case 'video':
      return (
        <div style={baseStyle}>
          <video
            src={String((element as Record<string, unknown>).src || '')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            controls
          />
        </div>
      );

    case 'line':
      return (
        <svg
          style={{ ...baseStyle, overflow: 'visible' }}
          width={element.width}
          height={element.height}
        >
          <line
            x1={0}
            y1={0}
            x2={element.width}
            y2={element.height}
            stroke={String((element as Record<string, unknown>).color || '#333')}
            strokeWidth={Number((element as Record<string, unknown>).lineWidth || 2)}
          />
        </svg>
      );

    default:
      return <div style={baseStyle} />;
  }
}
