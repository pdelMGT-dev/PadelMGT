import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';
import { rowToTeam, type PersonalizadoCategory } from '@/lib/personalizado-store';

/**
 * Change a team's status (confirm / reject / waitlist). On rejection, if the
 * change frees a slot, the oldest waitlisted team in the same category is
 * auto-promoted to 'pending'. Service-role so the count + promotion are atomic.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { tournamentId?: string; teamId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { tournamentId, teamId, status } = body;
  const VALID = ['pending', 'confirmed', 'rejected', 'waitlisted'];
  if (!tournamentId || !teamId || !status || !VALID.includes(status)) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Authorize before mutating: only the creator, a co-creator, or a SuperAdmin
  // may change a team's status.
  const { data: ownerRow } = await svc
    .from('personalizado_tournaments')
    .select('creator_player_id, config')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!ownerRow) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
  if (!(await requireSARequest(request))) {
    const r = ownerRow as Record<string, unknown>;
    const creatorId = r.creator_player_id as string | null;
    const coCreatorIds = ((r.config as Record<string, unknown> | null)?.coCreatorIds as string[] | undefined) ?? [];
    const callerIds = await getCallerPlayerIds(request);
    const canManage = (!!creatorId && callerIds.includes(creatorId)) || coCreatorIds.some(cid => callerIds.includes(cid));
    if (!canManage) {
      return NextResponse.json({ error: 'No tenés permiso para gestionar inscripciones' }, { status: 403 });
    }
  }

  // Apply the status change and read back the affected team (need its category).
  const { data: changed, error: uErr } = await svc
    .from('personalizado_teams')
    .update({ status })
    .eq('id', teamId)
    .eq('tournament_id', tournamentId)
    .select('*')
    .single();
  if (uErr || !changed) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

  let promoted: ReturnType<typeof rowToTeam> | undefined;

  if (status === 'rejected') {
    const categoryId = changed.category_id as string;

    // Read the tournament's maxTeams for this category.
    const { data: trow } = await svc
      .from('personalizado_tournaments')
      .select('categories')
      .eq('id', tournamentId)
      .maybeSingle();
    const cat = trow
      ? (trow.categories as PersonalizadoCategory[]).find(c => c.id === categoryId)
      : undefined;

    if (cat) {
      const { count } = await svc
        .from('personalizado_teams')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('category_id', categoryId)
        .in('status', ['pending', 'confirmed']);

      if ((count ?? 0) < cat.maxTeams) {
        // Promote the oldest waitlisted team.
        const { data: candidates } = await svc
          .from('personalizado_teams')
          .select('*')
          .eq('tournament_id', tournamentId)
          .eq('category_id', categoryId)
          .eq('status', 'waitlisted')
          .order('registered_at', { ascending: true })
          .limit(1);
        const candidate = (candidates ?? [])[0];
        if (candidate) {
          const { data: promotedRow } = await svc
            .from('personalizado_teams')
            .update({ status: 'pending' })
            .eq('id', candidate.id as string)
            .select('*')
            .single();
          if (promotedRow) promoted = rowToTeam(promotedRow as Record<string, unknown>);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, promoted });
}
