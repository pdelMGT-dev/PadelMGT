import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { rowToTeam, type PersonalizadoCategory } from '@/lib/personalizado-store';

/**
 * Save the control-panel state for a PERSONALIZADO tournament:
 *  - updates categories (maxTeams may change), config (JSONB) and status
 *  - optionally writes group assignments (team -> group_id)
 *  - reconciles each category's waitlist: if maxTeams grew, promote the oldest
 *    waitlisted teams up to the new capacity
 *
 * Returns the refreshed team list so the client reflects any promotions.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: {
    id?: string;
    categories?: PersonalizadoCategory[];
    config?: Record<string, unknown>;
    status?: string;
    groupAssignments?: Record<string, string | null>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { id, categories, config, status, groupAssignments } = body;
  if (!id) return NextResponse.json({ error: 'Falta el identificador del torneo' }, { status: 400 });

  // 1) Update tournament columns the control panel owns.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (categories) patch.categories = categories;
  if (config) patch.config = config;
  if (status) patch.status = status;
  const { error: uErr } = await svc.from('personalizado_tournaments').update(patch).eq('id', id);
  if (uErr) return NextResponse.json({ error: 'No se pudo guardar la configuración' }, { status: 500 });

  // 2) Group assignments (drag & drop).
  if (groupAssignments) {
    for (const [teamId, groupId] of Object.entries(groupAssignments)) {
      await svc.from('personalizado_teams').update({ group_id: groupId }).eq('id', teamId).eq('tournament_id', id);
    }
  }

  // 3) Reconcile waitlist per category against (possibly new) maxTeams.
  if (categories) {
    for (const cat of categories) {
      const { count } = await svc
        .from('personalizado_teams')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', id)
        .eq('category_id', cat.id)
        .in('status', ['pending', 'confirmed']);
      let enrolled = count ?? 0;
      if (enrolled >= cat.maxTeams) continue;

      const { data: waiting } = await svc
        .from('personalizado_teams')
        .select('id')
        .eq('tournament_id', id)
        .eq('category_id', cat.id)
        .eq('status', 'waitlisted')
        .order('registered_at', { ascending: true });

      for (const w of waiting ?? []) {
        if (enrolled >= cat.maxTeams) break;
        await svc.from('personalizado_teams').update({ status: 'pending' }).eq('id', w.id as string);
        enrolled++;
      }
    }
  }

  // 4) Return the refreshed team list.
  const { data: teamRows } = await svc
    .from('personalizado_teams')
    .select('*')
    .eq('tournament_id', id)
    .order('registered_at', { ascending: true });
  const teams = (teamRows ?? []).map(r => rowToTeam(r as Record<string, unknown>));

  return NextResponse.json({ ok: true, teams });
}
