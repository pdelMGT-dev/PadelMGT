import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get('clubId');
  const playerId = searchParams.get('playerId');

  if (!clubId) return NextResponse.json({ error: 'clubId required' }, { status: 400 });

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ average: null, userRating: null, count: 0 });

  const { data, error } = await svc
    .from('club_ratings')
    .select('rating, player_id')
    .eq('club_id', clubId);

  if (error) {
    // Table may not exist yet — return empty state gracefully
    return NextResponse.json({ average: null, userRating: null, count: 0 });
  }

  const ratings = data ?? [];
  const count = ratings.length;
  const average = count > 0
    ? Math.round((ratings.reduce((s, r) => s + (r.rating as number), 0) / count) * 10) / 10
    : null;
  const userRating = playerId
    ? ((ratings.find(r => r.player_id === playerId)?.rating as number | undefined) ?? null)
    : null;

  return NextResponse.json({ average, userRating, count });
}

export async function POST(request: NextRequest) {
  let body: { clubId?: string; playerId?: string; rating?: number };
  try {
    body = await request.json() as { clubId?: string; playerId?: string; rating?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clubId, playerId, rating } = body;

  if (!clubId || !playerId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'clubId, playerId and rating (1–5) are required' }, { status: 400 });
  }

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, error: 'Supabase no configurado' });

  const { error } = await svc
    .from('club_ratings')
    .upsert({ club_id: clubId, player_id: playerId, rating }, { onConflict: 'club_id,player_id' });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
