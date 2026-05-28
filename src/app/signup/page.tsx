'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { registerPlayer, type PlayerSex } from '@/lib/player-store';
import { sanitizeText, isValidEmail } from '@/lib/sanitize';

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

function SignupForm() {
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [country,  setCountry]  = useState('');
  const [sex,      setSex]      = useState<PlayerSex | ''>('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanName = sanitizeText(name, 100);
    const cleanEmail = email.trim().toLowerCase().slice(0, 200);
    if (!cleanName)          { setError('Ingresá tu nombre completo.'); return; }
    if (!isValidEmail(cleanEmail)) { setError('Ingresá un email válido.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (!country)            { setError('Seleccioná tu país.'); return; }
    if (!sex)                { setError('Seleccioná tu sexo.'); return; }

    setLoading(true);
    const player = registerPlayer({ name: cleanName, email: cleanEmail, password, country, sex });

    if (!player) {
      setError('Ya existe una cuenta con ese email.');
      setLoading(false);
      return;
    }

    const session = {
      id:         player.id,
      name:       player.name,
      email:      player.email,
      shortId:    player.shortId,
      role:       'player',
      sub:        `${player.shortId} · ${player.country ?? ''}`,
      firstLogin: true,
    };
    localStorage.setItem('padelmgt_user', JSON.stringify(session));
    router.push('/dashboard/player');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--black)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'var(--neon)', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>P</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: '#fff', letterSpacing: '0.04em' }}>PADELMGT</span>
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ¿Ya tenés cuenta? Iniciar sesión →
        </Link>
      </div>

      {/* Card */}
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
              <label htmlFor="su-name" style={labelStyle}>Nombre y apellido</label>
              <input id="su-name" type="text" autoComplete="name" placeholder="Diego García"
                value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="su-email" style={labelStyle}>Email</label>
              <input id="su-email" type="email" autoComplete="email" placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="su-password" style={labelStyle}>Contraseña</label>
              <input id="su-password" type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="su-country" style={labelStyle}>País de residencia</label>
              <select id="su-country" value={country} onChange={e => setCountry(e.target.value)}
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
            <Link href="/login" style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
