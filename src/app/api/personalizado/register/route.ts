import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { rowToTeam, type PersonalizadoCategory } from '@/lib/personalizado-store';
import { isEligibleForMaxAge, ageOnJan1 } from '@/lib/minor-categories-store';

/**
 * Atomic team registration for PERSONALIZADO tournaments.
 *
 * Reads the live confirmed/pending count for the category server-side, then
 * inserts the team as 'pending' (slot available) or 'waitlisted' (full). Because
 * the count and insert both happen here with the service-role key, two players
 * on different devices can't both claim the last slot.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: {
    code?: string; categoryId?: string;
    player1Name?: string; player1Email?: string;
    player2Name?: string; player2Email?: string;
    player1BirthDate?: string; player2BirthDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const {
    code, categoryId, player1Name, player1Email, player2Name, player2Email,
    player1BirthDate, player2BirthDate,
  } = body;
  if (!code || !categoryId || !player1Name?.trim()) {
    return NextResponse.json({ error: 'Datos de inscripción incompletos' }, { status: 400 });
  }

  // Load the tournament (status + categories + config) by code.
  const { data: trow, error: tErr } = await svc
    .from('personalizado_tournaments')
    .select('id, status, categories, config, date')
    .eq('code', code)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: 'Error al leer el torneo' }, { status: 500 });
  if (!trow) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
  if (trow.status !== 'registration_open') {
    return NextResponse.json({ error: 'La inscripción no está abierta' }, { status: 409 });
  }

  const cat = (trow.categories as PersonalizadoCategory[]).find(c => c.id === categoryId);
  if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

  // Child tournaments: re-validate the Jan-1 age rule server-side (the client form also
  // checks it, but the server must not trust a possibly-bypassed frontend).
  const cfg = (trow.config ?? {}) as { isChildTournament?: boolean };
  if (cfg.isChildTournament && cat.maxAge !== undefined) {
    const tournamentDate = (trow.date as string) || new Date().toISOString().slice(0, 10);
    const tYear = new Date(tournamentDate).getFullYear();
    const offenders: string[] = [];
    for (const [name, bd] of [[player1Name, player1BirthDate], [player2Name, player2BirthDate]] as const) {
      if (bd && !isEligibleForMaxAge(bd, tournamentDate, cat.maxAge)) {
        offenders.push(`${name} cumple ${ageOnJan1(bd, tournamentDate)} el 1 de enero de ${tYear}`);
      }
    }
    if (offenders.length > 0) {
      return NextResponse.json(
        { error: `La categoría ${cat.name} es para menores de ${cat.maxAge} años (al 1 de enero de ${tYear}). ${offenders.join('; ')}.` },
        { status: 422 },
      );
    }
  }

  const tournamentId = trow.id as string;

  // Duplicate-email guard within the same category (non-rejected teams).
  if (player1Email?.trim()) {
    const email = player1Email.trim().toLowerCase();
    const { data: existing } = await svc
      .from('personalizado_teams')
      .select('player1_email, player2_email, status')
      .eq('tournament_id', tournamentId)
      .eq('category_id', categoryId)
      .neq('status', 'rejected');
    const dup = (existing ?? []).some(r =>
      (r.player1_email as string)?.trim().toLowerCase() === email ||
      (r.player2_email as string)?.trim().toLowerCase() === email
    );
    if (dup) return NextResponse.json({ error: 'Ese correo ya está inscrito en esta categoría' }, { status: 409 });
  }

  // Count confirmed/pending teams to decide slot vs waitlist.
  const { count, error: cErr } = await svc
    .from('personalizado_teams')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('category_id', categoryId)
    .in('status', ['pending', 'confirmed']);
  if (cErr) return NextResponse.json({ error: 'Error al verificar plazas' }, { status: 500 });

  const waitlisted = (count ?? 0) >= cat.maxTeams;
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `tm-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const insertRow = {
    id,
    tournament_id: tournamentId,
    category_id: categoryId,
    player1_name: player1Name.trim(),
    player1_email: player1Email?.trim() || null,
    player2_name: player2Name?.trim() || null,
    player2_email: player2Email?.trim() || null,
    group_id: null,
    status: waitlisted ? 'waitlisted' : 'pending',
    payment_status: 'free',
    registered_at: new Date().toISOString(),
  };

  const { data: inserted, error: iErr } = await svc
    .from('personalizado_teams')
    .insert(insertRow)
    .select('*')
    .single();
  if (iErr) return NextResponse.json({ error: 'No se pudo completar la inscripción' }, { status: 500 });

  return NextResponse.json({ ok: true, waitlisted, team: rowToTeam(inserted as Record<string, unknown>) });
}
