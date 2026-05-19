'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const user = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      setError('Email o contraseña incorrectos.');
      return;
    }

    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      shortId: user.shortId,
      role: user.role,
      sub: user.sub,
    };
    localStorage.setItem('padelmgt_user', JSON.stringify(session));
    router.push(ROLE_REDIRECT[user.role]);
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
              <label htmlFor="password" style={labelStyle}>Contraseña</label>
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
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: 0, padding: '14px', fontSize: 14 }}
            >
              Entrar
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
