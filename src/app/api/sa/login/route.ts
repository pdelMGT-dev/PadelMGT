import { NextRequest, NextResponse } from 'next/server';
import { signSAToken, SA_COOKIE_NAME } from '@/lib/sa-session';
import { serviceClient } from '@/lib/supabase-server';
import { verifyPassword, safeEqual } from '@/lib/password';
import { rateLimitAllow, clientIp, SA_LOGIN_RULE } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Shared (Upstash-backed) rate limit: 10 attempts / 10 min per IP.
  if (!(await rateLimitAllow(SA_LOGIN_RULE, clientIp(request)))) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const adminEmail = process.env.SA_ADMIN_EMAIL ?? 'superadmin@padelmgt.com';
  const adminPassword = process.env.SA_ADMIN_PASSWORD ?? (process.env.NODE_ENV !== 'production' ? 'PadelMGT2026!' : '');

  if (!adminPassword) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  // Check main superadmin credentials (timing-safe compare)
  if (safeEqual(email, adminEmail) && safeEqual(password, adminPassword)) {
    const token = await signSAToken({ email, role: 'superadmin' });
    if (!token) return NextResponse.json({ error: 'Token error' }, { status: 500 });
    const res = NextResponse.json({ ok: true, role: 'superadmin' });
    res.cookies.set(SA_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 3600,
      path: '/',
    });
    return res;
  }

  // Check sub-admins in Supabase
  const sb = serviceClient();
  if (sb) {
    try {
      const { data } = await sb
        .from('admin_users')
        .select('id, email, role, password_hash, status')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (data) {
        // Sub-admin passwords are scrypt-hashed (legacy plaintext rows still
        // verify via the util's backward-compat path).
        const storedPwd = (data as Record<string, unknown>).password_hash as string | undefined;
        if (await verifyPassword(password, storedPwd)) {
          const token = await signSAToken({ email, role: data.role as string, subAdminId: data.id as string });
          if (!token) return NextResponse.json({ error: 'Token error' }, { status: 500 });
          const res = NextResponse.json({ ok: true, role: data.role });
          res.cookies.set(SA_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 3600,
            path: '/',
          });
          return res;
        }
      }
    } catch {}
  }

  // Fallback: check localStorage-style sub-admins (for dev compatibility)
  // This only runs in development
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SA_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
