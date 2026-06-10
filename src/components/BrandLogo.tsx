'use client';

import { useState, useEffect } from 'react';
import LogoIcon from './LogoIcon';

// BrandLogo — renders the official logo, dynamically configurable from the
// SA back-office (platform_config 'branding'). Falls back to the inline SVG
// mark + wordmark text when no image is available (e.g. before first deploy
// of the brand assets, or offline).

export type LogoVariant = 'full' | 'white' | 'black' | 'icon';

interface Branding {
  logoFull?: string;
  logoWhite?: string;
  logoBlack?: string;
  logoIcon?: string;
}

const CACHE_KEY = 'padelmgt_branding_v1';
const CACHE_TTL = 10 * 60 * 1000;

let inflight: Promise<Branding | null> | null = null;

async function loadBranding(): Promise<Branding | null> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { branding: Branding; at: number };
      if (Date.now() - cached.at < CACHE_TTL) return cached.branding;
    }
  } catch { /* ignore */ }

  if (!inflight) {
    inflight = fetch('/api/branding')
      .then(r => r.ok ? r.json() as Promise<{ branding: Branding }> : null)
      .then(data => {
        const branding = data?.branding ?? null;
        if (branding) {
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ branding, at: Date.now() })); } catch { /* ignore */ }
        }
        return branding;
      })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

const VARIANT_KEY: Record<LogoVariant, keyof Branding> = {
  full:  'logoFull',
  white: 'logoWhite',
  black: 'logoBlack',
  icon:  'logoIcon',
};

export default function BrandLogo({
  variant = 'full',
  height = 32,
  withText = true,
  style,
}: {
  variant?: LogoVariant;
  height?: number;
  /** Fallback only: show the wordmark text next to the SVG icon */
  withText?: boolean;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadBranding().then(branding => {
      if (!mounted || !branding) return;
      const url = branding[VARIANT_KEY[variant]];
      if (url) setSrc(url);
    });
    return () => { mounted = false; };
  }, [variant]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="PadelMGT"
        style={{ height, width: 'auto', display: 'block', ...style }}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: inline SVG mark (+ wordmark text)
  const white = variant === 'white';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <LogoIcon size={height} white={white} />
      {withText && variant !== 'icon' && (
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: Math.round(height * 0.62), letterSpacing: '-0.01em',
          color: white ? '#fff' : 'inherit', textTransform: 'uppercase', lineHeight: 1,
        }}>
          PadelMGT
        </span>
      )}
    </span>
  );
}
