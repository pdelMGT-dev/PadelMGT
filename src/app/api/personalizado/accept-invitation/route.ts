import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await req.json() as {
    tournamentId: string;
    teamId: string;
    action: 'accept' | 'reject';
    playerId?: string;
    playerName?: string;
  };

  const { tournamentId, teamId, action, playerId, playerName } = body;
  if (!tournamentId || !teamId || !action) {
    return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
  }
  if (action === 'accept' && (!playerId || !playerName)) {
    return NextResponse.json({ error: 'playerId y playerName requeridos para aceptar' }, { status: 400 });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  // Verify team exists in this tournament
  const { data: team, error: fetchErr } = await sb
    .from('personalizado_teams')
    .select('id, player2_email, player2_id')
    .eq('id', teamId)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!team) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });

  if (action === 'accept') {
    const { error: updErr } = await sb
      .from('personalizado_teams')
      .update({ player2_id: playerId, player2_name: playerName })
      .eq('id', teamId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // reject: clear partner invitation and mark rejected
  const { error: updErr } = await sb
    .from('personalizado_teams')
    .update({ status: 'rejected', player2_email: null, player2_name: null })
    .eq('id', teamId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
