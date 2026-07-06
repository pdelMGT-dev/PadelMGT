import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Service-role handler for friend requests / friendships. All writes flow
 * through here so the table can keep anon writes disabled (RLS).
 *
 *   GET               → the caller's requests: incoming (pending, sent to me),
 *                       sent (pending, from me) and accepted friends.
 *   POST op:'send'    → create a pending request (from ∈ caller's ids).
 *   POST op:'accept'  → accept a request addressed to the caller.
 *   POST op:'reject'  → reject a request addressed to the caller.
 *   POST op:'cancel'  → delete a pending request the caller sent.
 */

type Svc = NonNullable<ReturnType<typeof serviceClient>>;

interface Row {
  id: string; from_id: string; from_name: string | null;
  to_id: string; to_name: string | null;
  status: 'pending' | 'accepted' | 'rejected'; created_at: string;
}

function toDto(r: Row) {
  return {
    id: r.id, fromId: r.from_id, fromName: r.from_name ?? '',
    toId: r.to_id, toName: r.to_name ?? '',
    status: r.status, createdAt: r.created_at,
  };
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ incoming: [], sent: [], friends: [] });

  const { data } = await svc
    .from('friend_requests')
    .select('*')
    .or(`from_id.in.(${callerIds.join(',')}),to_id.in.(${callerIds.join(',')})`)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];
  const mine = new Set(callerIds);

  const incoming = rows.filter(r => r.status === 'pending' && mine.has(r.to_id)).map(toDto);
  const sent     = rows.filter(r => r.status === 'pending' && mine.has(r.from_id)).map(toDto);
  const friends  = rows.filter(r => r.status === 'accepted').map(r => {
    // Return the OTHER side as the friend.
    const iAmFrom = mine.has(r.from_id);
    return {
      requestId: r.id,
      playerId:   iAmFrom ? r.to_id : r.from_id,
      playerName: iAmFrom ? (r.to_name ?? '') : (r.from_name ?? ''),
      since: r.created_at,
    };
  });

  return NextResponse.json({ incoming, sent, friends });
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

  if (op === 'send') {
    const fromId = body.fromId as string;
    const toId   = body.toId as string;
    if (!fromId || !toId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    if (!mine.has(fromId)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    if (fromId === toId)   return NextResponse.json({ error: 'No podés agregarte a vos mismo' }, { status: 400 });

    // Already friends or a request already exists in either direction?
    const { data: existing } = await svc
      .from('friend_requests')
      .select('*')
      .or(`and(from_id.eq.${fromId},to_id.eq.${toId}),and(from_id.eq.${toId},to_id.eq.${fromId})`);
    const rows = (existing ?? []) as Row[];
    if (rows.some(r => r.status === 'accepted')) return NextResponse.json({ ok: true, already: 'friends' });
    if (rows.some(r => r.status === 'pending'))  return NextResponse.json({ ok: true, already: 'pending' });

    const id = (body.id as string) || `fr-${fromId}-${toId}`;
    const { error } = await svc.from('friend_requests').upsert({
      id,
      from_id: fromId,
      from_name: (body.fromName as string) ?? null,
      to_id: toId,
      to_name: (body.toName as string) ?? null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'from_id,to_id' });
    if (error) { console.warn('[friends send]', error.message); return NextResponse.json({ error: 'No se pudo enviar' }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  if (op === 'accept' || op === 'reject' || op === 'cancel' || op === 'remove') {
    const requestId = body.requestId as string;
    if (!requestId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    const { data: jr } = await svc.from('friend_requests').select('*').eq('id', requestId).maybeSingle();
    if (!jr) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    const row = jr as Row;

    if (op === 'cancel') {
      // Only the sender may cancel their own pending request.
      if (!mine.has(row.from_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      const { error } = await svc.from('friend_requests').delete().eq('id', requestId);
      if (error) return NextResponse.json({ error: 'No se pudo cancelar' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (op === 'remove') {
      // Either party may remove an existing friendship (delete the accepted row).
      if (!mine.has(row.from_id) && !mine.has(row.to_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      const { error } = await svc.from('friend_requests').delete().eq('id', requestId);
      if (error) return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // accept / reject: only the recipient may act.
    if (!mine.has(row.to_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { error } = await svc.from('friend_requests')
      .update({ status: op === 'accept' ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });
}
