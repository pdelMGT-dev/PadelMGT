import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public branding config: logo variants managed by the SA.
// Values are URLs (static /assets/brand/* paths or data URLs uploaded via SA).

export interface BrandingConfig {
  logoFull?: string;   // icon + wordmark, color (light backgrounds)
  logoWhite?: string;  // all white (dark backgrounds)
  logoBlack?: string;  // all black
  logoIcon?: string;   // icon only (favicons, app icon, small spaces)
}

const DEFAULTS: BrandingConfig = {
  logoFull:  '/assets/brand/logo-full.png',
  logoWhite: '/assets/brand/logo-white.png',
  logoBlack: '/assets/brand/logo-black.png',
  logoIcon:  '/assets/brand/logo-icon.png',
};

export const revalidate = 300;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) return NextResponse.json({ branding: DEFAULTS });

  try {
    const sb = createClient(url, key);
    const { data } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', 'branding')
      .maybeSingle();

    const stored = (data?.value ?? {}) as BrandingConfig;
    return NextResponse.json({ branding: { ...DEFAULTS, ...stored } });
  } catch {
    return NextResponse.json({ branding: DEFAULTS });
  }
}
