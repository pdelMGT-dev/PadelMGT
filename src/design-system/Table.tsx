import type { CSSProperties, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

const thStyle: CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)',
  textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)',
};

const tdStyle: CSSProperties = { padding: '16px', verticalAlign: 'middle', borderBottom: '1px solid var(--grey-100)' };

export type TableProps = { children: ReactNode; minWidth?: number };

/** Responsive table shell — scrolls horizontally on narrow screens. Matches the pattern used across dashboard list pages. */
export function Table({ children, minWidth = 720 }: TableProps) {
  return (
    <div style={{ border: '1px solid var(--grey-200)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>{children}</table>
    </div>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="ds-table-row">{children}</tr>;
}

export function Th({ children, align, style, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: CSSProperties['textAlign'] }) {
  return (
    <th {...rest} style={{ ...thStyle, textAlign: align ?? thStyle.textAlign, ...style }}>
      {children}
    </th>
  );
}

export function Td({ children, align, style, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { align?: CSSProperties['textAlign'] }) {
  return (
    <td {...rest} style={{ ...tdStyle, textAlign: align, ...style }}>
      {children}
    </td>
  );
}
