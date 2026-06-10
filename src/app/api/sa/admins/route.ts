import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySAToken, SA_COOKIE_NAME } from '@/lib/sa-session';

// Admin-users management — requires a valid signed SA token (httpOnly cookie).
// The admin_users table has RLS locked to service_role, so all access goes
// through these routes.

async function requireSA(request: NextRequest): Promise<{ email: string; role: string } | null> {
  const token = request.cookies.get(SA_COOKIE_NAME)?.value;
  const payload = await verifySAToken(token);
  if (!payload) return null;
  return { email: payload.email, role: payload.role };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const session = await requireSA(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = adminClient();
  if (!db) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });

  const { data, error } = await db.from('admin_users').select('id, name, email, role, status, created_at').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ admins: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await requireSA(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Only the root superadmin can manage admin accounts
  if (session.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = adminClient();
  if (!db) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });

  let body: { id?: string; name?: string; email?: string; role?: string; status?: string; password?: string; createdAt?: string };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id || !body.email) {
    return NextResponse.json({ error: 'id y email requeridos' }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    id: body.id,
    name: body.name ?? '',
    email: body.email.trim().toLowerCase(),
    role: body.role ?? 'score_corrections',
    status: body.status ?? 'active',
    created_at: body.createdAt || new Date().toISOString(),
  };
  if (body.password) row.password = body.password;

  const { error } = await db.from('admin_users').upsert(row);
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSA(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = adminClient();
  if (!db) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const { error } = await db.from('admin_users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
