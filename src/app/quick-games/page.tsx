'use client';

import Link from 'next/link';
import { useState } from 'react';

const levels = ['Todos los niveles', 'Principiante', 'Intermedio', 'Avanzado'];

const nearby = [
  { name: 'Americano Express',   host: 'Diego M.', level: 'Todos',       players: 6,  max: 8,  distance: '0.8 km', time: 'Hoy 19:00',    pairType: 'Intercambio' },
  { name: 'Juego del Barrio',    host: 'Ana R.',    level: 'Intermedio',  players: 4,  max: 8,  distance: '1.2 km', time: 'Hoy 20:30',    pairType: 'Intercambio' },
  { name: 'Rápido Avanzado',     host: 'Carlos V.', level: 'Avanzado',    players: 2,  max: 4,  distance: '2.0 km', time: 'Mañana 09:00', pairType: 'Pareja Fija' },
  { name: 'Open Mixto',          host: 'Sofía L.',  level: 'Todos',       players: 10, max: 12, distance: '2.5 km', time: 'Sábado 10:00', pairType: 'Intercambio' },
];

export default function QuickGamesPage() {
  const [level, setLevel] = useState('Todos los niveles');
  const [size, setSize] = useState(8);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Juega ahora mismo.</div>
          <h1 className="page-title">JUEGOS RÁPIDOS</h1>
          <p className="page-sub">Creá o unite a un juego en minutos. Sin burocracia, solo pádel.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 80 }}>

            {/* Create teaser */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 8 }}>Nuevo Juego</div>
              <h2 className="section-title" style={{ fontSize: 'clamp(32px, 3vw, 56px)', marginBottom: 40 }}>CREAR JUEGO</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Level */}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 600, display: 'block', marginBottom: 10 }}>Nivel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {levels.map((l) => (
                      <button key={l} onClick={() => setLevel(l)} style={{
                        padding: '12px 16px', border: `2px solid ${level === l ? 'var(--black)' : 'var(--grey-200)'}`,
                        background: level === l ? 'var(--black)' : '#fff', cursor: 'pointer',
                        fontSize: 13, fontWeight: 500, color: level === l ? '#fff' : 'var(--black)',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Players */}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 600, display: 'block', marginBottom: 10 }}>Total de Jugadores</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {[4, 6, 8, 10, 12].map((n) => (
                      <button key={n} onClick={() => setSize(n)} style={{
                        padding: '12px 8px', border: `2px solid ${size === n ? 'var(--neon)' : 'var(--grey-200)'}`,
                        background: size === n ? 'var(--neon)' : '#fff', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--black)', textAlign: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {n}
                        <div style={{ fontSize: 9, fontFamily: 'var(--font-body)', fontWeight: 400, letterSpacing: '0.08em', marginTop: 2 }}>jugadores</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)' }}>
                    {size} jugadores = {size / 2} parejas · siempre dobles
                  </div>
                </div>

                {/* CTA */}
                <div style={{ background: 'var(--black)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em' }}>
                      {size} jugadores · {level}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                      Iniciá sesión para crear el juego completo
                    </div>
                  </div>
                  <Link href="/login" className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', fontWeight: 700, flexShrink: 0, borderRadius: 0 }}>
                    Crear →
                  </Link>
                </div>
              </div>
            </div>

            {/* Find nearby */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 8 }}>Juegos Cercanos</div>
              <h2 className="section-title" style={{ fontSize: 'clamp(32px, 3vw, 56px)', marginBottom: 40 }}>ÚNETE AHORA</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                {nearby.map((g, i) => (
                  <div key={i} style={{ background: '#fff', padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="chip" style={{ fontSize: 10 }}>{g.level}</span>
                        <span className="chip" style={{ fontSize: 10, background: 'var(--grey-50)' }}>{g.pairType}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 4 }}>Por {g.host} · {g.distance} · {g.time}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>
                        {g.players}<span style={{ fontSize: 16, color: 'var(--grey-400)' }}>/{g.max}</span>
                      </div>
                      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 10 }}>jugadores</div>
                      <Link href="/login" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Unirse</Link>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '20px 28px', marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>¿No encontrás juego? Activá notificaciones para tu zona.</p>
                <Link href="/signup" className="btn btn-secondary btn-sm" style={{ borderRadius: 0, flexShrink: 0 }}>Activar Alertas</Link>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: 'var(--black)', padding: '64px', color: '#fff' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 16 }}>Así de fácil</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px, 3vw, 56px)', color: '#fff', marginBottom: 48 }}>3 PASOS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.08)' }}>
              {[
                { n: '01', title: 'Configurá el juego',   desc: 'Elegí nivel, cantidad de jugadores, tipo de pareja (fija o intercambio) y cómo se llevan los scores.' },
                { n: '02', title: 'Invitá jugadores',     desc: 'Buscá amistades o jugadores en la plataforma. Para los que no están registrados, compartí el QR.' },
                { n: '03', title: 'A jugar',              desc: 'La app gestiona los marcadores, rotaciones y resultados. Cada ronda queda registrada.' },
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
