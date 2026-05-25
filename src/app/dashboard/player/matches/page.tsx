'use client';

import { useEffect, useState } from 'react';
import { getMatchHistoryForPlayer, type MatchEntry } from '@/lib/match-history';

type CurrentUser = { id: string; name: string };

const selectStyle: React.CSSProperties = {
  padding: '7px 32px 7px 12px', fontSize: 12, fontWeight: 600,
  border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', color: 'var(--black)',
};

export default function PlayerMatchesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allMatches, setAllMatches] = useState<MatchEntry[]>([]);
  const [resultado, setResultado] = useState('Todos');
  const [gameFilter, setGameFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const u = JSON.parse(raw) as CurrentUser;
        setCurrentUser(u);
        setAllMatches(getMatchHistoryForPlayer(u.id));
      }
    } catch {}
  }, []);

  const gameNames = ['Todos', ...Array.from(new Set(allMatches.map(m => m.gameName)))];

  const filtered = allMatches.filter(m => {
    const resOk = resultado === 'Todos' || (resultado === 'Victorias' ? m.result === 'V' : resultado === 'Derrotas' ? m.result === 'D' : m.result === 'T');
    const gameOk = gameFilter === 'Todos' || m.gameName === gameFilter;
    const typeOk = typeFilter === 'Todos' || (typeFilter === 'Torneo' ? m.entityType === 'tournament' : m.entityType === 'game');
    return resOk && gameOk && typeOk;
  });

  const wins = allMatches.filter(m => m.result === 'V').length;
  const losses = allMatches.filter(m => m.result === 'D').length;
  const ties = allMatches.filter(m => m.result === 'T').length;
  const total = allMatches.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  if (!currentUser) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)' }}>
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Historial completo</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS PARTIDOS</h1>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 24 }}>
        {[
          { label: 'Partidos totales', value: String(total), color: undefined },
          { label: 'Victorias', value: String(wins), color: 'var(--turf-green)' },
          { label: 'Derrotas', value: String(losses), color: '#ee0005' },
          { label: '% Victorias', value: `${winRate}%`, color: undefined },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      {total > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--turf-green)' }}>Victorias {wins}</span>
            {ties > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#f5a623' }}>Empates {ties}</span>}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ee0005' }}>Derrotas {losses}</span>
          </div>
          <div style={{ height: 8, background: 'var(--grey-100)', position: 'relative', display: 'flex' }}>
            <div style={{ height: '100%', width: `${(wins / total) * 100}%`, background: 'var(--turf-green)' }} />
            <div style={{ height: '100%', width: `${(ties / total) * 100}%`, background: '#f5a623' }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={resultado} onChange={e => setResultado(e.target.value)} style={selectStyle}>
          <option>Todos</option>
          <option>Victorias</option>
          <option>Derrotas</option>
          <option>Empates</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="Todos">Todos los tipos</option>
          <option value="Torneo">Torneos</option>
          <option value="Juego">Juegos Rápidos</option>
        </select>
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)} style={selectStyle}>
          {gameNames.map(n => <option key={n}>{n}</option>)}
        </select>
        {(resultado !== 'Todos' || gameFilter !== 'Todos' || typeFilter !== 'Todos') && (
          <button onClick={() => { setResultado('Todos'); setGameFilter('Todos'); setTypeFilter('Todos'); }}
            style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--grey-200)', background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Limpiar ×
          </button>
        )}
      </div>

      {/* Table */}
      {allMatches.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
          Todavía no jugaste ningún partido.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
          No hay partidos con los filtros seleccionados.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--grey-200)' }}>
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Fecha</th>
                <th>Juego / Torneo</th>
                <th>Ronda</th>
                <th>Mi pareja</th>
                <th>Rivales</th>
                <th style={{ textAlign: 'center' }}>Score</th>
                <th style={{ textAlign: 'center' }}>Res.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ paddingLeft: 24, fontSize: 12, color: 'var(--grey-400)', whiteSpace: 'nowrap' }}>{m.date}</td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>
                    <div>{m.gameName}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>
                      {m.entityType === 'tournament' ? 'Torneo' : 'Juego Rápido'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--grey-400)' }}>R{m.roundNum}</td>
                  <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{m.partner}</td>
                  <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{m.opponents}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{m.scoreLabel}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: '50%', background: m.result === 'V' ? 'var(--turf-green)' : m.result === 'T' ? '#f5a623' : '#ee0005', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>
                      {m.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
