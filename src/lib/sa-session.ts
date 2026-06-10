import { NextRequest, NextResponse } from 'next/server';

export const SA_COOKIE_NAME = 'padelmgt_sa_token';

export interface SATokenPayload {
  email: string;
  role: string;
  subAdminId?: string;
  exp: number;
}

async function getSecretKey(): Promise<CryptoKey> {
  const raw =
    process.env.SA_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    'dev-fallback-secret-padelmgt-2026';
  const enc = new TextEncoder().encode(raw);
  return crypto.subtle.importKey('raw', enc, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSAToken(payload: Omit<SATokenPayload, 'exp'>): Promise<string | null> {
  try {
    const exp = Math.floor(Date.now() / 1000) + 8 * 3600; // 8 hours
    const body = btoa(JSON.stringify({ ...payload, exp }));
    const key = await getSecretKey();
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return `${body}.${sigB64}`;
  } catch {
    return null;
  }
}

export async function verifySAToken(token: string | undefined | null): Promise<SATokenPayload | null> {
  if (!token) return null;
  try {
    const [body, sigB64] = token.split('.');
    if (!body || !sigB64) return null;
    const key = await getSecretKey();
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(body));
    if (!valid) return null;
    const payload: SATokenPayload = JSON.parse(atob(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireSARequest(request: NextRequest): Promise<SATokenPayload | null> {
  const token = request.cookies.get(SA_COOKIE_NAME)?.value;
  return verifySAToken(token);
}

export function saUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
