const seasons = [
  { year: '2026', status: 'active', teams: 12, matches: 132, played: 48, start: '01 Feb 2026', end: '30 Jun 2026', champion: null },
  { year: '2025', status: 'completed', teams: 10, matches: 90, played: 90, start: '01 Mar 2025', end: '30 Jul 2025', champion: 'Club Madrid Central' },
  { year: '2024', status: 'completed', teams: 8, matches: 56, played: 56, start: '01 Apr 2024', end: '30 Aug 2024', champion: 'La Cantera FC' },
  { year: '2023', status: 'completed', teams: 6, matches: 30, played: 30, start: '01 May 2023', end: '30 Sep 2023', champion: 'Club Barrio Norte' },
];

export default function LeagueSeasonsPage() {
  const active = seasons.find(s => s.status === 'active')!;
  const progress = Math.round((active.played / active.matches) * 100);

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Liga Premier LATAM</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>TEMPORADAS</h1>
      </div>

      {/* Active season highlight */}
      <div style={{ background: 'var(--black)', padding: '36px 40px', marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--neon)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 8 }}>Temporada activa</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 16 }}>Temp. {active.year}</div>
            <div style={{ display: 'flex', gap: 32 }}>
              {[
                { label: 'Equipos', v: active.teams },
                { label: 'Partidos', v: `${active.played}/${active.matches}` },
                { label: 'Inicio', v: active.start },
                { label: 'Final', v: active.end },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 600, color: 'var(--neon)', lineHeight: 1, letterSpacing: '-0.04em' }}>{progress}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>Completado</div>
            <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.08)', margin: '0 auto' }}>
              <div style={{ height: '100%', background: 'var(--neon)', width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* All seasons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
        {seasons.map((s) => (
          <div key={s.year} style={{ background: s.status === 'active' ? '#fff' : 'var(--grey-50)', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: s.status === 'active' ? 'var(--black)' : 'var(--grey-300)', letterSpacing: '-0.02em', width: 80, flexShrink: 0 }}>{s.year}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--grey-500)' }}>
                <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 16 }}>{s.teams}</strong> equipos</span>
                <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 16 }}>{s.played}/{s.matches}</strong> partidos</span>
                <span>{s.start} → {s.end}</span>
              </div>
              {s.champion && (
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', marginTop: 6 }}>🏆 Campeón: {s.champion}</div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              {s.status === 'active'
                ? <span className="badge" style={{ background: 'rgba(30,170,82,0.1)', color: 'var(--turf-green)', border: 'none' }}>En curso</span>
                : <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizada</span>
              }
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Crear próxima temporada</button>
      </div>
    </div>
  );
}
