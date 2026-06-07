'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getPlayerLeague,
  getLeagueSeasons,
  getLeagueSeason,
  getActiveSeason,
  getLeagueMembers,
  isLeagueAdmin,
  addLeagueMember,
  removeLeagueMember,
  updateMemberRole,
  createLeagueSeason,
  saveLeagueSeason,
  computeLeagueStandings,
  deletePlayerLeague,
  type PlayerLeague,
  type LeagueSeason,
  type LeagueMember,
  type LeagueStandingEntry,
} from '@/lib/player-league-store';
import { getAllGames } from '@/lib/game-store';
import { searchPlayers } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';

type Tab = 'ranking' | 'members' | 'seasons';

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};

function RankMedal({ pos }: { pos: number }) {
  if (pos === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (pos === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (pos === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
  return <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--grey-400)', minWidth: 22, textAlign: 'center', display: 'inline-block' }}>{pos}</span>;
}

function inMonths(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useCurrentUser();

  const [league, setLeague]   = useState<PlayerLeague | null>(null);
  const [tab, setTab]         = useState<Tab>('ranking');
  const [amAdmin, setAmAdmin] = useState(false);

  // Ranking
  const [seasons, setSeasons]         = useState<LeagueSeason[]>([]);
  const [selectedSid, setSelectedSid] = useState<string | null>(null);
  const [standings, setStandings]     = useState<LeagueStandingEntry[]>([]);

  // Members
  const [members, setMembers]     = useState<LeagueMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<RegisteredPlayer[]>([]);
  const [memberMsg, setMemberMsg] = useState('');

  // Seasons
  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [snName, setSnName]   = useState('');
  const [snStart, setSnStart] = useState(new Date().toISOString().slice(0, 10));
  const [snEnd, setSnEnd]     = useState(inMonths(3));
  const [snWin, setSnWin]     = useState(3);
  const [snDraw, setSnDraw]   = useState(1);
  const [snLoss, setSnLoss]   = useState(0);

  const reload = useCallback(() => {
    if (!user || !id) return;
    const l = getPlayerLeague(id);
    if (!l) { router.push('/dashboard/player/leagues'); return; }
    setLeague(l);
    setAmAdmin(isLeagueAdmin(id, user.id));
    const ss = getLeagueSeasons(id);
    setSeasons(ss);
    const active = getActiveSeason(id);
    const sid = selectedSid ?? (active?.id ?? ss[ss.length - 1]?.id ?? null);
    setSelectedSid(sid);
    setMembers(getLeagueMembers(id));
    const games = getAllGames();
    setStandings(computeLeagueStandings(id, sid, games));
  }, [id, user, selectedSid, router]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (memberSearch.trim().length >= 2) {
      setMemberResults(searchPlayers(memberSearch).slice(0, 8));
    } else {
      setMemberResults([]);
    }
  }, [memberSearch]);

  useEffect(() => {
    if (!id || !selectedSid) return;
    const games = getAllGames();
    setStandings(computeLeagueStandings(id, selectedSid, games));
  }, [id, selectedSid]);

  function handleAddMember(player: RegisteredPlayer) {
    if (!id) return;
    addLeagueMember({ leagueId: id, playerId: player.id, playerName: player.name });
    setMemberSearch('');
    setMemberResults([]);
    setMemberMsg(`${player.name} agregado a la liga.`);
    reload();
    setTimeout(() => setMemberMsg(''), 3000);
  }

  function handleRemoveMember(playerId: string, playerName: string) {
    if (!id) return;
    removeLeagueMember(id, playerId);
    reload();
    setMemberMsg(`${playerName} eliminado de la liga.`);
    setTimeout(() => setMemberMsg(''), 3000);
  }

  function handleToggleRole(member: LeagueMember) {
    if (!id) return;
    updateMemberRole(id, member.playerId, member.role === 'admin' ? 'member' : 'admin');
    reload();
  }

  function handleCreateSeason() {
    if (!id || !snName.trim()) return;
    createLeagueSeason({ leagueId: id, name: snName.trim(), startDate: snStart, endDate: snEnd, pointsWin: snWin, pointsDraw: snDraw, pointsLoss: snLoss });
    setNewSeasonOpen(false);
    setSnName(''); setSnStart(new Date().toISOString().slice(0, 10)); setSnEnd(inMonths(3));
    setSnWin(3); setSnDraw(1); setSnLoss(0);
    reload();
  }

  function handleSetSeasonStatus(season: LeagueSeason, status: LeagueSeason['status']) {
    saveLeagueSeason({ ...season, status });
    reload();
  }

  function handleDeleteLeague() {
    if (!id) return;
    if (!confirm(`¿Eliminar la liga "${league?.name}"? Esta acción no se puede deshacer.`)) return;
    deletePlayerLeague(id);
    router.push('/dashboard/player/leagues');
  }

  if (!league) return <div style={{ padding: 40 }}>Cargando...</div>;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '10px 22px', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
    cursor: 'pointer', border: 'none', background: 'none',
    borderBottom: tab === t ? '2px solid var(--neon, #d6ff00)' : '2px solid transparent',
    color: tab === t ? 'var(--black)' : 'var(--grey-400)',
    transition: 'color 0.15s', outline: 'none',
  });

  const activeSeason = getActiveSeason(id);
  const selectedSeasonObj = selectedSid ? getLeagueSeason(selectedSid) : null;

  return (
    <div style={{ padding: '40px 32px 80px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/dashboard/player/leagues" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.06em' }}>
          ← Mis Ligas
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                {league.name}
              </h1>
              {amAdmin && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px' }}>
                  Admin
                </span>
              )}
            </div>
            {league.description && (
              <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>{league.description}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
              {members.length} miembro{members.length !== 1 ? 's' : ''}
            </span>
            {amAdmin && (
              <button
                onClick={handleDeleteLeague}
                style={{ padding: '7px 14px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 32 }}>
        <button style={tabStyle('ranking')} onClick={() => setTab('ranking')}>Ranking</button>
        <button style={tabStyle('members')} onClick={() => setTab('members')}>Miembros</button>
        <button style={tabStyle('seasons')} onClick={() => setTab('seasons')}>Temporadas</button>
      </div>

      {/* ── Ranking tab ── */}
      {tab === 'ranking' && (
        <>
          {/* Season selector */}
          {seasons.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <label style={{ ...lbl, margin: 0 }}>Temporada:</label>
              <select
                value={selectedSid ?? ''}
                onChange={e => setSelectedSid(e.target.value || null)}
                style={{ ...inp, width: 'auto', minWidth: 200 }}
              >
                <option value="">Todos los juegos</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startDate} – {s.endDate})</option>
                ))}
              </select>
            </div>
          )}

          {/* Points legend */}
          {selectedSeasonObj && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Victoria', pts: selectedSeasonObj.pointsWin,  color: '#16a34a' },
                { label: 'Empate',   pts: selectedSeasonObj.pointsDraw, color: '#ca8a04' },
                { label: 'Derrota',  pts: selectedSeasonObj.pointsLoss, color: '#dc2626' },
              ].map(({ label, pts, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: `${color}10`, border: `1px solid ${color}30` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{pts > 0 ? '+' : ''}{pts}</span>
                  <span style={{ fontSize: 10, color: 'var(--grey-500)', letterSpacing: '0.06em' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {standings.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 8 }}>
                Sin datos aún
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
                Al crear un Juego Rápido o Torneo, seleccioná esta liga para que los resultados cuenten.
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 60px 60px 60px 60px 80px', padding: '12px 20px', borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)' }}>
                {['#', 'Jugador', 'J', 'G', 'E', 'P', 'PTS'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', textAlign: h === 'Jugador' ? 'left' : 'right' }}>{h}</div>
                ))}
              </div>
              {standings.map((entry, idx) => {
                const isMe = entry.playerId === user?.id;
                return (
                  <div
                    key={entry.playerId}
                    style={{
                      display: 'grid', gridTemplateColumns: '48px 1fr 60px 60px 60px 60px 80px',
                      padding: '14px 20px',
                      borderBottom: idx < standings.length - 1 ? '1px solid var(--grey-100)' : 'none',
                      background: isMe ? 'rgba(214,255,0,0.05)' : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RankMedal pos={idx + 1} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: 'var(--black)' }}>{entry.playerName}</span>
                      {isMe && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px' }}>TÚ</span>}
                    </div>
                    {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
                      <div key={i} style={{ textAlign: 'right', fontSize: 13, color: 'var(--grey-600)' }}>{v}</div>
                    ))}
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>
                      {entry.points}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Members tab ── */}
      {tab === 'members' && (
        <>
          {memberMsg && (
            <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 16 }}>
              {memberMsg}
            </div>
          )}

          {amAdmin && (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px', marginBottom: 20 }}>
              <div style={{ ...lbl, marginBottom: 10 }}>Agregar Jugador</div>
              <input
                style={inp}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Buscar jugador por nombre..."
              />
              {memberResults.length > 0 && (
                <div style={{ border: '1px solid var(--grey-200)', marginTop: 4, background: '#fff' }}>
                  {memberResults.map(p => {
                    const already = members.some(m => m.playerId === p.id);
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 16px', borderBottom: '1px solid var(--grey-100)', cursor: already ? 'default' : 'pointer',
                          background: already ? 'var(--grey-50)' : '#fff',
                        }}
                        onClick={() => !already && handleAddMember(p)}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email}</div>
                        </div>
                        {already
                          ? <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>Ya miembro</span>
                          : <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--black)' }}>+ Agregar</span>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
              {members.length} Miembro{members.length !== 1 ? 's' : ''}
            </div>
            {members.map((member, idx) => (
              <div
                key={member.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: idx < members.length - 1 ? '1px solid var(--grey-100)' : 'none' }}
              >
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{member.playerName}</span>
                  {member.playerId === user?.id && (
                    <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px' }}>TÚ</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px',
                    background: member.role === 'admin' ? 'rgba(214,255,0,0.15)' : 'var(--grey-50)',
                    color: member.role === 'admin' ? 'var(--black)' : 'var(--grey-400)',
                    border: `1px solid ${member.role === 'admin' ? 'rgba(214,255,0,0.4)' : 'var(--grey-200)'}`,
                  }}>
                    {member.role === 'admin' ? 'Admin' : 'Miembro'}
                  </span>
                  {amAdmin && member.playerId !== user?.id && (
                    <>
                      <button
                        onClick={() => handleToggleRole(member)}
                        style={{ fontSize: 11, color: 'var(--grey-500)', border: '1px solid var(--grey-200)', background: '#fff', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        {member.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.playerId, member.playerName)}
                        style={{ fontSize: 11, color: '#dc2626', border: '1px solid #fecaca', background: '#fef2f2', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Seasons tab ── */}
      {tab === 'seasons' && (
        <>
          {amAdmin && !newSeasonOpen && (
            <button
              onClick={() => setNewSeasonOpen(true)}
              style={{ marginBottom: 20, padding: '10px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              + Nueva Temporada
            </button>
          )}

          {newSeasonOpen && (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
                Nueva Temporada
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={snName} onChange={e => setSnName(e.target.value)} placeholder="Ej: Temporada 2" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Inicio</label>
                  <input type="date" style={inp} value={snStart} onChange={e => setSnStart(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Fin</label>
                  <input type="date" style={inp} value={snEnd} onChange={e => setSnEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Victoria', color: '#16a34a', val: snWin,  set: setSnWin },
                  { label: 'Empate',   color: '#ca8a04', val: snDraw, set: setSnDraw },
                  { label: 'Derrota',  color: '#dc2626', val: snLoss, set: setSnLoss },
                ].map(({ label, color, val, set }) => (
                  <div key={label}>
                    <label style={{ ...lbl, color }}>{label}</label>
                    <input type="number" style={{ ...inp, textAlign: 'center' }} value={val} onChange={e => set(Number(e.target.value))} min={-10} max={100} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateSeason} style={{ padding: '10px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Guardar
                </button>
                <button onClick={() => setNewSeasonOpen(false)} style={{ padding: '10px 16px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {seasons.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>Sin temporadas aún. Creá la primera temporada para empezar a registrar resultados.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {seasons.map(season => (
                <div key={season.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--black)', marginBottom: 4 }}>{season.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
                        {season.startDate} → {season.endDate} &nbsp;·&nbsp; G:{season.pointsWin} E:{season.pointsDraw} P:{season.pointsLoss}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px',
                        background: season.status === 'active' ? 'rgba(34,197,94,0.12)' : season.status === 'upcoming' ? 'rgba(234,179,8,0.12)' : 'rgba(107,114,128,0.1)',
                        color: season.status === 'active' ? '#16a34a' : season.status === 'upcoming' ? '#ca8a04' : '#6b7280',
                      }}>
                        {season.status === 'active' ? 'Activa' : season.status === 'upcoming' ? 'Por iniciar' : 'Completada'}
                      </span>
                      {amAdmin && (
                        <select
                          value={season.status}
                          onChange={e => handleSetSeasonStatus(season, e.target.value as LeagueSeason['status'])}
                          style={{ fontSize: 11, border: '1px solid var(--grey-200)', padding: '4px 8px', background: '#fff', cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="upcoming">Por iniciar</option>
                          <option value="active">Activa</option>
                          <option value="completed">Completada</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
