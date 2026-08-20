import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Service-role handler for a player's saved friends-ranking snapshots
 * (monthly/annual). Writes go through here (RLS: service_role only).
 *
 *   GET        → the caller's snapshots.
 *   POST       → upsert one snapshot for the caller (ownerId ∈ caller's ids).
 */

interface Row {
  id: string; owner_id: string; year: number; month: number | null;
  entries: unknown; created_at: string;
}

function toDto(r: Row) {
  return { id: r.id, ownerId: r.owner_id, year: r.year, month: r.month, entries: r.entries, createdAt: r.created_at };
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ snapshots: [] });

  const { data, error } = await svc.from('friends_ranking_snapshots').select('*').in('owner_id', callerIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ snapshots: ((data ?? []) as Row[]).map(toDto) });
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { id?: string; ownerId?: string; year?: number; month?: number | null; entries?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  const { id, ownerId, year, month, entries } = body;
  if (!id || !ownerId || !Number.isFinite(year)) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const callerIds = await getCallerPlayerIds(request);
  if (!callerIds.includes(ownerId)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // Find-or-replace by (owner, year, month) rather than an ON CONFLICT
  // upsert: month is nullable (annual snapshot) and Postgres never treats
  // two NULLs as conflicting under a plain unique constraint.
  let existingQuery = svc.from('friends_ranking_snapshots').select('id').eq('owner_id', ownerId).eq('year', year);
  existingQuery = month == null ? existingQuery.is('month', null) : existingQuery.eq('month', month);
  const { data: existing } = await existingQuery.maybeSingle();

  const row = { id: existing?.id ?? id, owner_id: ownerId, year, month: month ?? null, entries: entries ?? [] };
  const { error } = await svc.from('friends_ranking_snapshots').upsert(row, { onConflict: 'id' });

  if (error) { console.warn('[friends-ranking-snapshots]', error.message); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
