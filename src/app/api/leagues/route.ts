import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Service-role handler for player-league data. All league writes flow through
 * here so the tables can keep anon INSERT/UPDATE/DELETE disabled (RLS).
 *
 *   GET                → "my leagues": leagues the caller created or belongs to,
 *                        enriched with my role, member/season counts and the
 *                        active season. Scoped to the verified caller.
 *   POST op:'sync'     → backfill / upsert leagues + members + seasons the
 *                        caller owns (created_by ∈ caller's player ids).
 *   POST op:'request'  → submit a join request (open — anyone may ask to join).
 *   POST op:'review'   → approve / reject a join request (league admin only).
 */

interface LeagueIn {
  id: string; code?: string; name: string; description?: string;
  createdBy: string; createdByName?: string;
  isOpen?: boolean; isPublic?: boolean;
  defaultPointsWin?: number; defaultPointsDraw?: number; defaultPointsLoss?: number;
  createdAt?: string;
}
interface MemberIn {
  id: string; leagueId: string; playerId: string; playerName?: string;
  role?: 'admin' | 'member'; joinedAt?: string;
}
interface SeasonIn {
  id: string; leagueId: string; name: string; startDate?: string; endDate?: string;
  pointsWin?: number; pointsDraw?: number; pointsLoss?: number;
  status?: 'upcoming' | 'active' | 'completed';
}

interface Body {
  op?: 'sync' | 'request' | 'review' | 'remove-member' | 'delete-league';
  leagues?: LeagueIn[];
  members?: MemberIn[];
  seasons?: SeasonIn[];
  // request
  request?: {
    id: string; leagueId: string; playerId: string;
    playerName?: string; playerEmail?: string | null; message?: string | null;
  };
  // review
  requestId?: string;
  status?: 'approved' | 'rejected';
  reviewedBy?: string;
  // remove-member / delete-league
  leagueId?: string;
  playerId?: string;
}

type Svc = NonNullable<ReturnType<typeof serviceClient>>;

// ── GET: my leagues, enriched ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ leagues: [] });

  // League ids where I'm a member (with my role) …
  const { data: myMemberRows } = await svc
    .from('league_members')
    .select('league_id, role')
    .in('player_id', callerIds);
  const myRoleByLeague = new Map<string, 'admin' | 'member'>();
  for (const m of (myMemberRows ?? []) as { league_id: string; role: 'admin' | 'member' }[]) {
    // Prefer 'admin' if the caller holds it through any of their player ids.
    if (m.role === 'admin' || !myRoleByLeague.has(m.league_id)) myRoleByLeague.set(m.league_id, m.role);
  }

  // … plus leagues I created (even if the member row somehow didn't sync).
  const { data: createdRows } = await svc
    .from('player_leagues')
    .select('*')
    .in('created_by', callerIds);

  const leagueIds = new Set<string>([
    ...myRoleByLeague.keys(),
    ...((createdRows ?? []) as { id: string }[]).map(l => l.id),
  ]);
  if (leagueIds.size === 0) return NextResponse.json({ leagues: [] });

  const ids = [...leagueIds];
  const [{ data: leagueRows }, { data: memberRows }, { data: seasonRows }] = await Promise.all([
    svc.from('player_leagues').select('*').in('id', ids),
    svc.from('league_members').select('league_id, role').in('league_id', ids),
    svc.from('league_seasons').select('league_id, name, status').in('league_id', ids),
  ]);

  const memberCount = new Map<string, number>();
  for (const m of (memberRows ?? []) as { league_id: string }[]) {
    memberCount.set(m.league_id, (memberCount.get(m.league_id) ?? 0) + 1);
  }
  const seasonCount = new Map<string, number>();
  const activeSeason = new Map<string, string>();
  for (const s of (seasonRows ?? []) as { league_id: string; name: string; status: string }[]) {
    seasonCount.set(s.league_id, (seasonCount.get(s.league_id) ?? 0) + 1);
    if (s.status === 'active') activeSeason.set(s.league_id, s.name);
  }

  const leagues = ((leagueRows ?? []) as Record<string, unknown>[]).map(l => {
    const id = l.id as string;
    const createdByMe = callerIds.includes((l.created_by as string) ?? '');
    const memberRole = myRoleByLeague.get(id);
    const role: 'creador' | 'coadmin' | 'jugador' =
      createdByMe ? 'creador' : memberRole === 'admin' ? 'coadmin' : 'jugador';
    const seasons = seasonCount.get(id) ?? 0;
    const active = activeSeason.get(id) ?? null;
    const status: 'active' | 'completed' | 'upcoming' =
      active ? 'active' : seasons > 0 ? 'completed' : 'upcoming';
    return {
      id,
      name: l.name as string,
      description: (l.description as string) ?? '',
      code: (l.code as string) ?? '',
      role,
      memberCount: memberCount.get(id) ?? 0,
      seasonCount: seasons,
      activeSeasonName: active,
      status,
      createdAt: (l.created_at as string) ?? '',
    };
  });

  // Newest first.
  leagues.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return NextResponse.json({ leagues });
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  if (body.op === 'sync')          return handleSync(svc, request, body);
  if (body.op === 'request')       return handleRequest(svc, body);
  if (body.op === 'review')        return handleReview(svc, request, body);
  if (body.op === 'remove-member') return handleRemoveMember(svc, request, body);
  if (body.op === 'delete-league') return handleDeleteLeague(svc, request, body);
  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });
}

/** True if the caller is the league's creator or an admin member. */
async function callerAdminsLeague(svc: Svc, request: NextRequest, leagueId: string): Promise<boolean> {
  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return false;
  const { data: league } = await svc.from('player_leagues').select('created_by').eq('id', leagueId).maybeSingle();
  const creatorId = (league as { created_by?: string } | null)?.created_by ?? null;
  if (creatorId && callerIds.includes(creatorId)) return true;
  const { data: adminRows } = await svc
    .from('league_members')
    .select('player_id')
    .eq('league_id', leagueId)
    .eq('role', 'admin')
    .in('player_id', callerIds);
  return (adminRows ?? []).length > 0;
}

async function handleRemoveMember(svc: Svc, request: NextRequest, body: Body): Promise<NextResponse> {
  const { leagueId, playerId } = body;
  if (!leagueId || !playerId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  if (!(await callerAdminsLeague(svc, request, leagueId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { error } = await svc.from('league_members').delete().eq('league_id', leagueId).eq('player_id', playerId);
  if (error) return NextResponse.json({ error: 'No se pudo quitar el miembro' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

async function handleDeleteLeague(svc: Svc, request: NextRequest, body: Body): Promise<NextResponse> {
  const { leagueId } = body;
  if (!leagueId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  // Only the creator may delete the league.
  const callerIds = await getCallerPlayerIds(request);
  const { data: league } = await svc.from('player_leagues').select('created_by').eq('id', leagueId).maybeSingle();
  const creatorId = (league as { created_by?: string } | null)?.created_by ?? null;
  if (!creatorId || !callerIds.includes(creatorId)) {
    return NextResponse.json({ error: 'Solo el creador puede eliminar la liga' }, { status: 403 });
  }
  await Promise.all([
    svc.from('league_members').delete().eq('league_id', leagueId),
    svc.from('league_seasons').delete().eq('league_id', leagueId),
    svc.from('league_join_requests').delete().eq('league_id', leagueId),
  ]);
  const { error } = await svc.from('player_leagues').delete().eq('id', leagueId);
  if (error) return NextResponse.json({ error: 'No se pudo eliminar la liga' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

async function handleSync(svc: Svc, request: NextRequest, body: Body): Promise<NextResponse> {
  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const owns = new Set(callerIds);

  // Only leagues the caller created may be pushed. Members/seasons are accepted
  // only for those leagues.
  const leagues = (body.leagues ?? []).filter(l => owns.has(l.createdBy));
  const allowedLeagueIds = new Set(leagues.map(l => l.id));
  const members = (body.members ?? []).filter(m => allowedLeagueIds.has(m.leagueId));
  const seasons = (body.seasons ?? []).filter(s => allowedLeagueIds.has(s.leagueId));

  if (leagues.length) {
    const { error } = await svc.from('player_leagues').upsert(leagues.map(l => ({
      id: l.id,
      code: l.code ?? null,
      name: l.name,
      description: l.description ?? null,
      created_by: l.createdBy,
      created_by_name: l.createdByName ?? null,
      is_open: l.isOpen ?? false,
      is_public: l.isPublic ?? true,
      default_points_win: l.defaultPointsWin ?? 3,
      default_points_draw: l.defaultPointsDraw ?? 1,
      default_points_loss: l.defaultPointsLoss ?? 0,
      ...(l.createdAt ? { created_at: l.createdAt } : {}),
      updated_at: new Date().toISOString(),
    })), { onConflict: 'id' });
    if (error) { console.warn('[leagues sync] leagues', error.message); return NextResponse.json({ error: 'No se pudo sincronizar' }, { status: 500 }); }
  }

  if (members.length) {
    const { error } = await svc.from('league_members').upsert(members.map(m => ({
      id: m.id,
      league_id: m.leagueId,
      player_id: m.playerId,
      player_name: m.playerName ?? null,
      role: m.role ?? 'member',
      ...(m.joinedAt ? { joined_at: m.joinedAt } : {}),
    })), { onConflict: 'league_id,player_id' });
    if (error) console.warn('[leagues sync] members', error.message);
  }

  if (seasons.length) {
    const { error } = await svc.from('league_seasons').upsert(seasons.map(s => ({
      id: s.id,
      league_id: s.leagueId,
      name: s.name,
      start_date: s.startDate ?? null,
      end_date: s.endDate ?? null,
      points_win: s.pointsWin ?? 3,
      points_draw: s.pointsDraw ?? 1,
      points_loss: s.pointsLoss ?? 0,
      status: s.status ?? 'upcoming',
    })), { onConflict: 'id' });
    if (error) console.warn('[leagues sync] seasons', error.message);
  }

  return NextResponse.json({ ok: true });
}

async function handleRequest(svc: Svc, body: Body): Promise<NextResponse> {
  const r = body.request;
  if (!r?.id || !r.leagueId || !r.playerId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  const { error } = await svc.from('league_join_requests').upsert({
    id: r.id,
    league_id: r.leagueId,
    player_id: r.playerId,
    player_name: r.playerName ?? null,
    player_email: r.playerEmail ?? null,
    message: r.message ?? null,
    status: 'pending',
  }, { onConflict: 'id' });
  if (error) { console.warn('[leagues request]', error.message); return NextResponse.json({ error: 'No se pudo enviar la solicitud' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

async function handleReview(svc: Svc, request: NextRequest, body: Body): Promise<NextResponse> {
  const { requestId, status } = body;
  if (!requestId || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { data: jr } = await svc
    .from('league_join_requests')
    .select('league_id, player_id, player_name')
    .eq('id', requestId)
    .maybeSingle();
  if (!jr) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  const req = jr as { league_id: string; player_id: string | null; player_name: string | null };

  // Authorize: caller must be the league creator or an admin member.
  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data: league } = await svc.from('player_leagues').select('created_by').eq('id', req.league_id).maybeSingle();
  const creatorId = (league as { created_by?: string } | null)?.created_by ?? null;
  let authorized = !!creatorId && callerIds.includes(creatorId);
  if (!authorized) {
    const { data: adminRows } = await svc
      .from('league_members')
      .select('player_id')
      .eq('league_id', req.league_id)
      .eq('role', 'admin')
      .in('player_id', callerIds);
    authorized = (adminRows ?? []).length > 0;
  }
  if (!authorized) return NextResponse.json({ error: 'Solo un administrador puede revisar' }, { status: 403 });

  const { error } = await svc.from('league_join_requests')
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: body.reviewedBy ?? null })
    .eq('id', requestId);
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });

  // Approving adds the player as a member.
  if (status === 'approved' && req.player_id) {
    await svc.from('league_members').upsert({
      id: `${req.league_id}:${req.player_id}`,
      league_id: req.league_id,
      player_id: req.player_id,
      player_name: req.player_name ?? null,
      role: 'member',
    }, { onConflict: 'league_id,player_id' });
  }

  return NextResponse.json({ ok: true });
}
