'use client';

import { useState } from 'react';
import LogoIcon from './LogoIcon';

export type LogoVariant = 'full' | 'white' | 'black' | 'icon';

interface BrandLogoProps {
  variant?: LogoVariant;
  height?: number;
  withText?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const VARIANT_PATHS: Record<LogoVariant, string> = {
  full: '/assets/brand/logo-full.png',
  white: '/assets/brand/logo-white.png',
  black: '/assets/brand/logo-black.png',
  icon: '/assets/brand/logo-icon.png',
};

export default function BrandLogo({
  variant = 'full',
  height = 32,
  withText = false,
  style,
  className,
}: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const src = VARIANT_PATHS[variant];
  const isWhite = variant === 'white';
  const isIcon = variant === 'icon';

  if (!imgFailed) {
    return (
      <img
        src={src}
        alt="PadelMGT"
        height={height}
        style={{ display: 'block', height, width: 'auto', flexShrink: 0, ...style }}
        className={className}
        onError={() => setImgFailed(true)}
        draggable={false}
      />
    );
  }

  // Fallback: SVG icon + text
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1, ...style }}
      className={className}
    >
      <LogoIcon size={height} white={isWhite} />
      {(!isIcon || withText) && (
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: height * 0.75,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: isWhite ? '#fff' : 'inherit',
          whiteSpace: 'nowrap',
        }}>
          PadelMGT
        </span>
      )}
    </span>
  );
}
