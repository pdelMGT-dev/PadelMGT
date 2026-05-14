'use client';

import Link from 'next/link';
import { useState } from 'react';

const matches = [
  { id: '1', date: '11 May', tournament: 'Americano Barrio Norte', round: 'R4', partner: 'Ana R.', opp1: 'Carlos V.', opp2: 'Sofía L.', sets: [{ a: 24, b: 18 }], result: 'V' as const, pts: '+15' },
  { id: '2', date: '11 May', tournament: 'Americano Barrio Norte', round: 'R3', partner: 'Ana R.', opp1: 'Diego F.', opp2: 'Laura T.', sets: [{ a: 21, b: 19 }], result: 'V' as const, pts: '+12' },
  { id: '3', date: '11 May', tournament: 'Americano Barrio Norte', round: 'R2', partner: 'Marcos H.', opp1: 'Pedro M.', opp2: 'Lucía R.', sets: [{ a: 17, b: 23 }], result: 'D' as const, pts: '+0' },
  { id: '4', date: '08 May', tournament: 'Liga Premier LATAM', round: 'J8', partner: 'Ana R.', opp1: 'Pedro M.', opp2: 'Laura T.', sets: [{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 5, b: 7 }], result: 'D' as const, pts: '+0' },
  { id: '5', date: '04 May', tournament: 'Open Knockout Mayo', round: 'Final', partner: 'Marcos H.', opp1: 'Diego F.', opp2: 'Isabel B.', sets: [{ a: 6, b: 3 }, { a: 6, b: 4 }], result: 'V' as const, pts: '+40' },
  { id: '6', date: '04 May', tournament: 'Open Knockout Mayo', round: 'SF', partner: 'Marcos H.', opp1: 'Juan C.', opp2: 'Elena V.', sets: [{ a: 7, b: 5 }, { a: 6, b: 3 }], result: 'V' as const, pts: '+20' },
  { id: '7', date: '04 May', tournament: 'Open Knockout Mayo', round: 'QF', partner: 'Marcos H.', opp1: 'Raúl O.', opp2: 'Marta F.', sets: [{ a: 6, b: 2 }, { a: 6, b: 1 }], result: 'V' as const, pts: '+10' },
  { id: '8', date: '27 Apr', tournament: 'Mexicano Express', round: 'R5', partner: 'Carlos V.', opp1: 'Ana R.', opp2: 'Sofía L.', sets: [{ a: 20, b: 16 }], result: 'V' as const, pts: '+10' },
];

const tournaments = ['Todos los torneos', 'Americano Barrio Norte', 'Liga Premier LATAM', 'Open Knockout Mayo', 'Mexicano Express'];
const months = ['Todos los meses', 'Mayo 2026', 'Abril 2026'];

const selectStyle: React.CSSProperties = {
  padding: '7px 32px 7px 12px',
  fontSize: 12, fontWeight: 600, border: '1px solid var(--grey-200)',
  background: '#fff', cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  color: 'var(--black)',
};

export default function PlayerMatchesPage() {
  const [resultado, setResultado] = useState('Todos');
  const [torneo, setTorneo] = useState('Todos los torneos');
  const [mes, setMes] = useState('Todos los meses');

  const filtered = matches.filter((m) => {
    const resOk = resultado === 'Todos' || (resultado === 'Victorias' ? m.result === 'V' : m.result === 'D');
    const torneoOk = torneo === 'Todos los torneos' || m.tournament === torneo;
    const mesOk = mes === 'Todos los meses'
      || (mes === 'Mayo 2026' && m.date.includes('May'))
      || (mes === 'Abril 2026' && m.date.includes('Apr'));
    return resOk && torneoOk && mesOk;
  });

  const wins = matches.filter(m => m.result === 'V').length;
  const losses = matches.filter(m => m.result === 'D').length;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Historial completo</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS PARTIDOS</h1>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Partidos totales', value: String(matches.length) },
          { label: 'Victorias', value: String(wins), color: 'var(--turf-green)' },
          { label: 'Derrotas', value: String(losses), color: '#ee0005' },
          { label: '% Victorias', value: `${Math.round((wins / matches.length) * 100)}%` },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--turf-green)' }}>Victorias {wins}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ee0005' }}>Derrotas {losses}</span>
        </div>
        <div style={{ height: 8, background: 'var(--grey-100)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(wins / matches.length) * 100}%`, background: 'var(--turf-green)' }} />
        </div>
      </div>

      {/* Dropdown filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={resultado} onChange={e => setResultado(e.target.value)} style={selectStyle}>
          <option>Todos</option>
          <option>Victorias</option>
          <option>Derrotas</option>
        </select>
        <select value={torneo} onChange={e => setTorneo(e.target.value)} style={selectStyle}>
          {tournaments.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(e.target.value)} style={selectStyle}>
          {months.map(m => <option key={m}>{m}</option>)}
        </select>
        {(resultado !== 'Todos' || torneo !== 'Todos los torneos' || mes !== 'Todos los meses') && (
          <button onClick={() => { setResultado('Todos'); setTorneo('Todos los torneos'); setMes('Todos los meses'); }}
            style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--grey-200)', background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Limpiar ×
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Fecha</th>
              <th>Torneo</th>
              <th>Ronda</th>
              <th>Mi pareja</th>
              <th>Rivales</th>
              <th style={{ textAlign: 'center' }}>Sets</th>
              <th style={{ textAlign: 'center' }}>Res.</th>
              <th style={{ textAlign: 'right', paddingRight: 24 }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => { window.location.href = `/dashboard/player/matches/${m.id}`; }}>
                <td style={{ paddingLeft: 24, fontSize: 12, color: 'var(--grey-400)', whiteSpace: 'nowrap' }}>{m.date}</td>
                <td style={{ fontSize: 13, fontWeight: 500, maxWidth: 180 }}>
                  <Link href={`/dashboard/player/matches/${m.id}`} style={{ color: 'inherit', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                    {m.tournament}
                  </Link>
                </td>
                <td><span className="chip" style={{ fontSize: 10 }}>{m.round}</span></td>
                <td style={{ fontSize: 13 }}>{m.partner}</td>
                <td style={{ fontSize: 12, color: 'var(--grey-500)' }}>{m.opp1} / {m.opp2}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>
                    {m.sets.map((s, j) => (
                      <span key={j} style={{ color: s.a > s.b ? 'var(--black)' : 'var(--grey-400)' }}>{s.a}–{s.b}</span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: m.result === 'V' ? 'var(--turf-green)' : '#ee0005', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>
                    {m.result}
                  </span>
                </td>
                <td style={{ textAlign: 'right', paddingRight: 24, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: m.pts !== '+0' ? 'var(--turf-green)' : 'var(--grey-300)' }}>{m.pts}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--grey-400)', fontSize: 13 }}>
                  No hay partidos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
