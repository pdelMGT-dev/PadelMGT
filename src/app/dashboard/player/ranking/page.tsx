'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlayerByEmail, getFriendsForPlayer } from '@/lib/player-store';
import { getFriendsSnapshots, saveFriendsSnapshot, getAvailableYears, getFriendsSnapshot } from '@/lib/friends-ranking-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { RegisteredPlayer } from '@/lib/player-store';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type Tab = 'global' | 'amistades' | 'historial';

function RankBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span style={{ fontSize: 20 }}>🥇</span>;
  if (pos === 2) return <span style={{ fontSize: 20 }}>🥈</span>;
  if (pos === 3) return <span style={{ fontSize: 20 }}>🥉</span>;
  return <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--grey-500)' }}>{pos}</span>;
}

export default function PlayerRankingPage() {
  const { user } = useCurrentUser();

  // Global tab state
  const [pts, setPts] = useState<number>(0);
  const [rank, setRank] = useState<number | null>(null);
  const [name, setName] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('global');

  // Friends tab state
  const [currentPlayer, setCurrentPlayer] = useState<RegisteredPlayer | null>(null);
  const [friendsList, setFriendsList] = useState<RegisteredPlayer[]>([]);
  const [friendsRanking, setFriendsRanking] = useState<RegisteredPlayer[]>([]);

  // History tab state
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth()); // 0-indexed, null = annual
  const [snapshotData, setSnapshotData] = useState<{ playerId: string; playerName: string; points: number }[] | null>(null);
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const full = user.email ? getPlayerByEmail(user.email) : null;
    setPts(full?.rankingPoints ?? user.rankingPoints ?? 0);
    setRank(full?.ranking ?? user.ranking ?? null);
    setName(full?.name ?? user.name ?? '');
    setCurrentPlayer(full);

    if (full) {
      const friends = getFriendsForPlayer(full.id);
      setFriendsList(friends);

      // Build ranking: include self + friends, sorted by rankingPoints desc
      const all = [full, ...friends];
      const sorted = [...all].sort((a, b) => b.rankingPoints - a.rankingPoints);
      setFriendsRanking(sorted);

      // History
      const years = getAvailableYears(full.id);
      if (years.length > 0) {
        setAvailableYears(years);
        setSelectedYear(years[0]);
      } else {
        setAvailableYears([]);
        setSelectedYear(new Date().getFullYear());
      }
    }
  }, [user]);

  // Update snapshot data when year/month/tab changes
  useEffect(() => {
    if (!currentPlayer || activeTab !== 'historial') return;
    const snap = getFriendsSnapshot(currentPlayer.id, selectedYear, selectedMonth);
    setSnapshotData(snap ? snap.entries.map(e => ({ playerId: e.playerId, playerName: e.playerName, points: e.points })) : null);
    setSnapshotSaved(false);
  }, [currentPlayer, selectedYear, selectedMonth, activeTab]);

  const hasData = pts > 0;

  function handleSaveSnapshot() {
    if (!currentPlayer) return;
    const entries = friendsRanking.map(p => ({
      playerId: p.id,
      playerName: p.name,
      points: p.rankingPoints,
      wins: 0,
      draws: 0,
      losses: 0,
      played: 0,
    }));
    const now = new Date();
    const snapshot = {
      id: `snap-${currentPlayer.id}-${selectedYear}-${selectedMonth ?? 'annual'}-${Date.now()}`,
      ownerId: currentPlayer.id,
      year: selectedYear,
      month: selectedMonth,
      entries,
      createdAt: now.toISOString(),
    };
    saveFriendsSnapshot(snapshot);

    // Update available years
    const years = getAvailableYears(currentPlayer.id);
    setAvailableYears(years);

    // Reload snapshot data
    const snap = getFriendsSnapshot(currentPlayer.id, selectedYear, selectedMonth);
    setSnapshotData(snap ? snap.entries.map(e => ({ playerId: e.playerId, playerName: e.playerName, points: e.points })) : null);
    setSnapshotSaved(true);
  }

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '10px 22px',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--neon, #d6ff00)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--black)' : 'var(--grey-400)',
    transition: 'color 0.15s',
    outline: 'none',
  });

  return (
    <div className="dash-page" style={{ padding: '40px 32px 80px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Posición actual</div>
        <h1 className="dash-h1" style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MI RANKING</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 32, gap: 0 }}>
        <button style={tabStyle('global')} onClick={() => setActiveTab('global')}>Global</button>
        <button style={tabStyle('amistades')} onClick={() => setActiveTab('amistades')}>Amistades</button>
        <button style={tabStyle('historial')} onClick={() => setActiveTab('historial')}>Historial</button>
      </div>

      {/* ── Tab: Global ── */}
      {activeTab === 'global' && (
        <>
          {/* Stats */}
          <div className="ranking-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
            <div className="ranking-stat-cell" style={{ background: 'var(--black)', padding: '40px 36px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 8 }}>Ranking General</div>
              <div className="ranking-big-num" style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 600, letterSpacing: '-0.05em', color: hasData ? '#fff' : 'rgba(255,255,255,0.2)', lineHeight: 0.85, marginBottom: 12 }}>
                {hasData && rank ? `#${rank}` : '—'}
              </div>
              {!hasData && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Sin torneos jugados aún</div>
              )}
            </div>
            <div className="ranking-stat-cell" style={{ background: '#fff', padding: '40px 32px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 8 }}>Puntos Totales</div>
              <div className="ranking-mid-num" style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', color: hasData ? 'var(--black)' : 'var(--grey-300)', lineHeight: 0.9, marginBottom: 12 }}>
                {pts.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
                {hasData ? 'acumulados en torneos' : 'Jugá torneos para sumar puntos'}
              </div>
            </div>
            <div className="ranking-stat-cell" style={{ background: '#fff', padding: '40px 32px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 8 }}>Jugador</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--black)', lineHeight: 1.1, marginBottom: 12 }}>
                {name || '—'}
              </div>
              <Link href="/dashboard/player/profile" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
                Ver perfil →
              </Link>
            </div>
          </div>

          {/* Empty state */}
          {!hasData && (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 12 }}>
                Aún no tenés puntos de ranking
              </div>
              <div style={{ fontSize: 14, color: 'var(--grey-400)', marginBottom: 24 }}>
                Participá en torneos para empezar a acumular puntos y aparecer en el ranking.
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/dashboard/player/quick-game" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
                  Crear Juego Rápido →
                </Link>
                <Link href="/dashboard/player/tournaments" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>
                  Ver Torneos →
                </Link>
              </div>
            </div>
          )}

          <div className="ranking-footer-bar" style={{ marginTop: 24, padding: '16px 24px', background: '#fff', border: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>Consultá la tabla de ranking global de la plataforma</div>
            <Link href="/ranking" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver ranking completo →</Link>
          </div>
        </>
      )}

      {/* ── Tab: Amistades ── */}
      {activeTab === 'amistades' && (
        <>
          {friendsList.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 12 }}>
                Sin amistades aún
              </div>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>
                Agregá amigos para ver el ranking de amistades
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px', padding: '12px 20px', borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>#</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Jugador</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', textAlign: 'right' }}>PTS</div>
              </div>
              {friendsRanking.map((player, idx) => {
                const isMe = player.id === currentPlayer?.id;
                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr 100px',
                      padding: '14px 20px',
                      borderBottom: idx < friendsRanking.length - 1 ? '1px solid var(--grey-100)' : 'none',
                      background: isMe ? 'rgba(214,255,0,0.06)' : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32 }}>
                      <RankBadge pos={idx + 1} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: 'var(--black)' }}>
                        {player.name}
                      </span>
                      {isMe && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: 'var(--black)',
                          background: 'var(--neon, #d6ff00)',
                          padding: '2px 6px',
                          borderRadius: 2,
                        }}>
                          TÚ
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)' }}>
                      {player.rankingPoints.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Historial ── */}
      {activeTab === 'historial' && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Sidebar: selectors */}
          <div style={{ width: 200, flexShrink: 0 }}>
            {/* Year selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Año</div>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--grey-200)',
                  background: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--black)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {/* Always show current year even if no snapshots */}
                {(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month selector */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Período</div>
              <div style={{ border: '1px solid var(--grey-200)', background: '#fff', overflow: 'hidden' }}>
                {/* Annual option */}
                <button
                  onClick={() => setSelectedMonth(null)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 12px',
                    fontSize: 13,
                    fontWeight: selectedMonth === null ? 700 : 500,
                    background: selectedMonth === null ? 'var(--grey-50)' : 'transparent',
                    color: 'var(--black)',
                    cursor: 'pointer',
                    border: 'none',
                    borderBottom: '1px solid var(--grey-100)',
                    outline: 'none',
                  } as React.CSSProperties}
                >
                  Anual
                </button>
                {MONTHS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedMonth(i)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      fontSize: 13,
                      fontWeight: selectedMonth === i ? 700 : 500,
                      background: selectedMonth === i ? 'var(--grey-50)' : 'transparent',
                      borderBottom: i < 11 ? '1px solid var(--grey-100)' : 'none',
                      color: 'var(--black)',
                      cursor: 'pointer',
                      border: 'none',
                      outline: 'none',
                    } as React.CSSProperties}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Save snapshot button */}
            <button
              onClick={handleSaveSnapshot}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: snapshotSaved ? 'var(--grey-200)' : 'var(--black)',
                color: snapshotSaved ? 'var(--grey-500)' : '#fff',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: snapshotSaved ? 'default' : 'pointer',
                transition: 'background 0.2s',
              }}
              disabled={snapshotSaved}
            >
              {snapshotSaved ? 'Snapshot guardado ✓' : 'Guardar snapshot actual'}
            </button>
          </div>

          {/* Main: snapshot table */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>
                {selectedMonth !== null ? MONTHS[selectedMonth] : 'Anual'} {selectedYear}
              </span>
            </div>

            {snapshotData === null ? (
              <div style={{ border: '1px dashed var(--grey-300)', padding: '40px 32px', textAlign: 'center', background: 'var(--grey-50)' }}>
                <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>
                  Sin historial para este período
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px', padding: '12px 20px', borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>#</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Jugador</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', textAlign: 'right' }}>PTS</div>
                </div>
                {snapshotData.map((entry, idx) => {
                  const isMe = entry.playerId === currentPlayer?.id;
                  return (
                    <div
                      key={entry.playerId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr 100px',
                        padding: '14px 20px',
                        borderBottom: idx < snapshotData.length - 1 ? '1px solid var(--grey-100)' : 'none',
                        background: isMe ? 'rgba(214,255,0,0.06)' : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32 }}>
                        <RankBadge pos={idx + 1} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: 'var(--black)' }}>
                          {entry.playerName}
                        </span>
                        {isMe && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: 'var(--black)',
                            background: 'var(--neon, #d6ff00)',
                            padding: '2px 6px',
                            borderRadius: 2,
                          }}>
                            TÚ
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)' }}>
                        {entry.points.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
