import type { SAAdminUser } from './superadmin-data';

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
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    const session: SASession = { email, role: data.role, loginAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
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

export async function saLogout(): Promise<void> {
  sessionStorage.removeItem(SESSION_KEY);
  try {
    await fetch('/api/sa/login', { method: 'DELETE', credentials: 'include' });
  } catch {}
  document.cookie = 'padelmgt_sa_token=; path=/; max-age=0';
  document.cookie = 'padelmgt_session=; path=/; max-age=0';
}
