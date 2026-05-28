import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height = 16, borderRadius = 4, className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ rows = 3, style }: { rows?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--grey-200)',
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
      }}
    >
      <Skeleton width="60%" height={20} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={i === rows - 1 ? '40%' : '100%'} height={14} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={14} style={{ flex: i === 0 ? 2 : 1 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={32} style={{ flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
