'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Role = 'player' | 'club_manager' | 'league_organizer' | 'federation';

const roles: { id: Role; label: string; sub: string; features: string[] }[] = [
  { id: 'player', label: 'Jugador', sub: 'Para jugadores que quieren encontrar partidos y torneos.', features: ['Ranking personal', 'Historial de partidos', 'Invitaciones por QR', 'Conexión con amigos'] },
  { id: 'club_manager', label: 'Club', sub: 'Para gestionar un club, canchas y torneos.', features: ['Dashboard del club', 'Torneos ilimitados', 'Gestión de miembros', 'Importar jugadores CSV'] },
  { id: 'league_organizer', label: 'Liga', sub: 'Para organizar ligas y competiciones multi-club.', features: ['Tabla de posiciones', 'Multi-club / multi-sede', 'Ascensos y descensos', 'Gestión de temporadas'] },
  { id: 'federation', label: 'Federación', sub: 'Para federaciones nacionales y regionales.', features: ['Ranking oficial', 'White-label completo', 'Multi-categoría', 'Torneos sancionados'] },
];

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = (params.get('role') as Role) || 'player';
  const [role, setRole] = useState<Role>(defaultRole);

  const roleToPath: Record<Role, string> = {
    player: '/dashboard/player',
    club_manager: '/dashboard/club',
    league_organizer: '/dashboard/league',
    federation: '/dashboard/federation',
  };
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', country: '', city: '', orgName: '' });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex' }}>
      {/* Left — court image */}
      <div style={{ flex: '0 0 45%', position: 'relative', overflow: 'hidden', display: 'flex' }}>
        <img src="/assets/court-bg.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,22,56,0.88) 0%, rgba(26,78,216,0.75) 100%)' }} />
        <div style={{ position: 'relative', padding: '64px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#fff', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>P</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em' }}>PadelMGT</span>
          </Link>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(40px, 5vw, 80px)', textTransform: 'uppercase', letterSpacing: '-0.025em', lineHeight: 0.9, color: '#fff', marginBottom: 20 }}>
              CREA.<br /><span style={{ color: 'var(--neon)' }}>JUEGA.</span><br />RANKEA.
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 320 }}>
              La plataforma para gestionar torneos, ligas y clubes de pádel en Latinoamérica.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {[{ n: '12,400+', l: 'Jugadores' }, { n: '380', l: 'Clubes' }, { n: '47', l: 'Ligas' }].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: '#fff' }}>{s.n}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 48px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
              Paso {step} de 2
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 48, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.92, margin: 0 }}>
              {step === 1 ? 'SOY UN…' : 'MIS DATOS'}
            </h1>
          </div>

          {step === 1 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 32 }}>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    style={{
                      textAlign: 'left', padding: '20px', border: `2px solid ${role === r.id ? 'var(--black)' : 'var(--grey-200)'}`,
                      background: role === r.id ? 'var(--black)' : '#fff', cursor: 'pointer', borderRadius: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', color: role === r.id ? '#fff' : 'var(--black)', letterSpacing: '-0.01em', marginBottom: 6 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: role === r.id ? 'rgba(255,255,255,0.7)' : 'var(--grey-500)', marginBottom: 12, lineHeight: 1.4 }}>{r.sub}</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {r.features.map(f => (
                        <li key={f} style={{ fontSize: 11, color: role === r.id ? 'rgba(255,255,255,0.8)' : 'var(--grey-500)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ color: role === r.id ? 'var(--neon)' : 'var(--turf-green)', fontSize: 10, fontWeight: 700 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn btn-primary btn-lg" style={{ width: '100%', borderRadius: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Continuar como {roles.find(r => r.id === role)?.label} →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)', marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                ← Volver
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
                <div className="field"><label>Nombre</label><input value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Diego" style={{ borderRadius: 0 }} /></div>
                <div className="field"><label>Apellido</label><input value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="García" style={{ borderRadius: 0 }} /></div>
              </div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="diego@email.com" style={{ borderRadius: 0 }} /></div>
              <div className="field"><label>Contraseña</label><input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mínimo 8 caracteres" style={{ borderRadius: 0 }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
                <div className="field"><label>País</label>
                  <select value={form.country} onChange={e => update('country', e.target.value)} style={{ borderRadius: 0 }}>
                    <option value="">Seleccionar</option>
                    {['Argentina', 'México', 'Colombia', 'Chile', 'Brasil', 'Perú', 'Uruguay', 'España', 'Otro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field"><label>Ciudad</label><input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Tu ciudad" style={{ borderRadius: 0 }} /></div>
              </div>
              {role !== 'player' && (
                <div className="field">
                  <label>{role === 'club_manager' ? 'Nombre del Club' : role === 'league_organizer' ? 'Nombre de la Liga' : 'Nombre de la Federación'}</label>
                  <input value={form.orgName} onChange={e => update('orgName', e.target.value)} placeholder="Mi Organización" style={{ borderRadius: 0 }} />
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--grey-400)', marginBottom: 16, lineHeight: 1.5 }}>
                Al crear una cuenta aceptas nuestros <Link href="/terms" style={{ color: 'var(--black)' }}>Términos</Link> y <Link href="/privacy" style={{ color: 'var(--black)' }}>Política de Privacidad</Link>.
              </p>
              <button
                onClick={() => router.push(roleToPath[role])}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', borderRadius: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Crear Cuenta
              </button>
            </>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-400)', marginTop: 24 }}>
            ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--black)', fontWeight: 600 }}>Iniciar Sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
