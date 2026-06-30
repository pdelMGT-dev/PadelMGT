import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';
import { rowToTeam, type PersonalizadoCategory } from '@/lib/personalizado-store';

// SOLO PARA PRUEBAS — inserta equipos ficticios para que el organizador pueda
// testear grupos, calendario y scores sin abrir inscripción real.
// Deshabilitado en producción para que no pueda contaminar torneos reales.

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible' }, { status: 403 });
  }

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { tournamentId?: string; categoryId?: string; count?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { tournamentId, categoryId, count = 4 } = body;
  if (!tournamentId || !categoryId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Only the creator may seed (verified session).
  const { data: trow, error: tErr } = await svc
    .from('personalizado_tournaments')
    .select('creator_player_id, categories')
    .eq('id', tournamentId)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: 'Error al leer el torneo' }, { status: 500 });
  if (!trow) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
  const seedCreatorId = (trow as Record<string, unknown>).creator_player_id as string | null;
  const callerIds = await getCallerPlayerIds(request);
  if (!seedCreatorId || !callerIds.includes(seedCreatorId)) {
    return NextResponse.json({ error: 'Solo el creador puede usar el seed' }, { status: 403 });
  }

  const cats = (trow as Record<string, unknown>).categories as PersonalizadoCategory[];
  const cat = cats.find(c => c.id === categoryId);
  if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

  // Count already enrolled (pending + confirmed).
  const { count: enrolled } = await svc
    .from('personalizado_teams')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('category_id', categoryId)
    .in('status', ['pending', 'confirmed']);

  const alreadyIn = enrolled ?? 0;
  const slots = Math.min(count, cat.maxTeams - alreadyIn);
  if (slots <= 0) return NextResponse.json({ ok: true, added: 0, teams: [] });

  const teams = [];
  for (let i = 0; i < slots; i++) {
    const n = alreadyIn + i + 1;
    const id = crypto.randomUUID();
    const row = {
      id,
      tournament_id: tournamentId,
      category_id: categoryId,
      player1_name: `[Prueba] ${cat.name} ${n}A`,
      player1_email: null,
      player2_name: `[Prueba] ${cat.name} ${n}B`,
      player2_email: null,
      group_id: null,
      status: 'confirmed',
      payment_status: 'free',
      registered_at: new Date().toISOString(),
    };
    const { data: inserted, error: iErr } = await svc
      .from('personalizado_teams')
      .insert(row)
      .select('*')
      .single();
    if (!iErr && inserted) teams.push(rowToTeam(inserted as Record<string, unknown>));
  }

  return NextResponse.json({ ok: true, added: teams.length, teams });
}
