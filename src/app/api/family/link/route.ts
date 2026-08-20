import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds, getServerUser } from '@/lib/supabase-server';
import { deriveInverseRelation, type RelationType, type FamilyLink } from '@/lib/family-store';

/**
 * POST — manage family link requests between platform users.
 *
 * action='request':
 *   - Looks up toPlayerEmail in the players table
 *   - Creates a family_links row with status='pending'
 *   - Sends a family_link_request email to the recipient
 *   - Returns { ok: true, link: FamilyLink }
 *
 * action='respond':
 *   - Updates the link status to 'accepted' or 'rejected'
 *   - Returns { ok: true }
 */
function rowToLink(r: Record<string, unknown>): FamilyLink {
  return {
    id: r.id as string,
    fromPlayerId: r.from_player_id as string,
    toPlayerId: r.to_player_id as string,
    toPlayerEmail: r.to_player_email as string,
    fromPlayerName: r.from_player_name as string,
    relationFromTo: r.relation_from_to as RelationType,
    relationToFrom: r.relation_to_from as RelationType,
    status: r.status as FamilyLink['status'],
    createdAt: r.created_at as string,
  };
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ links: [] });

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  if (!playerId) return NextResponse.json({ error: 'Falta playerId' }, { status: 400 });

  const callerIds = await getCallerPlayerIds(request);
  if (!callerIds.includes(playerId)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data, error } = await svc
    .from('family_links')
    .select('*')
    .or(`from_player_id.eq.${playerId},to_player_id.eq.${playerId}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links: (data ?? []).map(rowToLink) });
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: {
    action?: string;
    fromPlayerId?: string;
    fromPlayerName?: string;
    toPlayerEmail?: string;
    relationFromTo?: RelationType;
    linkId?: string;
    response?: 'accepted' | 'rejected';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { action } = body;

  // ── action: request ──────────────────────────────────────────────────────
  if (action === 'request') {
    const { fromPlayerId, fromPlayerName, toPlayerEmail, relationFromTo } = body;

    if (!fromPlayerId || !fromPlayerName || !toPlayerEmail || !relationFromTo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Authorize: the caller may only send link requests as themselves.
    const callerIds = await getCallerPlayerIds(request);
    if (!callerIds.includes(fromPlayerId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Look up the recipient player by email
    const { data: toPlayer, error: lookupErr } = await svc
      .from('players')
      .select('id, name, email')
      .eq('email', toPlayerEmail.trim().toLowerCase())
      .maybeSingle();

    if (lookupErr) {
      console.warn('[Family] link lookup:', lookupErr.message);
      return NextResponse.json({ error: 'Error al buscar jugador' }, { status: 500 });
    }
    if (!toPlayer) {
      return NextResponse.json({ ok: false, error: 'Jugador no encontrado en la plataforma' }, { status: 404 });
    }

    const toPlayerId = (toPlayer as { id: string; name: string; email: string }).id;
    const toPlayerName = (toPlayer as { id: string; name: string; email: string }).name;
    const relationToFrom = deriveInverseRelation(relationFromTo);
    const now = new Date().toISOString();

    // Insert the link row
    const { data: linkRow, error: insertErr } = await svc
      .from('family_links')
      .insert({
        from_player_id: fromPlayerId,
        to_player_id: toPlayerId,
        to_player_email: toPlayerEmail.trim().toLowerCase(),
        from_player_name: fromPlayerName,
        relation_from_to: relationFromTo,
        relation_to_from: relationToFrom,
        status: 'pending',
        created_at: now,
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      console.warn('[Family] link insert:', insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Send email to recipient
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/player/profile?tab=familia&acceptLink=${(linkRow as Record<string, unknown>)?.id ?? ''}`;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'family_link_request',
          to: toPlayerEmail,
          toName: toPlayerName,
          fromName: fromPlayerName,
          relationLabel: relationFromTo,
          acceptUrl,
        }),
      });
    } catch (e) {
      console.warn('[Family] sendFamilyLinkRequestEmail:', e);
    }

    const row = linkRow as Record<string, unknown>;
    const link: FamilyLink = {
      id: row.id as string,
      fromPlayerId: row.from_player_id as string,
      toPlayerId: row.to_player_id as string,
      toPlayerEmail: row.to_player_email as string,
      fromPlayerName: row.from_player_name as string,
      relationFromTo: row.relation_from_to as RelationType,
      relationToFrom: row.relation_to_from as RelationType,
      status: 'pending',
      createdAt: row.created_at as string,
    };

    return NextResponse.json({ ok: true, link });
  }

  // ── action: respond ──────────────────────────────────────────────────────
  if (action === 'respond') {
    const { linkId, response } = body;

    if (!linkId || !response) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    if (response !== 'accepted' && response !== 'rejected') {
      return NextResponse.json({ error: 'Respuesta no válida' }, { status: 400 });
    }

    // Authorize: only the recipient of the link may accept/reject it.
    const { data: linkRow, error: linkErr } = await svc
      .from('family_links')
      .select('to_player_id, to_player_email')
      .eq('id', linkId)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ error: 'Error al leer la solicitud' }, { status: 500 });
    if (!linkRow) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });

    const callerIds = await getCallerPlayerIds(request);
    const caller = await getServerUser(request);
    const toId = (linkRow as Record<string, unknown>).to_player_id as string | null;
    const toEmail = ((linkRow as Record<string, unknown>).to_player_email as string | null)?.toLowerCase();
    const isRecipient =
      (!!toId && callerIds.includes(toId)) ||
      (!!toEmail && (caller?.email ?? '').toLowerCase() === toEmail);
    if (!isRecipient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await svc
      .from('family_links')
      .update({ status: response })
      .eq('id', linkId);

    if (error) {
      console.warn('[Family] link respond:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
