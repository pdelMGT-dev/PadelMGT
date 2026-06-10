'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saLogin } from '@/lib/superadmin-auth';
import BrandLogo from '@/components/BrandLogo';

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await saLogin(email, password);
    if (ok) {
      router.replace('/superadmin/dashboard');
    } else {
      setError('Credenciales incorrectas');
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      {/* Left panel - branding */}
      <div style={{
        flex: '0 0 60%',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <BrandLogo variant="white" height={56} />
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginBottom: 48,
          }}>
            Panel de Administracion Global
          </div>

          <div style={{
            width: 64,
            height: 2,
            background: 'var(--turf-green)',
            margin: '0 auto 48px',
          }} />

          <p style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 14,
            lineHeight: 1.7,
            letterSpacing: '0.02em',
          }}>
            Acceso restringido al equipo de administracion de PadelMGT.
            Este panel permite gestionar jugadores, clubes, torneos y la configuracion global de la plataforma.
          </p>

          <div style={{ marginTop: 64, display: 'flex', gap: 24, justifyContent: 'center' }}>
            {['Jugadores', 'Clubes', 'Torneos'].map(item => (
              <div key={item} style={{
                padding: '8px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{
        flex: '0 0 40%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'var(--grey-400)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Super Admin
            </div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--black)',
              margin: 0,
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.02em',
            }}>
              Iniciar Sesion
            </h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: 'var(--grey-500)',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@padelmgt.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--grey-200)',
                  borderRadius: 4,
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--black)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--turf-green)')}
                onBlur={e => (e.target.style.borderColor = 'var(--grey-200)')}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: 'var(--grey-500)',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Contrasena
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 44px 10px 14px',
                    border: '1px solid var(--grey-200)',
                    borderRadius: 4,
                    fontSize: 14,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--black)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--turf-green)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--grey-200)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--grey-400)',
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  {showPassword ? 'OC' : 'VR'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: 4,
                color: '#dc2626',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'var(--grey-300)' : '#0a0a0a',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'background 0.15s',
                marginTop: 4,
              }}
            >
              {loading ? 'Verificando...' : 'Acceder al Panel'}
            </button>
          </form>

          <div style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid var(--grey-100)',
            fontSize: 11,
            color: 'var(--grey-400)',
            textAlign: 'center',
          }}>
            Acceso restringido — Solo personal autorizado
          </div>
        </div>
      </div>
    </div>
  );
}
