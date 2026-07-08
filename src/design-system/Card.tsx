import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> & {
  /** 'solid' matches bordered containers (tables, list wrappers). 'dashed' matches empty-state placeholders. */
  variant?: 'solid' | 'dashed';
  padding?: number | string;
  children: ReactNode;
  style?: CSSProperties;
};

/** Bordered content container. Matches the border pattern reused across dashboard tables, panels and empty states. */
export function Card({ variant = 'solid', padding, children, style, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      style={{
        border: `1px ${variant === 'dashed' ? 'dashed var(--grey-300)' : 'solid var(--grey-200)'}`,
        padding,
        background: variant === 'dashed' ? 'var(--grey-50)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type CardImageProps = {
  src: string;
  alt: string;
  aspectRatio?: string;
};

/** Cropped, hover-zoom image container. Wraps the real `.card-image` class from globals.css. */
export function CardImage({ src, alt, aspectRatio = '4 / 3' }: CardImageProps) {
  return (
    <div className="card-image" style={{ aspectRatio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
    </div>
  );
}
