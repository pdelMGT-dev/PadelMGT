import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 300; // cache 5 min

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  try {
    if (!url || !anonKey) throw new Error('Supabase not configured');

    const sb = createClient(url, serviceKey || anonKey);

    // Fetch SA-configured overrides
    const { data: cfg } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', 'homepage_stats')
      .maybeSingle();

    const overrides = (cfg?.value ?? {}) as Record<string, { display: string; useReal: boolean }>;

    // Real counts from Supabase
    const [playersRes, clubsRes, leaguesRes, countriesRes] = await Promise.all([
      sb.from('players').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('clubs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('player_leagues').select('id', { count: 'exact', head: true }),
      sb.from('clubs').select('country').eq('status', 'active').not('country', 'is', null),
    ]);

    const realPlayers   = playersRes.count ?? 0;
    const realClubs     = clubsRes.count   ?? 0;
    const realLeagues   = leaguesRes.count ?? 0;
    const realCountries = new Set((countriesRes.data ?? []).map((r: { country: string }) => r.country)).size;

    function stat(key: string, real: number, fallback: string, label: string) {
      const cfg = overrides[key];
      if (cfg && !cfg.useReal && cfg.display) return { value: cfg.display, label };
      if (real > 0) return { value: `${real.toLocaleString('en-US')}+`, label };
      return { value: cfg?.display ?? fallback, label };
    }

    return NextResponse.json({
      players:   stat('players',   realPlayers,   '0',  'Jugadores'),
      clubs:     stat('clubs',     realClubs,     '0',  'Clubes'),
      leagues:   stat('leagues',   realLeagues,   '0',  'Ligas Activas'),
      countries: stat('countries', realCountries, '0',  'Países'),
    });
  } catch {
    return NextResponse.json({
      players:   { value: '–', label: 'Jugadores' },
      clubs:     { value: '–', label: 'Clubes' },
      leagues:   { value: '–', label: 'Ligas Activas' },
      countries: { value: '–', label: 'Países' },
    });
  }
}
