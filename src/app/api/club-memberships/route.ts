import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Service-role handler for club memberships (which player belongs to which
 * club). Writes go through here (RLS: public read only).
 *
 *   GET             → the caller's club memberships.
 *   POST op:'join'  → add a membership for the caller.
 *   POST op:'leave' → remove one of the caller's memberships.
 */

interface Row {
  id: string; player_id: string; club_id: string;
  club_name: string | null; club_city: string | null; club_country: string | null;
  joined_at: string | null;
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ memberships: [] });

  const { data } = await svc.from('club_memberships').select('*').in('player_id', callerIds);
  const memberships = ((data ?? []) as Row[]).map(r => ({
    playerId: r.player_id, clubId: r.club_id,
    clubName: r.club_name ?? '', clubCity: r.club_city ?? '', clubCountry: r.club_country ?? '',
    joinedAt: r.joined_at ?? '',
  }));
  return NextResponse.json({ memberships });
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }
  const op = body.op as string;

  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const mine = new Set(callerIds);

  const playerId = body.playerId as string;
  const clubId = body.clubId as string;
  if (!playerId || !clubId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  if (!mine.has(playerId)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  if (op === 'join') {
    const { error } = await svc.from('club_memberships').upsert({
      id: `${playerId}:${clubId}`,
      player_id: playerId,
      club_id: clubId,
      club_name: (body.clubName as string) ?? null,
      club_city: (body.clubCity as string) ?? null,
      club_country: (body.clubCountry as string) ?? null,
      joined_at: (body.joinedAt as string) ?? new Date().toISOString().split('T')[0],
    }, { onConflict: 'player_id,club_id' });
    if (error) { console.warn('[club-memberships join]', error.message); return NextResponse.json({ error: 'No se pudo unir' }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  if (op === 'leave') {
    const { error } = await svc.from('club_memberships').delete().eq('player_id', playerId).eq('club_id', clubId);
    if (error) return NextResponse.json({ error: 'No se pudo salir' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });
}
