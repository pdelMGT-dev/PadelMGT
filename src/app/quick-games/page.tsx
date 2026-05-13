'use client';

import Link from 'next/link';
import { useState } from 'react';

const formats = ['Americano', 'Mexicano', 'Round Robin', 'Knockout'];
const levels = ['Todos los niveles', 'Principiante', 'Intermedio', 'Avanzado'];
const sizes = ['4 jugadores', '8 jugadores', '12 jugadores', '16 jugadores'];

const nearby = [
  { name: 'Americano Express', host: 'Diego M.', format: 'Americano', players: 6, max: 8, level: 'Todos', distance: '0.8 km', time: 'Hoy 19:00' },
  { name: 'Mexicano del Barrio', host: 'Ana R.', format: 'Mexicano', players: 4, max: 8, level: 'Intermedio', distance: '1.2 km', time: 'Hoy 20:30' },
  { name: 'Round Robin Rápido', host: 'Carlos V.', format: 'Round Robin', players: 2, max: 4, level: 'Avanzado', distance: '2.0 km', time: 'Mañana 09:00' },
  { name: 'Open Knockout', host: 'Sofía L.', format: 'Knockout', players: 10, max: 16, level: 'Todos', distance: '2.5 km', time: 'Sábado 10:00' },
];

export default function QuickGamesPage() {
  const [format, setFormat] = useState('Americano');
  const [level, setLevel] = useState('Todos los niveles');
  const [size, setSize] = useState('8 jugadores');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Juega ahora mismo.</div>
          <h1 className="page-title">PARTIDOS RÁPIDOS</h1>
          <p className="page-sub">Crea o únete a un partido en minutos. Sin burocracia, solo pádel.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 80 }}>

            {/* Create game */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 8 }}>Nuevo Partido</div>
              <h2 className="section-title" style={{ fontSize: 'clamp(32px, 3vw, 56px)', marginBottom: 40 }}>CREAR PARTIDO</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Format */}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 600, display: 'block', marginBottom: 10 }}>Formato</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {formats.map((f) => (
                      <button key={f} onClick={() => setFormat(f)} style={{
                        padding: '14px 20px', border: `2px solid ${format === f ? 'var(--black)' : 'var(--grey-200)'}`,
                        background: format === f ? 'var(--black)' : '#fff', cursor: 'pointer', borderRadius: 0,
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, textTransform: 'uppercase',
                        color: format === f ? '#fff' : 'var(--black)', letterSpacing: '-0.01em', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Level */}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 600, display: 'block', marginBottom: 10 }}>Nivel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {levels.map((l) => (
                      <button key={l} onClick={() => setLevel(l)} style={{
                        padding: '12px 16px', border: `2px solid ${level === l ? 'var(--black)' : 'var(--grey-200)'}`,
                        background: level === l ? 'var(--black)' : '#fff', cursor: 'pointer', borderRadius: 0,
                        fontSize: 13, fontWeight: 500, color: level === l ? '#fff' : 'var(--black)', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 600, display: 'block', marginBottom: 10 }}>Tamaño del Partido</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {sizes.map((s) => (
                      <button key={s} onClick={() => setSize(s)} style={{
                        padding: '12px 8px', border: `2px solid ${size === s ? 'var(--neon)' : 'var(--grey-200)'}`,
                        background: size === s ? 'var(--neon)' : '#fff', cursor: 'pointer', borderRadius: 0,
                        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--black)', textAlign: 'center',
                        transition: 'all 0.15s',
                      }}>{s.split(' ')[0]}<br /><span style={{ fontSize: 10, fontFamily: 'var(--font-body)', fontWeight: 400 }}>jugadores</span></button>
                    ))}
                  </div>
                </div>

                {/* Date + Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="field">
                    <label>Fecha y Hora</label>
                    <input type="datetime-local" style={{ borderRadius: 0 }} />
                  </div>
                  <div className="field">
                    <label>Club / Ubicación</label>
                    <input placeholder="Nombre del club" style={{ borderRadius: 0 }} />
                  </div>
                </div>

                <div style={{ background: 'var(--black)', padding: '24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em' }}>{format} · {size} · {level}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Se generará un QR para invitar jugadores</div>
                  </div>
                  <Link href="/signup" className="btn btn-primary btn-lg" style={{ borderRadius: 0, background: 'var(--neon)', color: 'var(--black)', flexShrink: 0 }}>
                    Crear →
                  </Link>
                </div>
              </div>
            </div>

            {/* Find nearby */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 8 }}>Partidos Cercanos</div>
              <h2 className="section-title" style={{ fontSize: 'clamp(32px, 3vw, 56px)', marginBottom: 40 }}>ÚNETE AHORA</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                {nearby.map((g, i) => (
                  <div key={i} style={{ background: '#fff', padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span className="chip" style={{ fontSize: 10 }}>{g.format}</span>
                        <span className="chip" style={{ fontSize: 10, background: 'var(--grey-50)' }}>{g.level}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 4 }}>Creado por {g.host} · {g.distance} · {g.time}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{g.players}<span style={{ fontSize: 16, color: 'var(--grey-400)' }}>/{g.max}</span></div>
                      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 10 }}>jugadores</div>
                      <Link href="/signup" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Unirse</Link>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '24px 28px', marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>¿No encuentras partido? Activa notificaciones para tu zona.</p>
                <Link href="/signup" className="btn btn-secondary btn-sm" style={{ borderRadius: 0, flexShrink: 0 }}>Activar Alertas</Link>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: 'var(--black)', padding: '64px 64px', color: '#fff' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 16 }}>Así de fácil</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px, 3vw, 56px)', color: '#fff', marginBottom: 48 }}>3 PASOS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.08)' }}>
              {[
                { n: '01', title: 'Elige formato', desc: 'Selecciona el tipo de partido y el nivel de juego.' },
                { n: '02', title: 'Comparte el QR', desc: 'Invita a tus amigos con un código QR único.' },
                { n: '03', title: 'A jugar', desc: 'La app gestiona marcadores, rotaciones y resultados.' },
              ].map((step) => (
                <div key={step.n} style={{ padding: '40px', background: 'var(--black)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 600, color: 'var(--neon)', lineHeight: 1, marginBottom: 16 }}>{step.n}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em', marginBottom: 8 }}>{step.title}</div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
