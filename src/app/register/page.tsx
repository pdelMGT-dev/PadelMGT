'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { registerPlayer, type PlayerSex } from '@/lib/player-store';
import BrandLogo from '@/components/BrandLogo';
import { authSignUp } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';
import { validatePromoCode, redeemPromoCode } from '@/lib/promotion-store';

const COUNTRIES: string[] = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Portugal', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela', 'Alemania', 'Australia',
  'Bélgica', 'Canadá', 'China', 'Dinamarca', 'Estados Unidos', 'Francia',
  'Grecia', 'Holanda', 'India', 'Italia', 'Japón', 'Noruega', 'Polonia',
  'Reino Unido', 'Rusia', 'Sudáfrica', 'Suecia', 'Suiza', 'Turquía',
  'Ucrania', 'Otro',
];

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--grey-200)',
  fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
  display: 'block', fontFamily: 'var(--font-body)', borderRadius: 0,
};

export default function RegisterPage() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [country,  setCountry]  = useState('');
  const [sex,      setSex]      = useState<PlayerSex | ''>('');
  const [promoCode,    setPromoCode]    = useState('');
  const [promoStatus,  setPromoStatus]  = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [promoMsg,     setPromoMsg]     = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [loginUrl, setLoginUrl] = useState('/login');

  useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect) setLoginUrl(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, []);

  function handlePromoCheck() {
    if (!promoCode.trim()) { setPromoStatus('idle'); setPromoMsg(''); return; }
    const result = validatePromoCode(promoCode);
    if (result.valid) {
      setPromoStatus('valid');
      setPromoMsg(result.promo.description || 'Código válido');
    } else {
      setPromoStatus('invalid');
      setPromoMsg(result.error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name.trim())                   { setError('Ingresá tu nombre completo.'); return; }
    if (!emailRegex.test(email.trim())) { setError('Ingresá un email válido (ej: nombre@dominio.com).'); return; }
    if (password.length < 8)            { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (!/[a-zA-Z]/.test(password))     { setError('La contraseña debe contener al menos una letra.'); return; }
    if (!/[0-9]/.test(password))        { setError('La contraseña debe contener al menos un número.'); return; }
    if (!country)                       { setError('Seleccioná tu país.'); return; }
    if (!sex)                           { setError('Seleccioná tu sexo.'); return; }

    setLoading(true);

    // 1. Register in Supabase Auth (password lives here, not in localStorage)
    let authUserId: string | undefined;
    const { data: authData, error: authError } = await authSignUp(email.trim(), password);
    if (authError) {
      const msg = authError.message?.toLowerCase() ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists')) {
        setError('Ya existe una cuenta con ese email. Intentá iniciar sesión.');
      } else if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many')) {
        setError('Límite de emails alcanzado. Esperá unos minutos e intentá nuevamente.');
      } else if (msg.includes('supabase no configurado') || msg.includes('not configured')) {
        authUserId = undefined;
      } else {
        setError(authError.message ?? 'Error al crear la cuenta.');
        setLoading(false);
        return;
      }
      if (!msg.includes('supabase no configurado') && !msg.includes('not configured')) {
        setLoading(false);
        return;
      }
    }
    authUserId = authUserId ?? authData?.user?.id;

    // 2. Create player record in localStorage (+ fire-and-forget to Supabase players table)
    const player = registerPlayer({ name: name.trim(), email: email.trim(), country, sex, authUserId });
    if (!player) {
      setError('Ya existe una cuenta con ese email.');
      setLoading(false);
      return;
    }

    // Redeem promo code if provided
    if (promoCode.trim()) {
      redeemPromoCode(promoCode.trim(), { id: player.id, email: player.email, name: player.name });
    }

    // Fire-and-forget welcome email — non-blocking
    sendWelcomeEmail(player.email, player.name).catch(() => {});
    setLoading(false);
    setSuccess(true);
  }

  const headerBar = (
    <div style={{ background: 'var(--black)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <BrandLogo variant="white" height={32} />
      </Link>
      <Link href={loginUrl} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
        ¿Ya tenés cuenta? Iniciar sesión →
      </Link>
    </div>
  );

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
        {headerBar}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 480, padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(214,255,0,0.12)', border: '2px solid var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--black)' }}>
              ¡Cuenta creada!
            </h1>
            <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 8px', lineHeight: 1.6 }}>
              Revisá tu bandeja de entrada en <strong>{email}</strong> para confirmar tu cuenta.
            </p>
            <p style={{ fontSize: 13, color: 'var(--grey-400)', margin: '0 0 32px' }}>
              Una vez confirmado el email, podés iniciar sesión.
            </p>
            <Link href={loginUrl} className="btn btn-primary" style={{ display: 'inline-block', padding: '14px 32px', fontSize: 14, textDecoration: 'none', borderRadius: 0 }}>
              Ir a iniciar sesión →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
      {headerBar}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 520, padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--black)' }}>
            Crear cuenta
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 32px' }}>
            Únete a PadelMGT y empieza a jugar
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="reg-name" style={labelStyle}>Nombre y apellido</label>
              <input id="reg-name" type="text" autoComplete="name" placeholder="Diego García"
                value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="reg-email" style={labelStyle}>Email</label>
              <input id="reg-email" type="email" autoComplete="email" placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="reg-password" style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres con letras y números"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--grey-400)', fontWeight: 600, padding: '4px 6px' }}
                >
                  {showPw ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {password.length > 0 && (() => {
                const hasLen = password.length >= 8;
                const hasLetter = /[a-zA-Z]/.test(password);
                const hasNum = /[0-9]/.test(password);
                const score = [hasLen, hasLetter, hasNum].filter(Boolean).length;
                const barColor = score === 3 ? '#16a34a' : score === 2 ? '#d97706' : '#dc2626';
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[1,2,3].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: score >= i ? barColor : 'var(--grey-200)', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {[
                        { ok: hasLen,    label: '8+ caracteres' },
                        { ok: hasLetter, label: 'Una letra' },
                        { ok: hasNum,    label: 'Un número' },
                      ].map(({ ok, label }) => (
                        <span key={label} style={{ fontSize: 11, color: ok ? '#16a34a' : 'var(--grey-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontWeight: 700 }}>{ok ? '✓' : '○'}</span> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="reg-country" style={labelStyle}>País de residencia</label>
              <select id="reg-country" value={country} onChange={e => setCountry(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  color: country ? 'var(--black)' : 'var(--grey-400)',
                }}>
                <option value="" disabled>Seleccioná tu país</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Sexo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['M', 'Masculino'], ['F', 'Femenino']] as [PlayerSex, string][]).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setSex(val)}
                    style={{
                      padding: '12px', border: `2px solid ${sex === val ? 'var(--black)' : 'var(--grey-200)'}`,
                      background: sex === val ? 'var(--black)' : '#fff',
                      color: sex === val ? '#fff' : 'var(--grey-500)',
                      fontSize: 14, fontWeight: sex === val ? 700 : 400, cursor: 'pointer',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo code field */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="reg-promo" style={labelStyle}>Código promocional <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--grey-400)', fontSize: 10 }}>(opcional)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="reg-promo"
                  type="text"
                  placeholder="ej: WELCOME20"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoMsg(''); }}
                  onBlur={handlePromoCheck}
                  style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}
                />
                <button
                  type="button"
                  onClick={handlePromoCheck}
                  style={{ padding: '12px 16px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-600)', whiteSpace: 'nowrap' }}
                >
                  Verificar
                </button>
              </div>
              {promoStatus === 'valid' && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#166534', fontWeight: 600 }}>✓ {promoMsg}</div>
              )}
              {promoStatus === 'invalid' && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626' }}>{promoMsg}</div>
              )}
            </div>

            {error && (
              <div style={{ marginBottom: 20, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', borderRadius: 0, padding: '14px', fontSize: 14, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-500)', marginTop: 24 }}>
            ¿Ya tenés cuenta?{' '}
            <Link href={loginUrl} style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
