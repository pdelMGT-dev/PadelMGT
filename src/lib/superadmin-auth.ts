import type { SAAdminUser } from './superadmin-data';

const SESSION_KEY = 'padelmgt_sa_session';
const CREDENTIALS = { email: 'superadmin@padelmgt.com', password: 'PadelMGT2026!' };

export interface SASession {
  email: string;
  role: 'superadmin' | SAAdminUser['role'];
  loginAt: string;
  subAdminId?: string;
}

export function saLogin(email: string, password: string): boolean {
  if (email === CREDENTIALS.email && password === CREDENTIALS.password) {
    const session: SASession = { email, role: 'superadmin', loginAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    document.cookie = 'padelmgt_session=super_admin; path=/; max-age=28800; SameSite=Lax';
    return true;
  }

  // Check sub-admins from localStorage
  try {
    const raw = localStorage.getItem('padelmgt_sa_admin_users');
    if (raw) {
      const users: SAAdminUser[] = JSON.parse(raw);
      const user = users.find(u => u.email === email && u.status === 'active');
      if (user) {
        const session: SASession = { email, role: user.role, loginAt: new Date().toISOString(), subAdminId: user.id };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        document.cookie = 'padelmgt_session=super_admin; path=/; max-age=28800; SameSite=Lax';
        return true;
      }
    }
  } catch {}

  return false;
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
}
