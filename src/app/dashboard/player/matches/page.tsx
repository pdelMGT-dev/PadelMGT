'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMatchHistoryForPlayer, type MatchEntry } from '@/lib/match-history';
import { fetchGamesByCreator, fetchTournamentsByCreator } from '@/lib/supabase';
import { useCurrentUser } from '@/hooks/useCurrentUser';
type SortField = 'date' | 'pareja' | 'rivales';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

const selectStyle: React.CSSProperties = {
  padding: '7px 32px 7px 12px', fontSize: 12, fontWeight: 600,
  border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', color: 'var(--black)',
};

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span style={{ opacity: 0.3, fontSize: 9, marginLeft: 3 }}>↕</span>;
  return <span style={{ fontSize: 9, marginLeft: 3, color: 'var(--black)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function PageNav({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 2) pages.push('…');
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
    if (page < totalPages - 3) pages.push('…');
    pages.push(totalPages - 1);
  }

  const btnBase: React.CSSProperties = {
    padding: '5px 10px', fontSize: 11, fontWeight: 700, border: '1px solid var(--grey-200)',
    cursor: 'pointer', letterSpacing: '0.04em', minWidth: 32, textAlign: 'center',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 0}
        style={{ ...btnBase, background: page === 0 ? 'var(--grey-50)' : '#fff', color: page === 0 ? 'var(--grey-300)' : 'var(--grey-600)', cursor: page === 0 ? 'default' : 'pointer' }}>
        ← Ant
      </button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ padding: '5px 4px', fontSize: 11, color: 'var(--grey-400)' }}>…</span>
          : <button key={p} onClick={() => onPage(p as number)}
              style={{ ...btnBase, background: p === page ? 'var(--black)' : '#fff', color: p === page ? '#fff' : 'var(--grey-600)', borderColor: p === page ? 'var(--black)' : 'var(--grey-200)' }}>
              {(p as number) + 1}
            </button>
      )}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages - 1}
        style={{ ...btnBase, background: page === totalPages - 1 ? 'var(--grey-50)' : '#fff', color: page === totalPages - 1 ? 'var(--grey-300)' : 'var(--grey-600)', cursor: page === totalPages - 1 ? 'default' : 'pointer' }}>
        Sig →
      </button>
    </div>
  );
}

export default function PlayerMatchesPage() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const [allMatches, setAllMatches] = useState<MatchEntry[]>([]);
  const [resultado, setResultado] = useState('Todos');
  const [gameFilter, setGameFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    setAllMatches(getMatchHistoryForPlayer(currentUser.id));
  }, [currentUser]);

  // Merge match history from Supabase (games/tournaments created by the user on other devices)
  useEffect(() => {
    if (!currentUser) return;

    async function loadFromSupabase() {
      try {
        const [sbGames, sbTournaments] = await Promise.all([
          fetchGamesByCreator(currentUser!.id),
          fetchTournamentsByCreator(currentUser!.id),
        ]);

        const extraEntries: MatchEntry[] = [];
        const existingIds = new Set(getMatchHistoryForPlayer(currentUser!.id).map(m => m.id));

        // Parse games from Supabase
        for (const raw of (sbGames ?? [])) {
          try {
            const g = raw as { id: string; name: string; date: string; time?: string; players?: { id: string; name: string }[]; rounds?: { num: number; status: string; courts: { courtNum: number; pair1: string[]; pair2: string[]; pair1Score: number | null; pair2Score: number | null; status: string }[] }[] };
            const players = g.players ?? [];
            for (const round of (g.rounds ?? [])) {
              for (const court of round.courts) {
                if (court.pair1Score === null || court.pair2Score === null) continue;
                const inPair1 = court.pair1.includes(currentUser!.id);
                const inPair2 = court.pair2.includes(currentUser!.id);
                if (!inPair1 && !inPair2) continue;
                const entryId = `${g.id}-r${round.num}-c${court.courtNum}`;
                if (existingIds.has(entryId)) continue;
                const myPair = inPair1 ? court.pair1 : court.pair2;
                const theirPair = inPair1 ? court.pair2 : court.pair1;
                const myScore = inPair1 ? court.pair1Score : court.pair2Score;
                const theirScore = inPair1 ? court.pair2Score : court.pair1Score;
                const partnerIds = myPair.filter(id => id !== currentUser!.id);
                const partnerName = partnerIds.length > 0 ? (players.find(p => p.id === partnerIds[0])?.name ?? partnerIds[0]) : '—';
                const opponentNames = theirPair.map(id => players.find(p => p.id === id)?.name ?? id).join(' / ');
                const result: 'V' | 'D' | 'T' = myScore > theirScore ? 'V' : myScore < theirScore ? 'D' : 'T';
                extraEntries.push({ id: entryId, date: g.date ?? '', time: g.time, gameName: g.name ?? '', gameId: g.id, entityType: 'game', roundNum: round.num, partner: partnerName, opponents: opponentNames, userScore: myScore, opponentScore: theirScore, result, scoreLabel: `${myScore} – ${theirScore}` });
                existingIds.add(entryId);
              }
            }
          } catch { /* skip malformed */ }
        }

        // Parse tournaments from Supabase
        for (const raw of (sbTournaments ?? [])) {
          try {
            const t = raw as { id: string; name: string; date: string; time?: string; players?: { id: string; name: string }[]; rounds?: { num: number; status: string; courts: { courtNum: number; pair1: string[]; pair2: string[]; pair1Score: number | null; pair2Score: number | null; status: string }[] }[] };
            const players = t.players ?? [];
            for (const round of (t.rounds ?? [])) {
              for (const court of round.courts) {
                if (court.pair1Score === null || court.pair2Score === null) continue;
                const inPair1 = court.pair1.includes(currentUser!.id);
                const inPair2 = court.pair2.includes(currentUser!.id);
                if (!inPair1 && !inPair2) continue;
                const entryId = `${t.id}-r${round.num}-c${court.courtNum}`;
                if (existingIds.has(entryId)) continue;
                const myPair = inPair1 ? court.pair1 : court.pair2;
                const theirPair = inPair1 ? court.pair2 : court.pair1;
                const myScore = inPair1 ? court.pair1Score : court.pair2Score;
                const theirScore = inPair1 ? court.pair2Score : court.pair1Score;
                const partnerIds = myPair.filter(id => id !== currentUser!.id);
                const partnerName = partnerIds.length > 0 ? (players.find(p => p.id === partnerIds[0])?.name ?? partnerIds[0]) : '—';
                const opponentNames = theirPair.map(id => players.find(p => p.id === id)?.name ?? id).join(' / ');
                const result: 'V' | 'D' | 'T' = myScore > theirScore ? 'V' : myScore < theirScore ? 'D' : 'T';
                extraEntries.push({ id: entryId, date: t.date ?? '', time: t.time, gameName: t.name ?? '', gameId: t.id, entityType: 'tournament', roundNum: round.num, partner: partnerName, opponents: opponentNames, userScore: myScore, opponentScore: theirScore, result, scoreLabel: `${myScore} – ${theirScore}` });
                existingIds.add(entryId);
              }
            }
          } catch { /* skip malformed */ }
        }

        if (extraEntries.length > 0) {
          setAllMatches(prev => {
            const merged = [...prev, ...extraEntries];
            merged.sort((a, b) => {
              const dateCmp = b.date.localeCompare(a.date);
              if (dateCmp !== 0) return dateCmp;
              return b.roundNum - a.roundNum;
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn('[matches] Supabase load failed:', err);
      }
    }

    loadFromSupabase();
  }, [currentUser]);

  const gameNames = ['Todos', ...Array.from(new Set(allMatches.map(m => m.gameName)))];

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
    setPage(0);
  }

  function resetFilters() {
    setResultado('Todos');
    setGameFilter('Todos');
    setTypeFilter('Todos');
    setPage(0);
  }

  const filtered = allMatches
    .filter(m => {
      const resOk = resultado === 'Todos' || (resultado === 'Victorias' ? m.result === 'V' : resultado === 'Derrotas' ? m.result === 'D' : m.result === 'T');
      const gameOk = gameFilter === 'Todos' || m.gameName === gameFilter;
      const typeOk = typeFilter === 'Todos' || (typeFilter === 'Torneo' ? m.entityType === 'tournament' : m.entityType === 'game');
      return resOk && gameOk && typeOk;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || ''));
      } else if (sortField === 'pareja') {
        cmp = (a.partner || '').localeCompare(b.partner || '');
      } else {
        cmp = (a.opponents || '').localeCompare(b.opponents || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const wins = allMatches.filter(m => m.result === 'V').length;
  const losses = allMatches.filter(m => m.result === 'D').length;
  const ties = allMatches.filter(m => m.result === 'T').length;
  const total = allMatches.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  function getLiveUrl(m: MatchEntry): string {
    const base = m.entityType === 'tournament'
      ? '/dashboard/player/tournaments'
      : '/dashboard/player/games';
    return `${base}/${m.gameId}/live`;
  }

  const thSort = (field: SortField, children: React.ReactNode, align?: 'center') => (
    <th
      onClick={() => handleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', textAlign: align }}
    >
      {children}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </th>
  );

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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS JUEGOS</h1>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 24 }}>
        {[
          { label: 'Juegos totales', value: String(total), color: undefined },
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
        <select value={resultado} onChange={e => { setResultado(e.target.value); setPage(0); }} style={selectStyle}>
          <option>Todos</option>
          <option>Victorias</option>
          <option>Derrotas</option>
          <option>Empates</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="Todos">Todos los tipos</option>
          <option value="Torneo">Torneos</option>
          <option value="Juego">Juegos Rápidos</option>
        </select>
        <select value={gameFilter} onChange={e => { setGameFilter(e.target.value); setPage(0); }} style={selectStyle}>
          {gameNames.map(n => <option key={n}>{n}</option>)}
        </select>
        {(resultado !== 'Todos' || gameFilter !== 'Todos' || typeFilter !== 'Todos') && (
          <button onClick={resetFilters}
            style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--grey-200)', background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Limpiar ×
          </button>
        )}
      </div>

      {/* Table */}
      {allMatches.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
          Todavía no jugaste ningún juego.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
          No hay juegos con los filtros seleccionados.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>
              {filtered.length > PAGE_SIZE
                ? `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length} juegos`
                : `${filtered.length} juego${filtered.length !== 1 ? 's' : ''}`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>Click en una fila para ver el juego</div>
          </div>

          <div style={{ border: '1px solid var(--grey-200)' }}>
            <table className="rank-table">
              <thead>
                <tr>
                  {thSort('date', 'Fecha')}
                  <th>Juego / Torneo</th>
                  <th>Ronda</th>
                  {thSort('pareja', 'Mi pareja')}
                  {thSort('rivales', 'Rivales')}
                  <th style={{ textAlign: 'center' }}>Score</th>
                  <th style={{ textAlign: 'center' }}>Res.</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => (
                  <tr key={m.id} onClick={() => router.push(getLiveUrl(m))}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--grey-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
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

          <PageNav page={safePage} totalPages={totalPages} onPage={p => setPage(p)} />
        </>
      )}
    </div>
  );
}
