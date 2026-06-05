'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatePlayer, getPlayer } from '@/lib/player-store';
import { syncAllFromSupabase, syncUserTournaments, syncUserGames } from '@/lib/supabase-sync';
import { authSignIn, fetchPlayerByUserId, fetchPlayerByEmail } from '@/lib/supabase';

type UserRole = 'player' | 'club_manager' | 'league_organizer' | 'federation' | 'super_admin';

interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  shortId: string;
  role: UserRole;
  sub: string;
}

const MOCK_USERS: MockUser[] = [
  // ── Jugadores ──────────────────────────────────────────────────────────────
  {
    id: 'player-001',
    email: 'carlos@padelmgt.com',
    password: 'jugador123',
    name: 'Carlos Méndez',
    shortId: '#00101',
    role: 'player',
    sub: '#101 · Buenos Aires',
  },
  {
    id: 'player-002',
    email: 'sofia@padelmgt.com',
    password: 'jugador123',
    name: 'Sofía Ruiz',
    shortId: '#00102',
    role: 'player',
    sub: '#102 · Mendoza',
  },
  {
    id: 'player-003',
    email: 'lucas@padelmgt.com',
    password: 'jugador123',
    name: 'Lucas Herrera',
    shortId: '#00103',
    role: 'player',
    sub: '#103 · Córdoba',
  },
  // ── Club ───────────────────────────────────────────────────────────────────
  {
    id: 'club-001',
    email: 'cantera@padelmgt.com',
    password: 'club123',
    name: 'Club La Cantera',
    shortId: '#C001',
    role: 'club_manager',
    sub: '127 miembros · 8 canchas',
  },
  // ── Liga ───────────────────────────────────────────────────────────────────
  {
    id: 'league-001',
    email: 'liga@padelmgt.com',
    password: 'liga123',
    name: 'Liga Premier LATAM',
    shortId: '#L001',
    role: 'league_organizer',
    sub: '12 equipos · Temp. 2026',
  },
  // ── Federación ─────────────────────────────────────────────────────────────
  {
    id: 'fed-001',
    email: 'federacion@padelmgt.com',
    password: 'fed123',
    name: 'Federación Argentina',
    shortId: '#F001',
    role: 'federation',
    sub: '380 clubes · 9 países',
  },
  // ── Master / Super Admin ───────────────────────────────────────────────────
  {
    id: 'super-admin-001',
    email: 'master@padelmgt.com',
    password: 'master2026',
    name: 'Master Admin',
    shortId: '#SA001',
    role: 'super_admin',
    sub: 'Acceso total a la plataforma',
  },
];

const ROLE_REDIRECT: Record<UserRole, string> = {
  player: '/dashboard/player',
  club_manager: '/dashboard/club',
  league_organizer: '/dashboard/league',
  federation: '/dashboard/federation',
  super_admin: '/dashboard/super-admin',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getRedirectUrl(role: string): string {
    if (typeof window !== 'undefined') {
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      if (redirect) return redirect;
    }
    return ROLE_REDIRECT[role as UserRole] ?? '/dashboard/player';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Check built-in demo accounts (club, league, federation, super-admin, seed players)
    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (mockUser) {
      const session = {
        id: mockUser.id, name: mockUser.name, email: mockUser.email,
        shortId: mockUser.shortId, role: mockUser.role, sub: mockUser.sub,
      };
      localStorage.setItem('padelmgt_user', JSON.stringify(session));
      localStorage.removeItem('padelmgt_last_sync');
      document.cookie = `padelmgt_session=${mockUser.role}; path=/; SameSite=Lax; max-age=86400`;
      setLoading(false);
      router.push(getRedirectUrl(mockUser.role));
      return;
    }

    // 2. Supabase Auth (for real registered players)
    const { data: authData, error: authError } = await authSignIn(email, password);
    if (!authError && authData?.user) {
      const authUser = authData.user;
      // Fetch the player record from Supabase (by user_id first, then by email)
      let sbPlayer = await fetchPlayerByUserId(authUser.id);
      if (!sbPlayer) sbPlayer = await fetchPlayerByEmail(authUser.email ?? email);

      if (sbPlayer) {
        const cf = (sbPlayer.custom_fields as Record<string, string>) ?? {};
        const session = {
          id:            (sbPlayer.id as string),
          name:          (sbPlayer.name as string),
          email:         (sbPlayer.email as string),
          shortId:       cf.shortId || (sbPlayer.short_id as string) || '',
          role:          'player' as UserRole,
          sub:           `${cf.shortId ?? ''} · ${(sbPlayer.city as string) ?? (sbPlayer.country as string) ?? ''}`,
          rankingPoints: (sbPlayer.ranking_points as number) ?? 0,
          ...(cf.plan ? { plan: cf.plan } : {}),
        };
        localStorage.setItem('padelmgt_user', JSON.stringify(session));
        localStorage.removeItem('padelmgt_last_sync');
        document.cookie = `padelmgt_session=player; path=/; SameSite=Lax; max-age=86400`;
        setLoading(false);
        // Sync global data + user's own tournaments and games across devices
        syncAllFromSupabase();
        Promise.allSettled([
          syncUserTournaments(sbPlayer.id as string),
          syncUserGames(sbPlayer.id as string),
        ]).finally(() => router.push(getRedirectUrl('player')));
        return;
      }

      // Auth succeeded but no player record — use auth user data as fallback
      const session = {
        id:      authUser.id,
        name:    authUser.email?.split('@')[0] ?? 'Jugador',
        email:   authUser.email ?? email,
        role:    'player' as UserRole,
        sub:     '',
      };
      localStorage.setItem('padelmgt_user', JSON.stringify(session));
      localStorage.removeItem('padelmgt_last_sync');
      document.cookie = `padelmgt_session=player; path=/; SameSite=Lax; max-age=86400`;
      setLoading(false);
      router.push(getRedirectUrl('player'));
      return;
    }

    // 3. Fallback: legacy localStorage auth for seed players with stored passwords
    const player = authenticatePlayer(email, password);
    if (player) {
      const session = {
        id:      player.id,
        name:    player.name,
        email:   player.email,
        shortId: player.shortId,
        role:    'player' as UserRole,
        sub:     `${player.shortId} · ${player.city ?? player.country ?? ''}`,
        ...(player.plan ? { plan: player.plan } : {}),
      };
      localStorage.setItem('padelmgt_user', JSON.stringify(session));
      localStorage.removeItem('padelmgt_last_sync');
      document.cookie = `padelmgt_session=player; path=/; SameSite=Lax; max-age=86400`;
      setLoading(false);
      syncAllFromSupabase().finally(() => router.push(getRedirectUrl('player')));
      return;
    }

    setError('Email o contraseña incorrectos.');
    setLoading(false);
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--grey-500)',
    marginBottom: 8,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--grey-200)',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
    display: 'block',
    fontFamily: 'var(--font-body)',
    borderRadius: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero bar */}
      <div style={{ background: 'var(--black)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'var(--neon)', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>P</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: '#fff', letterSpacing: '0.04em' }}>PADELMGT</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ← Volver al inicio
        </Link>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 480, padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--black)' }}>
            Iniciar sesión
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 36px' }}>
            Accede a tu cuenta de PadelMGT
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>Contraseña</label>
                <Link href="/forgot-password" style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
              {error && (
                <p style={{ fontSize: 13, color: '#e53e3e', marginTop: 8 }}>{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: 0, padding: '14px', fontSize: 14, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-500)', marginTop: 24 }}>
            ¿No tienes cuenta?{' '}
            <Link href="/register" style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
              Crear cuenta
            </Link>
          </p>

          {/* Dev credentials panel */}
          <details style={{ marginTop: 28, borderTop: '1px dashed var(--grey-200)', paddingTop: 20 }}>
            <summary style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)', cursor: 'pointer', userSelect: 'none' }}>
              Cuentas de prueba
            </summary>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Jugador 1', email: 'carlos@padelmgt.com', pass: 'jugador123', color: 'var(--court-blue)' },
                { label: 'Jugador 2', email: 'sofia@padelmgt.com',  pass: 'jugador123', color: 'var(--court-blue)' },
                { label: 'Jugador 3', email: 'lucas@padelmgt.com',  pass: 'jugador123', color: 'var(--court-blue)' },
                { label: 'Club',      email: 'cantera@padelmgt.com', pass: 'club123',    color: '#6b7280' },
                { label: 'Liga',      email: 'liga@padelmgt.com',    pass: 'liga123',    color: '#6b7280' },
                { label: 'Federación',email: 'federacion@padelmgt.com', pass: 'fed123', color: '#6b7280' },
                { label: 'Master',    email: 'master@padelmgt.com',  pass: 'master2026', color: '#d97706' },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(u.pass); setError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', border: '1px solid var(--grey-100)',
                    background: 'var(--grey-50)', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: u.color, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: 72 }}>{u.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--grey-500)', fontFamily: 'monospace' }}>{u.email}</span>
                  <span style={{ fontSize: 11, color: 'var(--grey-400)', fontFamily: 'monospace' }}>{u.pass}</span>
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
