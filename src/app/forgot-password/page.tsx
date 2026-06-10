'use client';

import Link from 'next/link';
import { useState } from 'react';
import { resetPasswordForEmail } from '@/lib/supabase';
import BrandLogo from '@/components/BrandLogo';

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--grey-200)',
  fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
  display: 'block', fontFamily: 'var(--font-body)', borderRadius: 0,
};

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Ingresá un email válido.');
      return;
    }
    setLoading(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: err } = await resetPasswordForEmail(email.trim(), `${origin}/reset-password`);
    setLoading(false);
    if (err) {
      setError(err.message ?? 'Error al enviar el correo. Intentá de nuevo.');
      return;
    }
    setSent(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--black)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <BrandLogo variant="white" height={32} />
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ← Volver al inicio de sesión
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 480, padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(214,255,0,0.12)', border: '2px solid var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--black)' }}>
                Email enviado
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 8px', lineHeight: 1.6 }}>
                Si existe una cuenta para <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p style={{ fontSize: 13, color: 'var(--grey-400)', margin: '0 0 32px' }}>
                Revisá tu bandeja de entrada y también la carpeta de spam.
              </p>
              <Link href="/login" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--black)' }}>
                Recuperar contraseña
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 32px' }}>
                Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: 28 }}>
                  <label htmlFor="fp-email" style={labelStyle}>Email</label>
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-500)', marginTop: 24 }}>
                ¿Recordaste tu contraseña?{' '}
                <Link href="/login" style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
                  Iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
