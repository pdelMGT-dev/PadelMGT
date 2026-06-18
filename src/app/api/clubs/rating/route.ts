import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

async function resolveUser(request: NextRequest): Promise<{ id: string } | null> {
  // 1. Try cookie-based session (web)
  const cookieUser = await getServerUser(request);
  if (cookieUser) return cookieUser;

  // 2. Try Bearer token (mobile)
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

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
  const authUser = await resolveUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  let body: { clubId?: string; rating?: number };
  try {
    body = await request.json() as { clubId?: string; rating?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clubId, rating } = body;

  if (!clubId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'clubId and rating (1–5) are required' }, { status: 400 });
  }

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, error: 'Supabase no configurado' });

  const { error } = await svc
    .from('club_ratings')
    .upsert({ club_id: clubId, player_id: authUser.id, rating }, { onConflict: 'club_id,player_id' });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
