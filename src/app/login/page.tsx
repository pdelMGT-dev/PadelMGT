'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatePlayer } from '@/lib/player-store';
import { syncAllFromSupabase, syncUserTournaments, syncUserGames } from '@/lib/supabase-sync';
import { supabase, isSupabaseConfigured, authSignIn, fetchPlayerByUserId, fetchPlayerByEmail } from '@/lib/supabase';
import BrandLogo from '@/components/BrandLogo';

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

// Demo accounts are only active when explicitly enabled via env flag.
// They must NEVER include a super_admin role: the superadmin area requires
// a signed server-issued token (see /api/sa/login) and has its own login.
const DEMO_ACCOUNTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true';

const ALL_MOCK_USERS: MockUser[] = [
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
];

const MOCK_USERS: MockUser[] = DEMO_ACCOUNTS_ENABLED ? ALL_MOCK_USERS : [];

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
  const [registerUrl, setRegisterUrl] = useState('/register');
  const [sbStatus, setSbStatus] = useState<'checking' | 'ok' | 'unconfigured' | 'error'>('checking');

  useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect) setRegisterUrl(`/register?redirect=${encodeURIComponent(redirect)}`);

    if (!isSupabaseConfigured) { setSbStatus('unconfigured'); return; }
    supabase!.auth.getSession()
      .then(() => setSbStatus('ok'))
      .catch(() => setSbStatus('error'));
  }, []);

  async function handleResendConfirmation() {
    if (!supabase || !email) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setError(`No se pudo reenviar: ${error.message}`);
    } else {
      setError('Email de confirmación reenviado. Revisá tu bandeja de entrada.');
    }
  }

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

    function saveSession(session: Record<string, unknown>, role: string) {
      try { localStorage.setItem('padelmgt_user', JSON.stringify(session)); } catch { /* quota/private mode */ }
      try { localStorage.removeItem('padelmgt_last_sync'); } catch { /* ignore */ }
      try { document.cookie = `padelmgt_session=${role}; path=/; SameSite=Lax; max-age=86400`; } catch { /* ignore */ }
    }

    // 1. Check built-in demo accounts (club, league, federation, super-admin, seed players)
    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (mockUser) {
      const session = {
        id: mockUser.id, name: mockUser.name, email: mockUser.email,
        shortId: mockUser.shortId, role: mockUser.role, sub: mockUser.sub,
      };
      saveSession(session, mockUser.role);
      setLoading(false);
      router.push(getRedirectUrl(mockUser.role));
      return;
    }

    // 2. Supabase Auth (for real registered players)
    const { data: authData, error: authError } = await authSignIn(email, password);

    // Distinguish "email not confirmed" from wrong credentials
    if (authError) {
      const msg = (authError as { message?: string }).message?.toLowerCase() ?? '';
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setError('Tu email aún no está confirmado. Revisá tu bandeja de entrada y hacé clic en el enlace de confirmación.');
        setLoading(false);
        return;
      }
      if (msg.includes('too many requests') || msg.includes('rate limit')) {
        setError('Demasiados intentos. Esperá unos minutos antes de intentar de nuevo.');
        setLoading(false);
        return;
      }
      // Other Supabase errors → fall through to localStorage auth
    }

    if (!authError && authData?.user) {
      const authUser = authData.user;
      // Role comes from Supabase Auth user metadata (set at signup via ?role=).
      // super_admin is never derivable here — the SA area has its own signed login.
      const metaRole = (authUser.user_metadata?.padelmgt_role as string) ?? 'player';
      const userRole: UserRole = (['player', 'club_manager', 'league_organizer', 'federation'].includes(metaRole)
        ? metaRole : 'player') as UserRole;

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
          role:          userRole,
          sub:           `${cf.shortId ?? ''} · ${(sbPlayer.city as string) ?? (sbPlayer.country as string) ?? ''}`,
          rankingPoints: (sbPlayer.ranking_points as number) ?? 0,
          ...(cf.plan ? { plan: cf.plan } : {}),
        };
        saveSession(session, userRole);
        setLoading(false);
        // Sync global data + user's own tournaments and games across devices
        syncAllFromSupabase();
        Promise.allSettled([
          syncUserTournaments(sbPlayer.id as string),
          syncUserGames(sbPlayer.id as string),
        ]).finally(() => router.push(getRedirectUrl(userRole)));
        return;
      }

      // Auth succeeded but no player record — use auth user data as fallback
      const session = {
        id:      authUser.id,
        name:    authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? 'Jugador',
        email:   authUser.email ?? email,
        role:    userRole,
        sub:     '',
      };
      saveSession(session, userRole);
      setLoading(false);
      router.push(getRedirectUrl(userRole));
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
      saveSession(session, 'player');
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
        <Link href="/" style={{ textDecoration: 'none' }}>
          <BrandLogo variant="white" height={32} />
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
          <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 20px' }}>
            Accede a tu cuenta de PadelMGT
          </p>

          {/* Supabase connectivity status */}
          {sbStatus === 'unconfigured' && (
            <div style={{ padding: '10px 14px', background: '#fef9c3', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', marginBottom: 20, lineHeight: 1.5 }}>
              <strong>Servidor no configurado.</strong> Las variables de entorno de Supabase no están definidas en este entorno. Solo las cuentas de prueba están disponibles.
            </div>
          )}
          {sbStatus === 'error' && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', marginBottom: 20, lineHeight: 1.5 }}>
              <strong>Sin conexión al servidor.</strong> No se puede conectar con Supabase. Verificá tu conexión o desactivá bloqueadores de contenido.
            </div>
          )}
          {sbStatus === 'ok' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#16a34a', marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              Servidor conectado
            </div>
          )}

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
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: '#e53e3e', margin: 0 }}>{error}</p>
                  {error.includes('confirmado') && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      style={{ marginTop: 6, fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      Reenviar email de confirmación
                    </button>
                  )}
                </div>
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
            <Link href={registerUrl} style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
              Crear cuenta
            </Link>
          </p>

          {/* Dev credentials panel — only when demo accounts are enabled */}
          {DEMO_ACCOUNTS_ENABLED && (
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
          )}
        </div>
      </div>
    </div>
  );
}
