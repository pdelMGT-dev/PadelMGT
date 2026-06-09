'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface TeamMember { name: string; role: string; country: string; bio: string; }
interface Milestone  { year: string; event: string; }
interface Stat       { value: string; label: string; }

const DEFAULT_TEAM: TeamMember[] = [
  { name: 'Martín Rodríguez', role: 'CEO & Co-Founder', country: '🇦🇷', bio: 'Ex-jugador profesional y fanático del pádel. Fundó PadelMGT para resolver los problemas que vivió como organizador.' },
  { name: 'Valentina Cruz', role: 'CTO & Co-Founder', country: '🇨🇴', bio: 'Ingeniera de software con 10 años de experiencia en plataformas deportivas a escala.' },
  { name: 'Diego Morales', role: 'Head of Product', country: '🇲🇽', bio: 'Diseñador y estratega de producto. Obsesionado con la experiencia de usuario en deportes.' },
  { name: 'Ana Fernández', role: 'Head of Growth', country: '🇨🇱', bio: 'Especialista en crecimiento de comunidades deportivas en América Latina.' },
];

const DEFAULT_MILESTONES: Milestone[] = [
  { year: '2023', event: 'Fundación de PadelMGT en Buenos Aires con el primer torneo piloto.' },
  { year: '2024', event: 'Lanzamiento público. 1,000 jugadores registrados en el primer mes.' },
  { year: '2025', event: 'Expansión a 8 países de América Latina y España.' },
  { year: '2026', event: 'Más de 12,400 jugadores activos y 380 clubes en la plataforma.' },
];

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [stats, setStats] = useState<{ players: Stat; clubs: Stat; leagues: Stat; countries: Stat }>({
    players:   { value: '12,400+', label: 'Jugadores activos' },
    clubs:     { value: '380',     label: 'Clubes registrados' },
    leagues:   { value: '47',      label: 'Ligas activas' },
    countries: { value: '9',       label: 'Países' },
  });

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json() as Promise<{ players: Stat; clubs: Stat; leagues: Stat; countries: Stat }>)
      .then(d => setStats({
        players:   { value: d.players?.value   ?? '12,400+', label: 'Jugadores activos' },
        clubs:     { value: d.clubs?.value     ?? '380',     label: 'Clubes registrados' },
        leagues:   { value: d.leagues?.value   ?? '47',      label: 'Ligas activas' },
        countries: { value: d.countries?.value ?? '9',       label: 'Países' },
      }))
      .catch(() => {});

    fetch('/api/about-content')
      .then(r => r.json() as Promise<{ team: TeamMember[]; milestones: Milestone[] }>)
      .then(d => {
        if (d.team?.length)       setTeam(d.team);
        if (d.milestones?.length) setMilestones(d.milestones);
      })
      .catch(() => {});
  }, []);

  const statList = [stats.players, stats.clubs, stats.leagues, stats.countries];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Quiénes somos.</div>
          <h1 className="page-title">NOSOTROS</h1>
          <p className="page-sub">Construimos la plataforma de gestión de pádel más completa de América Latina.</p>
        </div>
      </div>

      {/* Mission */}
      <section style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>Nuestra Misión</div>
            <h2 className="section-title" style={{ marginBottom: 32 }}>DEMOCRATIZAR EL PÁDEL COMPETITIVO</h2>
            <p style={{ fontSize: 16, color: 'var(--grey-500)', lineHeight: 1.7, marginBottom: 24 }}>
              PadelMGT nació de la frustración de organizar torneos con hojas de Excel y grupos de WhatsApp. Queríamos una herramienta que hiciera lo que las grandes plataformas hacen para el tenis o el fútbol, pero diseñada específicamente para el pádel.
            </p>
            <p style={{ fontSize: 16, color: 'var(--grey-500)', lineHeight: 1.7 }}>
              Hoy gestionamos desde torneos sociales de 8 jugadores hasta ligas nacionales con cientos de equipos. Nuestra plataforma es la columna vertebral de más de 380 clubes en toda la región.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--grey-200)' }}>
            {statList.map((s) => (
              <div key={s.label} style={{ background: '#fff', padding: '40px 32px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ background: 'var(--black)', padding: '96px 48px', color: '#fff' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 16 }}>Historia</div>
          <h2 className="section-title" style={{ color: '#fff', marginBottom: 64 }}>DE CERO A LATAM</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(255,255,255,0.08)' }}>
            {milestones.map((m) => (
              <div key={m.year} style={{ padding: '40px 32px', background: 'var(--black)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 600, color: 'var(--neon)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 20 }}>{m.year}</div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{m.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '96px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>El Equipo</div>
          <h2 className="section-title" style={{ marginBottom: 64 }}>QUIÉNES LO HACEN POSIBLE</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
            {team.map((member) => (
              <div key={member.name} style={{ background: '#fff', padding: '40px 32px' }}>
                <div style={{ width: 64, height: 64, background: 'var(--court-blue-deep)', borderRadius: '50%', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: '#fff' }}>
                  {member.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 4 }}>{member.name} {member.country}</div>
                <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>{member.role}</div>
                <p style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.6, margin: 0 }}>{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: 'var(--grey-50)', borderTop: '1px solid var(--grey-200)', borderBottom: '1px solid var(--grey-200)', padding: '96px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>Valores</div>
          <h2 className="section-title" style={{ marginBottom: 64 }}>EN LO QUE CREEMOS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
            {[
              { title: 'Comunidad primero', desc: 'Construimos para los jugadores y clubes, no para los inversores. Cada decisión empieza con la pregunta: ¿esto ayuda a nuestra comunidad?' },
              { title: 'Simple, no simplificado', desc: 'El pádel es complejo. Nuestra plataforma también puede serlo. Pero la experiencia de uso debe ser siempre simple.' },
              { title: 'Transparencia total', desc: 'Precios claros, sin sorpresas. Datos que son tuyos. Soporte que responde de verdad.' },
            ].map((v) => (
              <div key={v.title} style={{ background: '#fff', padding: '48px 40px' }}>
                <div style={{ width: 4, height: 40, background: 'var(--neon)', marginBottom: 24 }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 16 }}>{v.title}</div>
                <p style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h2 className="section-title" style={{ color: '#fff', marginBottom: 16 }}>ÚNETE A LA COMUNIDAD</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: 0, maxWidth: 480 }}>
              Miles de jugadores y clubes ya confían en PadelMGT. Empieza gratis hoy.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            <Link href="/register" style={{ padding: '14px 32px', background: 'var(--neon)', color: 'var(--black)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Comenzar gratis
            </Link>
            <Link href="/pricing" style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Ver planes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
