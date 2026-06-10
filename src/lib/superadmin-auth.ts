import type { SAAdminUser } from './superadmin-data';

// Superadmin auth — credentials are validated SERVER-SIDE via /api/sa/login.
// The server sets a signed httpOnly cookie (padelmgt_sa_token) that the
// middleware verifies cryptographically. The sessionStorage record below is
// only a UI hint (name/role display); it grants no access by itself.

const SESSION_KEY = 'padelmgt_sa_session';

export interface SASession {
  email: string;
  role: 'superadmin' | SAAdminUser['role'];
  loginAt: string;
  subAdminId?: string;
}

export async function saLogin(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/sa/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { ok: boolean; email: string; role: SASession['role']; subAdminId?: string };
    if (!data.ok) return false;
    const session: SASession = {
      email: data.email,
      role: data.role,
      loginAt: new Date().toISOString(),
      ...(data.subAdminId ? { subAdminId: data.subAdminId } : {}),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Legacy role cookie kept for middleware's role-based dashboard routing
    document.cookie = 'padelmgt_session=super_admin; path=/; max-age=28800; SameSite=Lax';
    return true;
  } catch {
    return false;
  }
}

export function saIsLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem(SESSION_KEY);
}

export function saGetSession(): SASession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SASession; } catch { return null; }
}

export function saGetRole(): SASession['role'] | null {
  return saGetSession()?.role ?? null;
}

export function saIsSuperAdmin(): boolean {
  return saGetRole() === 'superadmin';
}

export function saLogout(): void {
  sessionStorage.removeItem(SESSION_KEY);
  document.cookie = 'padelmgt_session=; path=/; max-age=0';
  // Clear the signed httpOnly cookie server-side
  void fetch('/api/sa/login', { method: 'DELETE' }).catch(() => {});
}
