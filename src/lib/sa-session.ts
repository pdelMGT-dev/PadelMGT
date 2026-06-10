// sa-session.ts — Signed superadmin session tokens (server + edge middleware)
// Token format: base64url(payload JSON) + '.' + base64url(HMAC-SHA256 signature)
// Uses Web Crypto so it works in both Node API routes and Edge middleware.

export const SA_COOKIE_NAME = 'padelmgt_sa_token';
export const SA_SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours, matches previous behavior

export interface SATokenPayload {
  email: string;
  role: string;
  exp: number; // unix ms
}

function getSecret(): string | null {
  const secret =
    process.env.SA_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY;
  if (secret) return secret;
  // Fail closed in production: without a secret no SA token can be issued/verified
  if (process.env.NODE_ENV === 'production') return null;
  return 'padelmgt-dev-only-secret';
}

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(data: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

export async function signSAToken(payload: Omit<SATokenPayload, 'exp'>): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const full: SATokenPayload = { ...payload, exp: Date.now() + SA_SESSION_MAX_AGE * 1000 };
  const body = b64url(new TextEncoder().encode(JSON.stringify(full)));
  const sig = b64url(await hmac(body, secret));
  return `${body}.${sig}`;
}

export async function verifySAToken(token: string | undefined | null): Promise<SATokenPayload | null> {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = b64url(await hmac(body, secret));
    // Constant-time-ish comparison
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SATokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
