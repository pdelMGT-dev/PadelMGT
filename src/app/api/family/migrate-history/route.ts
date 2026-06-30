import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * POST — migrate a family member's tournament history to a real platform account.
 * Body: { familyMemberId: string; newPlayerId: string; newPlayerName?: string }
 *
 * When a family member (FM-XXXX) creates/links a platform account, every
 * personalizado team registration that referenced their FM-id (as player1 or
 * player2) is re-pointed to the new player id, so their history carries over.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, error: 'Servicio no disponible' }, { status: 503 });

  let body: { familyMemberId?: string; newPlayerId?: string; newPlayerName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud no válida' }, { status: 400 });
  }

  const { familyMemberId, newPlayerId, newPlayerName } = body;
  if (!familyMemberId || !newPlayerId) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }
  if (!familyMemberId.startsWith('FM-')) {
    return NextResponse.json({ ok: false, error: 'ID# de familiar no válido' }, { status: 400 });
  }

  // Authorize: the caller may only migrate history INTO an account they control.
  const callerIds = await getCallerPlayerIds(request);
  if (!callerIds.includes(newPlayerId)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }

  let migrated = 0;

  // player1 references
  const p1Patch: Record<string, unknown> = { player1_id: newPlayerId };
  if (newPlayerName) p1Patch.player1_name = newPlayerName;
  const { data: p1Rows, error: p1Err } = await svc
    .from('personalizado_teams')
    .update(p1Patch)
    .eq('player1_id', familyMemberId)
    .select('id');
  if (p1Err) return NextResponse.json({ ok: false, error: 'Error al migrar (jugador 1)' }, { status: 500 });
  migrated += (p1Rows ?? []).length;

  // player2 references
  const p2Patch: Record<string, unknown> = { player2_id: newPlayerId };
  if (newPlayerName) p2Patch.player2_name = newPlayerName;
  const { data: p2Rows, error: p2Err } = await svc
    .from('personalizado_teams')
    .update(p2Patch)
    .eq('player2_id', familyMemberId)
    .select('id');
  if (p2Err) return NextResponse.json({ ok: false, error: 'Error al migrar (jugador 2)' }, { status: 500 });
  migrated += (p2Rows ?? []).length;

  return NextResponse.json({ ok: true, migrated });
}
