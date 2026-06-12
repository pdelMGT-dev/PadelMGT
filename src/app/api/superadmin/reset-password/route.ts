import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA password reset. The real credential store is Supabase Auth (auth.users),
// so the new password must be set via the admin API — writing it to the
// players table or localStorage does NOT change what login validates.

export async function POST(request: NextRequest) {
  const sa = await requireSARequest(request);
  if (!sa) return saUnauthorized();

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });

  let body: { playerId?: string; email?: string; newPassword?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const newPassword = (body.newPassword ?? '').trim();
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }
  if (!body.playerId && !body.email) {
    return NextResponse.json({ error: 'Missing playerId or email' }, { status: 400 });
  }

  // Resolve the auth user behind this player
  let authUserId: string | null = null;
  let email = (body.email ?? '').toLowerCase();

  if (body.playerId) {
    const { data: player } = await db
      .from('players')
      .select('user_id, email')
      .eq('id', body.playerId)
      .maybeSingle();
    if (player) {
      authUserId = (player.user_id as string) ?? null;
      if (!email) email = ((player.email as string) ?? '').toLowerCase();
    }
  }

  // Fall back to matching the auth user by email (rows created before the
  // user_id binding existed)
  if (!authUserId && email) {
    try {
      const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = data?.users?.find(u => (u.email ?? '').toLowerCase() === email);
      if (match) authUserId = match.id;
    } catch { /* fall through to 404 below */ }
  }

  if (!authUserId) {
    return NextResponse.json(
      { error: 'Este jugador no tiene cuenta de acceso (Supabase Auth). No hay contraseña que resetear.' },
      { status: 404 },
    );
  }

  const { error } = await db.auth.admin.updateUserById(authUserId, { password: newPassword });
  if (error) {
    console.error('[SA ResetPassword] error:', error.message);
    return NextResponse.json({ error: 'No se pudo actualizar la contraseña' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
