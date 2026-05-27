'use client';

import { useState } from 'react';

const tournaments = [
  {
    id: 't1', name: 'Liga Club Interna', format: 'Round Robin', status: 'live',
    players: 8, maxPlayers: 8, startDate: '01 May', endDate: '31 May', rounds: 8, currentRound: 4,
  },
  {
    id: 't2', name: 'Americano de Mayo', format: 'Americano', status: 'live',
    players: 12, maxPlayers: 16, startDate: '10 May', endDate: '10 May', rounds: 5, currentRound: 2,
  },
  {
    id: 't3', name: 'Open Knockout Junio', format: 'Knockout', status: 'upcoming',
    players: 6, maxPlayers: 16, startDate: '01 Jun', endDate: '01 Jun', rounds: 4, currentRound: 0,
  },
  {
    id: 't4', name: 'Mexicano Express Abril', format: 'Mexicano', status: 'completed',
    players: 12, maxPlayers: 12, startDate: '20 Abr', endDate: '20 Abr', rounds: 5, currentRound: 5,
  },
];

const brackets = {
  t1: {
    standings: [
      { pos: 1, name: 'Diego G. / Ana R.', pj: 4, pg: 3, pp: 1, pts: 9 },
      { pos: 2, name: 'Carlos V. / Sofía L.', pj: 4, pg: 3, pp: 1, pts: 9 },
      { pos: 3, name: 'Marcos H. / Laura T.', pj: 4, pg: 2, pp: 2, pts: 6 },
      { pos: 4, name: 'Pedro M. / Lucía R.', pj: 4, pg: 2, pp: 2, pts: 6 },
      { pos: 5, name: 'Juan C. / Elena V.', pj: 4, pg: 1, pp: 3, pts: 3 },
      { pos: 6, name: 'Raúl O. / Marta F.', pj: 4, pg: 0, pp: 4, pts: 0 },
    ],
    matches: [
      { court: 'Cancha 1', t1: 'Diego G. / Ana R.', t2: 'Carlos V. / Sofía L.', score: '6–4, 4–6, 7–5', status: 'completed' },
      { court: 'Cancha 2', t1: 'Marcos H. / Laura T.', t2: 'Pedro M. / Lucía R.', score: null, status: 'live' },
      { court: 'Cancha 3', t1: 'Juan C. / Elena V.', t2: 'Raúl O. / Marta F.', score: null, status: 'upcoming' },
    ],
  },
};

export default function ClubTournamentsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const selectedTournament = tournaments.find(t => t.id === selected);
  const bracket = selected ? brackets[selected as keyof typeof brackets] : null;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Club La Cantera</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>TORNEOS</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Crear Torneo</button>
      </div>

      {/* Create tournament form (mock) */}
      {showCreate && (
        <div style={{ background: 'var(--black)', padding: '32px', marginBottom: 32, position: 'relative' }}>
          <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 12 }}>Nuevo Torneo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label><input placeholder="Nombre del torneo" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field">
              <label style={{ color: 'rgba(255,255,255,0.6)' }}>Formato</label>
              <select style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                {['Americano', 'Mexicano', 'Round Robin', 'Knockout', 'Swiss'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Máx. jugadores</label><input type="number" placeholder="16" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Fecha</label><input type="date" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Nivel</label>
              <select style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                {['Todos los niveles', 'Principiante', 'Intermedio', 'Avanzado'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Premio (opcional)</label><input placeholder="$500" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
          </div>
          <button onClick={() => setShowCreate(false)} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>Crear y generar QR →</button>
        </div>
      )}

      {/* Tournament list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)', marginBottom: selected ? 32 : 0 }}>
        {tournaments.map((t) => (
          <div key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)}
            style={{ background: selected === t.id ? 'var(--black)' : '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'background 0.15s' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                {t.status === 'live' && <span className="badge badge-live">LIVE</span>}
                {t.status === 'upcoming' && <span className="badge badge-soon">Próximo</span>}
                {t.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>}
                <span className="chip" style={{ fontSize: 10, background: selected === t.id ? 'rgba(255,255,255,0.1)' : undefined, color: selected === t.id ? '#fff' : undefined, border: selected === t.id ? '1px solid rgba(255,255,255,0.15)' : undefined }}>{t.format}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: selected === t.id ? '#fff' : 'var(--black)' }}>{t.name}</div>
              <div style={{ fontSize: 12, color: selected === t.id ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', marginTop: 4 }}>
                {t.startDate}{t.startDate !== t.endDate ? ` – ${t.endDate}` : ''} · {t.players}/{t.maxPlayers} jugadores
                {t.status !== 'upcoming' && ` · Jornada ${t.currentRound}/${t.rounds}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Progress bar */}
              <div style={{ width: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <div style={{ height: 4, background: selected === t.id ? 'rgba(255,255,255,0.1)' : 'var(--grey-100)' }}>
                  <div style={{ height: '100%', background: selected === t.id ? 'var(--neon)' : 'var(--black)', width: `${(t.players / t.maxPlayers) * 100}%` }} />
                </div>
                <div style={{ fontSize: 10, color: selected === t.id ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', textAlign: 'right' }}>{t.players}/{t.maxPlayers}</div>
              </div>
              <span style={{ fontSize: 16, color: selected === t.id ? 'var(--neon)' : 'var(--grey-400)' }}>{selected === t.id ? '▲' : '▼'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bracket / standings panel */}
      {selected && bracket && selectedTournament && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ background: 'var(--black)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--neon)' }}>
              {selectedTournament.name} — Tabla
            </div>
            <button style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Ingresar resultados
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--grey-200)' }}>
            {/* Standings */}
            <div style={{ background: '#fff' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--grey-200)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Clasificación</div>
              <table className="rank-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>#</th>
                    <th>Pareja</th>
                    <th style={{ textAlign: 'center' }}>PJ</th>
                    <th style={{ textAlign: 'center' }}>PG</th>
                    <th style={{ textAlign: 'center' }}>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {bracket.standings.map((row) => (
                    <tr key={row.pos} style={{ background: row.pos <= 2 ? 'rgba(214,255,0,0.04)' : '#fff' }}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: row.pos === 1 ? '#f5a623' : row.pos === 2 ? 'var(--grey-300)' : 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: row.pos <= 2 ? '#fff' : 'var(--grey-500)' }}>{row.pos}</div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{row.pj}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{row.pg}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Current matches */}
            <div style={{ background: '#fff' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--grey-200)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Juegos — Jornada {selectedTournament.currentRound}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)', margin: '1px' }}>
                {bracket.matches.map((m, i) => (
                  <div key={i} style={{ background: m.status === 'live' ? '#111' : '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: m.status === 'live' ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{m.court}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: m.status === 'live' ? '#fff' : 'var(--black)' }}>{m.t1}</div>
                      <div style={{ fontSize: 11, color: m.status === 'live' ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', margin: '2px 0' }}>vs</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: m.status === 'live' ? '#fff' : 'var(--black)' }}>{m.t2}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {m.score && <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: m.status === 'live' ? '#fff' : 'var(--black)', marginBottom: 6 }}>{m.score}</div>}
                      {m.status === 'live' && <span className="badge badge-live">LIVE</span>}
                      {m.status === 'upcoming' && <span className="badge badge-soon">Por jugar</span>}
                      {m.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
