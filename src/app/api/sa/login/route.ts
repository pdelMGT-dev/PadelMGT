import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signSAToken, SA_COOKIE_NAME, SA_SESSION_MAX_AGE } from '@/lib/sa-session';

// Server-side superadmin login.
// Credentials come from env vars (never shipped to the client):
//   SA_ADMIN_EMAIL / SA_ADMIN_PASSWORD  — root superadmin
// Sub-admins are validated against the Supabase admin_users table (service role).

// Simple in-memory rate limit: 10 attempts / 10 min per IP (best effort on serverless)
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 });
  }

  let email: string, password: string;
  try {
    const body = await request.json() as { email?: string; password?: string };
    email = (body.email ?? '').trim().toLowerCase();
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  const rootEmail = (process.env.SA_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const rootPassword = process.env.SA_ADMIN_PASSWORD ?? '';

  let role: string | null = null;
  let subAdminId: string | undefined;

  // 1. Root superadmin via env credentials
  if (rootEmail && rootPassword && email === rootEmail && password === rootPassword) {
    role = 'superadmin';
  }

  // Dev-only fallback so local development works without env vars.
  // Never active in production: SA_ADMIN_EMAIL/SA_ADMIN_PASSWORD are required there.
  if (!role && process.env.NODE_ENV !== 'production' && !rootEmail &&
      email === 'superadmin@padelmgt.com' && password === 'PadelMGT2026!') {
    role = 'superadmin';
  }

  // 2. Sub-admins from Supabase admin_users (service role, server-side only)
  if (!role) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data } = await admin
          .from('admin_users')
          .select('id, email, role, status, password')
          .eq('email', email)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        // Sub-admins MUST have a password set; plain comparison (legacy data is plaintext)
        if (data && data.password && data.password === password) {
          role = (data.role as string) ?? 'sub_admin';
          subAdminId = data.id as string;
        }
      } catch {
        // fall through to rejection
      }
    }
  }

  if (!role) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const token = await signSAToken({ email, role });
  if (!token) {
    return NextResponse.json(
      { error: 'SA auth no configurado: define SA_SESSION_SECRET (o SUPABASE_SERVICE_ROLE_KEY) en el servidor.' },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true, email, role, subAdminId });
  res.cookies.set(SA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SA_SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SA_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
