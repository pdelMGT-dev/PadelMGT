const SESSION_KEY = 'padelmgt_sa_session';
const CREDENTIALS = { email: 'superadmin@padelmgt.com', password: 'PadelMGT2026!' };

export function saLogin(email: string, password: string): boolean {
  if (email === CREDENTIALS.email && password === CREDENTIALS.password) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, loginAt: new Date().toISOString() }));
    return true;
  }
  return false;
}

export function saIsLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem(SESSION_KEY);
}

export function saLogout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
