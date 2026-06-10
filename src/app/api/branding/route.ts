import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';

const DEFAULTS = {
  logoFull:  '/assets/brand/logo-full.png',
  logoWhite: '/assets/brand/logo-white.png',
  logoBlack: '/assets/brand/logo-black.png',
  logoIcon:  '/assets/brand/logo-icon.png',
};

export async function GET() {
  try {
    const sb = serviceClient();
    if (sb) {
      const { data } = await sb
        .from('platform_config')
        .select('value')
        .eq('key', 'branding')
        .single();
      if (data?.value) {
        return NextResponse.json({ ...DEFAULTS, ...data.value });
      }
    }
  } catch {}
  return NextResponse.json(DEFAULTS);
}
