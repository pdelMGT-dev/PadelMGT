'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserPassword, exchangeCodeForSession } from '@/lib/supabase';

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--grey-200)',
  fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
  display: 'block', fontFamily: 'var(--font-body)', borderRadius: 0,
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [ready,     setReady]     = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [initError, setInitError] = useState('');

  useEffect(() => {
    // Supabase sends the user back with a `code` query param (PKCE flow)
    // or a hash fragment containing `type=recovery&access_token=...` (implicit flow)
    async function init() {
      if (typeof window === 'undefined') return;

      // Try PKCE code exchange first
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error: exchErr } = await exchangeCodeForSession(code);
        if (exchErr) {
          setInitError('El enlace de recuperación expiró o no es válido. Solicitá uno nuevo.');
        } else {
          setReady(true);
        }
        return;
      }

      // Implicit flow: hash contains access_token + type=recovery
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get('type') === 'recovery') {
        setReady(true);
        return;
      }

      setInitError('Acceso inválido. Usá el enlace del email de recuperación.');
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const { error: updateErr } = await updateUserPassword(password);
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message ?? 'Error al actualizar la contraseña. Intentá de nuevo.');
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/login'), 3000);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--black)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'var(--neon)', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>P</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: '#fff', letterSpacing: '0.04em' }}>PADELMGT</span>
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 480, padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {initError ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--black)' }}>
                Enlace inválido
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 32px', lineHeight: 1.6 }}>{initError}</p>
              <Link href="/forgot-password" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px', fontSize: 14, textDecoration: 'none', borderRadius: 0 }}>
                Solicitar nuevo enlace →
              </Link>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(214,255,0,0.12)', border: '2px solid var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--black)' }}>
                Contraseña actualizada
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 8px' }}>
                Tu contraseña fue cambiada exitosamente.
              </p>
              <p style={{ fontSize: 13, color: 'var(--grey-400)', margin: '0 0 32px' }}>
                Redirigiendo al inicio de sesión…
              </p>
              <Link href="/login" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
                Ir a iniciar sesión →
              </Link>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>Verificando enlace…</div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--black)' }}>
                Nueva contraseña
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 32px' }}>
                Elegí una nueva contraseña para tu cuenta.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="rp-password" style={labelStyle}>Nueva contraseña</label>
                  <input
                    id="rp-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label htmlFor="rp-confirm" style={labelStyle}>Confirmar contraseña</label>
                  <input
                    id="rp-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repetí la contraseña"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
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
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
