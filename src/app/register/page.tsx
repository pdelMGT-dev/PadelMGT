'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      role: 'player' as const,
    };

    localStorage.setItem('padelmgt_user', JSON.stringify(user));
    router.push('/dashboard/player/quick-game');
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
            Crear cuenta
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 36px' }}>
            Únete a PadelMGT y empieza a jugar
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="name" style={labelStyle}>Nombre completo</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Diego García"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

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
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
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
              Crear cuenta
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-500)', marginTop: 24 }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
