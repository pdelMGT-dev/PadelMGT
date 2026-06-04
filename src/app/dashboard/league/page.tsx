'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLeague } from '@/hooks/useLeague';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createLeague } from '@/lib/league-store';
import { createSeason } from '@/lib/league-season-store';
import PlanUsageBanner from '@/components/PlanUsageBanner';

function EmptyState({ onCreated }: { onCreated: () => void }) {
  const { user } = useCurrentUser();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [rounds, setRounds] = useState('18');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    if (!user || !name.trim() || !city.trim()) return;
    setSaving(true);
    const league = createLeague({
      ownerId: user.id,
      name: name.trim(),
      city: city.trim(),
      country: country.trim() || 'Argentina',
      category: 'mixto',
      promotionZone: 2,
      relegationZone: 2,
    });
    const year = new Date().getFullYear().toString();
    createSeason({
      leagueId: league.id,
      year,
      status: 'active',
      rounds: parseInt(rounds) || 18,
      startDate: startDate || `${year}-01-01`,
      endDate: endDate || `${year}-12-31`,
      champion: null,
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div style={{ padding: '80px 40px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 8 }}>
        CREAR LIGA
      </div>
      <p style={{ color: 'var(--grey-500)', fontSize: 14, marginBottom: 40 }}>
        Configurá tu liga para empezar a gestionar equipos, jornadas y tabla de posiciones.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
        <div className="field">
          <label>Nombre de la liga</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Liga Premier LATAM" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field"><label>Ciudad</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="Buenos Aires" /></div>
          <div className="field"><label>País</label><input value={country} onChange={e => setCountry(e.target.value)} placeholder="Argentina" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="field"><label>Jornadas</label><input type="number" value={rounds} onChange={e => setRounds(e.target.value)} min={1} /></div>
          <div className="field"><label>Inicio</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="field"><label>Fin</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || !city.trim() || saving}
          className="btn btn-primary"
          style={{ borderRadius: 0, marginTop: 8 }}
        >
          {saving ? 'Creando...' : 'Crear Liga'}
        </button>
      </div>
    </div>
  );
}

export default function LeagueDashboardPage() {
  const { league, teams, activeSeason, matches, standings, ready, refresh } = useLeague();

  if (!ready) {
    return <div style={{ padding: '80px 40px', color: 'var(--grey-400)', fontSize: 14 }}>Cargando...</div>;
  }

  if (!league || !activeSeason) {
    return <EmptyState onCreated={refresh} />;
  }

  const playedMatches = matches.filter(m => m.status === 'played').length;
  const totalMatches = matches.length;
  const rounds = activeSeason.rounds;
  const playedRounds = matches.length > 0
    ? Math.max(...matches.filter(m => m.status === 'played').map(m => m.round), 0)
    : 0;
  const progress = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;

  const top5 = standings.slice(0, 5);
  const nextMatches = matches
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const leader = standings[0];
  const second = standings[1];
  const leaderDelta = leader && second ? leader.pts - second.pts : 0;

  const teamMap = new Map(teams.map(t => [t.id, t]));

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <PlanUsageBanner role="league_organizer" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Panel de Liga</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
            LIGA<br /><span style={{ color: 'var(--turf-green)' }}>{league.name}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/league/seasons" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Gestionar Temporada</Link>
          <Link href="/dashboard/league/teams" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Agregar Equipo</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Equipos', value: String(teams.length), delta: `Temporada ${activeSeason.year}` },
          { label: 'Juegos jug.', value: String(playedMatches), delta: `de ${totalMatches} totales` },
          { label: 'Jornada actual', value: String(playedRounds), delta: `de ${rounds} jornadas` },
          {
            label: 'Líder',
            value: leader ? leader.teamName.split(' ')[0] : '—',
            delta: leader && second ? `+${leaderDelta} pts sobre #2` : 'Sin partidos aún',
          },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '28px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Season progress */}
      <div style={{ background: 'var(--black)', padding: '24px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 6 }}>Progreso Temporada {activeSeason.year}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff' }}>
            {playedRounds > 0 ? `Jornada ${playedRounds} de ${rounds}` : `${rounds} jornadas programadas`}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{activeSeason.startDate}</span>
            <span style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 600 }}>{progress}% completado</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{activeSeason.endDate}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', background: 'var(--neon)', width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Top 5 standings */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Top 5 — Clasificación</div>
            <Link href="/dashboard/league/standings" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver completa →</Link>
          </div>
          {top5.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              Sin resultados aún.{' '}
              <Link href="/dashboard/league/teams" style={{ color: 'var(--black)', fontWeight: 600 }}>Agregá equipos</Link>
              {' '}y cargá partidos.
            </div>
          ) : (
            <table className="rank-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>#</th>
                  <th>Equipo</th>
                  <th style={{ textAlign: 'center' }}>PG</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((row, i) => (
                  <tr key={row.teamId} style={{ background: i < 2 ? 'rgba(30,170,82,0.04)' : '#fff' }}>
                    <td style={{ paddingLeft: 24, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: i < 2 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{row.teamName}</td>
                    <td style={{ textAlign: 'center', fontSize: 13 }}>{row.pg}</td>
                    <td style={{ textAlign: 'right', paddingRight: 24, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Next matches */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
            Próximos partidos
          </div>
          {nextMatches.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              Sin partidos programados.{' '}
              <Link href="/dashboard/league/standings" style={{ color: 'var(--black)', fontWeight: 600 }}>Cargar jornada</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {nextMatches.map((m) => {
                const home = teamMap.get(m.homeTeamId);
                const away = teamMap.get(m.awayTeamId);
                return (
                  <div key={m.id} style={{ background: '#fff', padding: '16px 24px' }}>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                      J{m.round} · {m.date.replace('T', ' ').slice(0, 16)} · {m.venue}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 14, textAlign: 'right' }}>{home?.name ?? '—'}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--grey-300)', fontWeight: 600 }}>VS</div>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{away?.name ?? '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
