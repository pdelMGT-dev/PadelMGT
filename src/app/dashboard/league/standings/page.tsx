'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLeague } from '@/hooks/useLeague';
import { saveMatch, createMatch, type LeagueMatch } from '@/lib/league-match-store';

function MatchRow({
  match,
  homeTeam,
  awayTeam,
  onSave,
}: {
  match: LeagueMatch;
  homeTeam: string;
  awayTeam: string;
  onSave: (updated: LeagueMatch) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hs, setHs] = useState(String(match.homeScore ?? ''));
  const [as_, setAs] = useState(String(match.awayScore ?? ''));

  function handleSave() {
    const updated: LeagueMatch = {
      ...match,
      homeScore: hs !== '' ? parseInt(hs) : null,
      awayScore: as_ !== '' ? parseInt(as_) : null,
      status: hs !== '' && as_ !== '' ? 'played' : 'scheduled',
    };
    saveMatch(updated);
    onSave(updated);
    setEditing(false);
  }

  return (
    <div style={{ background: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 28, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.08em' }}>J{match.round}</div>
      <div style={{ flex: 1, fontWeight: 600, fontSize: 13, textAlign: 'right' }}>{homeTeam}</div>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input value={hs} onChange={e => setHs(e.target.value)} type="number" min={0} style={{ width: 48, textAlign: 'center', padding: '4px 6px', border: '1px solid var(--grey-200)', fontSize: 14, fontFamily: 'var(--font-display)' }} />
          <span style={{ fontWeight: 700, color: 'var(--grey-400)' }}>-</span>
          <input value={as_} onChange={e => setAs(e.target.value)} type="number" min={0} style={{ width: 48, textAlign: 'center', padding: '4px 6px', border: '1px solid var(--grey-200)', fontSize: 14, fontFamily: 'var(--font-display)' }} />
          <button onClick={handleSave} style={{ padding: '4px 10px', background: 'var(--black)', color: 'var(--neon)', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
          <button onClick={() => setEditing(false)} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--grey-200)', fontSize: 11, cursor: 'pointer', color: 'var(--grey-400)' }}>×</button>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', border: '1px solid var(--grey-200)', minWidth: 80, justifyContent: 'center' }}
          title="Click para cargar resultado"
        >
          {match.status === 'played' ? (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{match.homeScore} – {match.awayScore}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--grey-400)', letterSpacing: '0.06em' }}>vs</span>
          )}
        </div>
      )}
      <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{awayTeam}</div>
      <div style={{ width: 72, fontSize: 11, color: match.status === 'played' ? 'var(--turf-green)' : 'var(--grey-300)', fontWeight: 600, textAlign: 'right' }}>
        {match.status === 'played' ? '✓ Jugado' : match.venue || '—'}
      </div>
    </div>
  );
}

function AddMatchForm({
  leagueId,
  season,
  round,
  teams,
  onAdded,
}: {
  leagueId: string;
  season: string;
  round: number;
  teams: { id: string; name: string }[];
  onAdded: () => void;
}) {
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');

  function handleAdd() {
    if (!homeId || !awayId || homeId === awayId) return;
    createMatch({ leagueId, season, round, homeTeamId: homeId, awayTeamId: awayId, homeScore: null, awayScore: null, date, venue, status: 'scheduled' });
    setHomeId(''); setAwayId(''); setDate(''); setVenue('');
    onAdded();
  }

  return (
    <div style={{ background: 'var(--black)', padding: '20px 24px', marginTop: 8 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 14 }}>Agregar partido — J{round}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.5)' }}>Local</label>
          <select value={homeId} onChange={e => setHomeId(e.target.value)} style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            <option value="">Equipo local</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.5)' }}>Visitante</label>
          <select value={awayId} onChange={e => setAwayId(e.target.value)} style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            <option value="">Equipo visitante</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.5)' }}>Fecha y hora</label>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.5)' }}>Cancha</label>
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Cancha Central" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <button onClick={handleAdd} disabled={!homeId || !awayId || homeId === awayId} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>
          Agregar
        </button>
      </div>
    </div>
  );
}

export default function LeagueStandingsPage() {
  const { league, teams, activeSeason, matches, standings, refresh } = useLeague();
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [addRound, setAddRound] = useState(1);

  if (!league || !activeSeason) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
        <div style={{ marginBottom: 16 }}>Primero configurá tu liga.</div>
        <Link href="/dashboard/league" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Ir al panel →</Link>
      </div>
    );
  }

  const total = standings.length;
  const teamMap = new Map(teams.map(t => [t.id, t]));

  // Group matches by round
  const roundNumbers = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
          {league.name} · {activeSeason.year}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>TABLA DE POSICIONES</h1>
      </div>

      {standings.length === 0 ? (
        <div style={{ padding: '40px', border: '1px solid var(--grey-200)', textAlign: 'center', marginBottom: 32 }}>
          <p style={{ color: 'var(--grey-400)', fontSize: 14, marginBottom: 16 }}>Sin equipos ni resultados aún.</p>
          <Link href="/dashboard/league/teams" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Agregar equipos</Link>
        </div>
      ) : (
        <>
          {/* Zone legend */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            {[
              { color: 'rgba(30,170,82,0.15)', label: `Zona de ascenso (Top ${league.promotionZone})` },
              { color: 'rgba(238,0,5,0.08)', label: `Zona de descenso (Últimos ${league.relegationZone})` },
            ].map((z) => (
              <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, background: z.color, border: '1px solid rgba(0,0,0,0.08)' }} />
                <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{z.label}</span>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid var(--grey-200)', marginBottom: 24 }}>
            <table className="rank-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24, width: 80 }}>Pos.</th>
                  <th>Equipo</th>
                  <th>Sede</th>
                  <th style={{ textAlign: 'center' }}>PJ</th>
                  <th style={{ textAlign: 'center' }}>PG</th>
                  <th style={{ textAlign: 'center' }}>PP</th>
                  <th style={{ textAlign: 'center' }}>GF</th>
                  <th style={{ textAlign: 'center' }}>GC</th>
                  <th style={{ textAlign: 'center' }}>DIF</th>
                  <th style={{ textAlign: 'right', paddingRight: 32 }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const pos = i + 1;
                  const isPromotion = pos <= league.promotionZone;
                  const isRelegation = pos > total - league.relegationZone;
                  return (
                    <tr key={row.teamId} style={{ background: isPromotion ? 'rgba(30,170,82,0.06)' : isRelegation ? 'rgba(238,0,5,0.04)' : '#fff' }}>
                      <td style={{ paddingLeft: 24 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: isPromotion ? 'var(--turf-green)' : isRelegation ? '#ee0005' : 'var(--grey-400)' }}>{pos}</span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 14 }}>{row.teamName}</td>
                      <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{row.club}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{row.pj}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--turf-green)', fontWeight: 600 }}>{row.pg}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, color: '#ee0005', fontWeight: 600 }}>{row.pp}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{row.gf}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{row.gc}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: row.dif > 0 ? 'var(--turf-green)' : row.dif < 0 ? '#ee0005' : 'var(--grey-400)' }}>
                        {row.dif > 0 ? `+${row.dif}` : row.dif}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 32, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{row.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--grey-200)', marginBottom: 40 }}>
            <div style={{ background: 'rgba(30,170,82,0.06)', padding: '20px 24px', borderLeft: '4px solid var(--turf-green)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', color: 'var(--turf-green)', marginBottom: 4 }}>Ascenso</div>
              <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>Los {league.promotionZone} primeros equipos ascienden a la División Premier.</p>
            </div>
            <div style={{ background: 'rgba(238,0,5,0.04)', padding: '20px 24px', borderLeft: '4px solid #ee0005' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', color: '#ee0005', marginBottom: 4 }}>Descenso</div>
              <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>Los {league.relegationZone} últimos equipos descienden a la División B.</p>
            </div>
          </div>
        </>
      )}

      {/* Matches by round */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Partidos</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={addRound}
              onChange={e => setAddRound(parseInt(e.target.value))}
              style={{ padding: '6px 10px', border: '1px solid var(--grey-200)', fontSize: 12 }}
            >
              {Array.from({ length: activeSeason.rounds }, (_, i) => i + 1).map(r => (
                <option key={r} value={r}>Jornada {r}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddMatch(!showAddMatch)}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 0 }}
            >
              {showAddMatch ? 'Cancelar' : '+ Partido'}
            </button>
          </div>
        </div>

        {showAddMatch && (
          <AddMatchForm
            leagueId={league.id}
            season={activeSeason.year}
            round={addRound}
            teams={teams}
            onAdded={() => { setShowAddMatch(false); refresh(); }}
          />
        )}

        {roundNumbers.length === 0 ? (
          <div style={{ padding: '24px', border: '1px solid var(--grey-200)', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
            Usá el botón "+ Partido" para cargar los partidos de cada jornada.
          </div>
        ) : (
          roundNumbers.map(round => {
            const roundMatches = matches.filter(m => m.round === round);
            return (
              <div key={round} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', padding: '8px 0', borderBottom: '1px solid var(--grey-100)', marginBottom: 1 }}>
                  Jornada {round}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {roundMatches.map(m => (
                    <MatchRow
                      key={m.id}
                      match={m}
                      homeTeam={teamMap.get(m.homeTeamId)?.name ?? '—'}
                      awayTeam={teamMap.get(m.awayTeamId)?.name ?? '—'}
                      onSave={refresh}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
