import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds, getServerUser } from '@/lib/supabase-server';

/**
 * Service-role handler for direct game invitations. Writes go through here so
 * the table keeps anon writes disabled (RLS: public read only).
 *
 *   GET               → invitations involving the caller (incoming + sent),
 *                       matched by their player ids OR confirmed email.
 *   POST op:'create'  → create/upsert an invitation (from ∈ caller's ids).
 *   POST op:'respond' → accept/reject an invitation addressed to the caller.
 *   POST op:'delete-game' → remove all invitations for a game (game owner).
 */

type Svc = NonNullable<ReturnType<typeof serviceClient>>;

interface Row {
  id: string; game_id: string; game_name: string | null; game_date: string | null;
  game_time: string | null; game_club: string | null; game_city: string | null;
  from_player_id: string | null; from_player_name: string | null;
  to_player_id: string | null; to_player_name: string | null; to_player_email: string | null;
  status: 'pending' | 'accepted' | 'rejected'; created_at: string; responded_at: string | null;
}

function toDto(r: Row) {
  return {
    id: r.id, gameId: r.game_id, gameName: r.game_name ?? '', gameDate: r.game_date ?? '',
    gameTime: r.game_time ?? '', gameClub: r.game_club ?? '', gameCity: r.game_city ?? '',
    fromPlayerId: r.from_player_id ?? '', fromPlayerName: r.from_player_name ?? '',
    toPlayerId: r.to_player_id ?? '', toPlayerName: r.to_player_name ?? '', toPlayerEmail: r.to_player_email ?? undefined,
    status: r.status, createdAt: r.created_at, respondedAt: r.responded_at ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const callerIds = await getCallerPlayerIds(request);
  const user = await getServerUser(request);
  const email = (user?.email ?? '').toLowerCase();
  if (callerIds.length === 0 && !email) return NextResponse.json({ invitations: [] });

  // Match by player ids (from/to) OR by the caller's confirmed email (some
  // flows address invitees by email before they have a resolved player id).
  const orParts: string[] = [];
  if (callerIds.length) {
    orParts.push(`from_player_id.in.(${callerIds.join(',')})`);
    orParts.push(`to_player_id.in.(${callerIds.join(',')})`);
  }
  if (email) orParts.push(`to_player_email.eq.${email}`);

  const { data } = await svc.from('game_invitations').select('*').or(orParts.join(','));
  return NextResponse.json({ invitations: ((data ?? []) as Row[]).map(toDto) });
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

  if (op === 'create') {
    const inv = body.invitation as Record<string, unknown>;
    if (!inv?.id || !inv.gameId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    if (inv.fromPlayerId && !mine.has(inv.fromPlayerId as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { error } = await svc.from('game_invitations').upsert({
      id: inv.id,
      game_id: inv.gameId,
      game_name: (inv.gameName as string) ?? null,
      game_date: (inv.gameDate as string) ?? null,
      game_time: (inv.gameTime as string) ?? null,
      game_club: (inv.gameClub as string) ?? null,
      game_city: (inv.gameCity as string) ?? null,
      from_player_id: (inv.fromPlayerId as string) ?? null,
      from_player_name: (inv.fromPlayerName as string) ?? null,
      to_player_id: (inv.toPlayerId as string) ?? null,
      to_player_name: (inv.toPlayerName as string) ?? null,
      to_player_email: ((inv.toPlayerEmail as string) ?? '').toLowerCase() || null,
      status: 'pending',
    }, { onConflict: 'id' });
    if (error) { console.warn('[invitations create]', error.message); return NextResponse.json({ error: 'No se pudo invitar' }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  if (op === 'respond') {
    const invitationId = body.invitationId as string;
    const status = body.status as string;
    if (!invitationId || (status !== 'accepted' && status !== 'rejected')) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    const { data: jr } = await svc.from('game_invitations').select('to_player_id, to_player_email').eq('id', invitationId).maybeSingle();
    if (!jr) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    const row = jr as { to_player_id: string | null; to_player_email: string | null };
    const user = await getServerUser(request);
    const authorized = (row.to_player_id && mine.has(row.to_player_id))
      || (!!row.to_player_email && (user?.email ?? '').toLowerCase() === row.to_player_email);
    if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { error } = await svc.from('game_invitations')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', invitationId);
    if (error) return NextResponse.json({ error: 'No se pudo responder' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (op === 'delete-game') {
    const gameId = body.gameId as string;
    if (!gameId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    // Authorize: caller must be the game/tournament creator.
    const [{ data: g }, { data: t }] = await Promise.all([
      svc.from('quick_games').select('creator_player_id').eq('id', gameId).maybeSingle(),
      svc.from('tournaments').select('creator_player_id').eq('id', gameId).maybeSingle(),
    ]);
    const creator = (g as { creator_player_id?: string } | null)?.creator_player_id
      ?? (t as { creator_player_id?: string } | null)?.creator_player_id ?? null;
    if (creator && !mine.has(creator)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { error } = await svc.from('game_invitations').delete().eq('game_id', gameId);
    if (error) return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });
}
