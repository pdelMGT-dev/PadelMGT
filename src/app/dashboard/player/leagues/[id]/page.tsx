'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
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
  savePlayerLeague,
  computeLeagueStandings,
  deletePlayerLeague,
  getLeaguePendingRequests,
  getLeagueJoinRequests,
  reviewJoinRequest,
  fetchJoinRequestsFromSupabase,
  importLeagueJoinRequests,
  type PlayerLeague,
  type LeagueSeason,
  type LeagueMember,
  type LeagueJoinRequest,
  type LeagueStandingEntry,
} from '@/lib/player-league-store';
import { getAllGames } from '@/lib/game-store';
import { searchPlayers } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';

type Tab = 'ranking' | 'members' | 'seasons' | 'requests' | 'config';

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};
const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
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

  const [league,    setLeague]    = useState<PlayerLeague | null>(null);
  const [tab,       setTab]       = useState<Tab>('ranking');
  const [amAdmin,   setAmAdmin]   = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // Ranking
  const [seasons,      setSeasons]      = useState<LeagueSeason[]>([]);
  const [selectedSid,  setSelectedSid]  = useState<string | null>(null);
  const [standings,    setStandings]    = useState<LeagueStandingEntry[]>([]);

  // Members
  const [members,       setMembers]       = useState<LeagueMember[]>([]);
  const [memberSearch,  setMemberSearch]  = useState('');
  const [memberResults, setMemberResults] = useState<RegisteredPlayer[]>([]);
  const [memberMsg,     setMemberMsg]     = useState('');

  // Seasons — new form
  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [snName,  setSnName]  = useState('');
  const [snStart, setSnStart] = useState(new Date().toISOString().slice(0, 10));
  const [snEnd,   setSnEnd]   = useState(inMonths(3));
  const [snWin,   setSnWin]   = useState(3);
  const [snDraw,  setSnDraw]  = useState(1);
  const [snLoss,  setSnLoss]  = useState(0);

  // Requests
  const [joinRequests,  setJoinRequests]  = useState<LeagueJoinRequest[]>([]);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [reqMsg,        setReqMsg]        = useState('');

  // Config
  const [cfgName,    setCfgName]    = useState('');
  const [cfgDesc,    setCfgDesc]    = useState('');
  const [cfgOpen,    setCfgOpen]    = useState(false);
  const [cfgPublic,  setCfgPublic]  = useState(true);
  const [cfgWin,     setCfgWin]     = useState(3);
  const [cfgDraw,    setCfgDraw]    = useState(1);
  const [cfgLoss,    setCfgLoss]    = useState(0);
  const [cfgSaved,   setCfgSaved]   = useState(false);
  const [qrCopied,   setQrCopied]   = useState(false);

  // Co-admin search
  const [coAdminSearch,   setCoAdminSearch]   = useState('');
  const [coAdminResults,  setCoAdminResults]  = useState<RegisteredPlayer[]>([]);

  const reload = useCallback(() => {
    if (!user || !id) return;
    const l = getPlayerLeague(id);
    if (!l) { router.push('/dashboard/player/leagues'); return; }
    setLeague(l);
    const adminFlag = isLeagueAdmin(id, user.id);
    setAmAdmin(adminFlag);
    setIsCreator(l.createdBy === user.id);
    const ss = getLeagueSeasons(id);
    setSeasons(ss);
    const active = getActiveSeason(id);
    const sid = selectedSid ?? (active?.id ?? ss[ss.length - 1]?.id ?? null);
    setSelectedSid(sid);
    const mem = getLeagueMembers(id);
    setMembers(mem);
    const games = getAllGames();
    setStandings(computeLeagueStandings(id, sid, games));
    // Requests — local first, then merge from Supabase
    const reqs = getLeagueJoinRequests(id);
    setJoinRequests(reqs);
    setPendingCount(reqs.filter(r => r.status === 'pending').length);
    fetchJoinRequestsFromSupabase(id).then(remote => {
      if (remote.length === 0) return;
      importLeagueJoinRequests(remote);
      const merged = getLeagueJoinRequests(id);
      setJoinRequests(merged);
      setPendingCount(merged.filter(r => r.status === 'pending').length);
    }).catch(() => {});
    // Config
    setCfgName(l.name);
    setCfgDesc(l.description ?? '');
    setCfgOpen(l.isOpen);
    setCfgPublic(l.isPublic);
    setCfgWin(l.defaultPointsWin);
    setCfgDraw(l.defaultPointsDraw);
    setCfgLoss(l.defaultPointsLoss);
    setSnWin(l.defaultPointsWin);
    setSnDraw(l.defaultPointsDraw);
    setSnLoss(l.defaultPointsLoss);
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
    if (coAdminSearch.trim().length >= 2) {
      setCoAdminResults(searchPlayers(coAdminSearch).slice(0, 6));
    } else {
      setCoAdminResults([]);
    }
  }, [coAdminSearch]);

  useEffect(() => {
    if (!id || !selectedSid) return;
    setStandings(computeLeagueStandings(id, selectedSid, getAllGames()));
  }, [id, selectedSid]);

  // Members tab
  function handleAddMember(player: RegisteredPlayer) {
    if (!id) return;
    addLeagueMember({ leagueId: id, playerId: player.id, playerName: player.name });
    setMemberSearch(''); setMemberResults([]);
    setMemberMsg(`${player.name} agregado.`);
    reload(); setTimeout(() => setMemberMsg(''), 3000);
  }

  function handleRemoveMember(playerId: string, playerName: string) {
    if (!id) return;
    removeLeagueMember(id, playerId);
    reload();
    setMemberMsg(`${playerName} eliminado.`);
    setTimeout(() => setMemberMsg(''), 3000);
  }

  function handleToggleRole(member: LeagueMember) {
    if (!id) return;
    updateMemberRole(id, member.playerId, member.role === 'admin' ? 'member' : 'admin');
    reload();
  }

  // Seasons tab
  function handleCreateSeason() {
    if (!id || !snName.trim()) return;
    createLeagueSeason({ leagueId: id, name: snName.trim(), startDate: snStart, endDate: snEnd, pointsWin: snWin, pointsDraw: snDraw, pointsLoss: snLoss });
    setNewSeasonOpen(false);
    setSnName(''); setSnStart(new Date().toISOString().slice(0, 10)); setSnEnd(inMonths(3));
    reload();
  }

  function handleSetSeasonStatus(season: LeagueSeason, status: LeagueSeason['status']) {
    saveLeagueSeason({ ...season, status }); reload();
  }

  // Requests tab
  function handleReviewRequest(reqId: string, status: 'approved' | 'rejected') {
    if (!user) return;
    reviewJoinRequest(reqId, status, user.id);
    reload();
    setReqMsg(status === 'approved' ? 'Solicitud aprobada — jugador agregado.' : 'Solicitud rechazada.');
    setTimeout(() => setReqMsg(''), 3000);
  }

  // Config tab
  function handleSaveConfig() {
    if (!league || !id) return;
    savePlayerLeague({
      ...league,
      name: cfgName.trim() || league.name,
      description: cfgDesc.trim() || undefined,
      isOpen: cfgOpen,
      isPublic: cfgPublic,
      defaultPointsWin: cfgWin,
      defaultPointsDraw: cfgDraw,
      defaultPointsLoss: cfgLoss,
    });
    setCfgSaved(true);
    reload();
    setTimeout(() => setCfgSaved(false), 3000);
  }

  function handleDeleteLeague() {
    if (!id) return;
    if (!confirm(`¿Eliminar la liga "${league?.name}"? Esta acción no se puede deshacer.`)) return;
    deletePlayerLeague(id);
    router.push('/dashboard/player/leagues');
  }

  function handleCopyUrl() {
    if (!league || !publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2500);
    });
  }

  if (!league) return <div style={{ padding: 40, color: 'var(--grey-400)' }}>Cargando...</div>;

  const leagueCode = league.code ?? '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://padelmgt.com';
  const shareParams = leagueCode ? (() => {
    const p = new URLSearchParams({
      id: league.id,
      n: league.name,
      cb: league.createdByName,
      pub: league.isPublic ? '1' : '0',
      open: league.isOpen ? '1' : '0',
    });
    if (league.description) p.set('d', league.description.slice(0, 120));
    return p.toString();
  })() : '';
  const publicUrl = leagueCode ? `${origin}/l/${leagueCode}?${shareParams}` : '';
  const selectedSeasonObj = selectedSid ? getLeagueSeason(selectedSid) : null;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '10px 18px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
    cursor: 'pointer', border: 'none', background: 'none',
    borderBottom: tab === t ? '2px solid var(--neon, #d6ff00)' : '2px solid transparent',
    color: tab === t ? 'var(--black)' : 'var(--grey-400)',
    transition: 'color 0.15s', outline: 'none', position: 'relative' as const, flexShrink: 0,
  });

  return (
    <div style={{ padding: '40px 32px 80px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/dashboard/player/leagues" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none' }}>
          ← Mis Ligas
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                {league.name}
              </h1>
              {isCreator && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px' }}>
                  Admin Principal
                </span>
              )}
              {amAdmin && !isCreator && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(214,255,0,0.3)', color: 'var(--black)', padding: '2px 6px' }}>
                  Co-admin
                </span>
              )}
              {leagueCode && <span style={{ fontSize: 11, color: 'var(--grey-400)', fontFamily: 'monospace' }}>{leagueCode}</span>}
            </div>
            {league.description && <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>{league.description}</div>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', textAlign: 'right', flexShrink: 0 }}>
            {members.length} miembro{members.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 28, overflowX: 'auto' }}>
        <button style={tabStyle('ranking')} onClick={() => setTab('ranking')}>Ranking</button>
        <button style={tabStyle('members')} onClick={() => setTab('members')}>Miembros</button>
        <button style={tabStyle('seasons')} onClick={() => setTab('seasons')}>Temporadas</button>
        {amAdmin && (
          <button style={tabStyle('requests')} onClick={() => setTab('requests')}>
            Solicitudes
            {pendingCount > 0 && (
              <span style={{ marginLeft: 6, minWidth: 16, height: 16, borderRadius: 8, background: '#ee0005', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', verticalAlign: 'middle' }}>
                {pendingCount}
              </span>
            )}
          </button>
        )}
        {amAdmin && (
          <button style={tabStyle('config')} onClick={() => setTab('config')}>Configuración</button>
        )}
      </div>

      {/* ── Ranking ── */}
      {tab === 'ranking' && (
        <>
          {seasons.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <label style={{ ...lbl, margin: 0 }}>Temporada:</label>
              <select value={selectedSid ?? ''} onChange={e => setSelectedSid(e.target.value || null)} style={{ ...inp, width: 'auto', minWidth: 200 }}>
                <option value="">Todas</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {selectedSeasonObj && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[{ l: 'Victoria', pts: selectedSeasonObj.pointsWin, c: '#16a34a' }, { l: 'Empate', pts: selectedSeasonObj.pointsDraw, c: '#ca8a04' }, { l: 'Derrota', pts: selectedSeasonObj.pointsLoss, c: '#dc2626' }].map(({ l, pts, c }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: `${c}10`, border: `1px solid ${c}30` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{pts > 0 ? '+' : ''}{pts}</span>
                  <span style={{ fontSize: 10, color: 'var(--grey-500)' }}>{l}</span>
                </div>
              ))}
            </div>
          )}
          {standings.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 8 }}>Sin datos aún</div>
              <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Al crear un Juego Rápido o Torneo, seleccioná esta liga para que los resultados cuenten aquí.</div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 50px 50px 50px 50px 70px', padding: '10px 20px', borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)' }}>
                {['#', 'Jugador', 'J', 'G', 'E', 'P', 'PTS'].map(h => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', textAlign: h === 'Jugador' ? 'left' : 'right' }}>{h}</div>
                ))}
              </div>
              {standings.map((entry, idx) => {
                const isMe = entry.playerId === user?.id;
                return (
                  <div key={entry.playerId} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 50px 50px 50px 50px 70px', padding: '12px 20px', borderBottom: idx < standings.length - 1 ? '1px solid var(--grey-100)' : 'none', background: isMe ? 'rgba(214,255,0,0.05)' : 'transparent', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RankMedal pos={idx + 1} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: 'var(--black)' }}>{entry.playerName}</span>
                      {isMe && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px' }}>TÚ</span>}
                    </div>
                    {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => <div key={i} style={{ textAlign: 'right', fontSize: 12, color: 'var(--grey-600)' }}>{v}</div>)}
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--black)' }}>{entry.points}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Members ── */}
      {tab === 'members' && (
        <>
          {memberMsg && <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 14 }}>{memberMsg}</div>}
          {amAdmin && (
            <div style={card}>
              <div style={secTitle}>Agregar Jugador</div>
              <input style={inp} value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Buscar jugador por nombre..." />
              {memberResults.length > 0 && (
                <div style={{ border: '1px solid var(--grey-200)', marginTop: 4, background: '#fff' }}>
                  {memberResults.map(p => {
                    const already = members.some(m => m.playerId === p.id);
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--grey-100)', cursor: already ? 'default' : 'pointer', background: already ? 'var(--grey-50)' : '#fff' }} onClick={() => !already && handleAddMember(p)}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email}</div>
                        </div>
                        {already ? <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>Ya miembro</span> : <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--black)' }}>+ Agregar</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
              {members.length} Miembro{members.length !== 1 ? 's' : ''}
            </div>
            {members.map((member, idx) => (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: idx < members.length - 1 ? '1px solid var(--grey-100)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{member.playerName}</span>
                  {member.playerId === user?.id && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px' }}>TÚ</span>}
                  {member.playerId === league.createdBy && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Creador</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', background: member.role === 'admin' ? 'rgba(214,255,0,0.15)' : 'var(--grey-50)', color: member.role === 'admin' ? 'var(--black)' : 'var(--grey-400)', border: `1px solid ${member.role === 'admin' ? 'rgba(214,255,0,0.4)' : 'var(--grey-200)'}` }}>
                    {member.role === 'admin' ? 'Admin' : 'Miembro'}
                  </span>
                  {amAdmin && member.playerId !== league.createdBy && member.playerId !== user?.id && (
                    <>
                      <button onClick={() => handleToggleRole(member)} style={{ fontSize: 11, color: 'var(--grey-500)', border: '1px solid var(--grey-200)', background: '#fff', padding: '4px 8px', cursor: 'pointer' }}>
                        {member.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button onClick={() => handleRemoveMember(member.playerId, member.playerName)} style={{ fontSize: 11, color: '#dc2626', border: '1px solid #fecaca', background: '#fef2f2', padding: '4px 8px', cursor: 'pointer' }}>
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

      {/* ── Seasons ── */}
      {tab === 'seasons' && (
        <>
          {amAdmin && !newSeasonOpen && (
            <button onClick={() => setNewSeasonOpen(true)} style={{ marginBottom: 16, padding: '10px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              + Nueva Temporada
            </button>
          )}
          {newSeasonOpen && (
            <div style={card}>
              <div style={secTitle}>Nueva Temporada</div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={snName} onChange={e => setSnName(e.target.value)} placeholder={`Temporada ${seasons.length + 1}`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>Inicio</label><input type="date" style={inp} value={snStart} onChange={e => setSnStart(e.target.value)} /></div>
                <div><label style={lbl}>Fin</label><input type="date" style={inp} value={snEnd} onChange={e => setSnEnd(e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[{ l: 'Victoria', c: '#16a34a', v: snWin, s: setSnWin }, { l: 'Empate', c: '#ca8a04', v: snDraw, s: setSnDraw }, { l: 'Derrota', c: '#dc2626', v: snLoss, s: setSnLoss }].map(({ l, c, v, s }) => (
                  <div key={l}><label style={{ ...lbl, color: c }}>{l}</label><input type="number" style={{ ...inp, textAlign: 'center' }} value={v} onChange={e => s(Number(e.target.value))} min={-10} max={100} /></div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateSeason} style={{ padding: '10px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Guardar</button>
                <button onClick={() => setNewSeasonOpen(false)} style={{ padding: '10px 16px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)' }}>Cancelar</button>
              </div>
            </div>
          )}
          {seasons.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>Sin temporadas. Creá la primera para empezar a registrar resultados.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {seasons.map(season => (
                <div key={season.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--black)', marginBottom: 4 }}>{season.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{season.startDate} → {season.endDate} · G:{season.pointsWin} E:{season.pointsDraw} P:{season.pointsLoss}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', background: season.status === 'active' ? 'rgba(34,197,94,0.12)' : season.status === 'upcoming' ? 'rgba(234,179,8,0.12)' : 'rgba(107,114,128,0.1)', color: season.status === 'active' ? '#16a34a' : season.status === 'upcoming' ? '#ca8a04' : '#6b7280' }}>
                        {season.status === 'active' ? 'Activa' : season.status === 'upcoming' ? 'Por iniciar' : 'Completada'}
                      </span>
                      {amAdmin && (
                        <select value={season.status} onChange={e => handleSetSeasonStatus(season, e.target.value as LeagueSeason['status'])} style={{ fontSize: 11, border: '1px solid var(--grey-200)', padding: '4px 8px', background: '#fff', cursor: 'pointer', outline: 'none' }}>
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

      {/* ── Solicitudes ── */}
      {tab === 'requests' && amAdmin && (
        <>
          {reqMsg && <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 14 }}>{reqMsg}</div>}
          {joinRequests.filter(r => r.status === 'pending').length === 0 && (
            <div style={{ border: '1px dashed var(--grey-300)', padding: '40px', textAlign: 'center', background: 'var(--grey-50)', marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>Sin solicitudes pendientes.</div>
            </div>
          )}
          {joinRequests.filter(r => r.status === 'pending').length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 10 }}>Pendientes ({joinRequests.filter(r => r.status === 'pending').length})</div>
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
                {joinRequests.filter(r => r.status === 'pending').map((req, idx, arr) => (
                  <div key={req.id} style={{ padding: '14px 20px', borderBottom: idx < arr.length - 1 ? '1px solid var(--grey-100)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 2 }}>{req.playerName}</div>
                        {req.playerEmail && <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>{req.playerEmail}</div>}
                        {req.message && <div style={{ fontSize: 12, color: 'var(--grey-600)', fontStyle: 'italic' }}>"{req.message}"</div>}
                        <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 4 }}>{new Date(req.createdAt).toLocaleDateString('es-ES')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => handleReviewRequest(req.id, 'approved')} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Aprobar</button>
                        <button onClick={() => handleReviewRequest(req.id, 'rejected')} style={{ padding: '8px 14px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Rechazar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {joinRequests.filter(r => r.status !== 'pending').length > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 10 }}>Historial</div>
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
                {joinRequests.filter(r => r.status !== 'pending').map((req, idx, arr) => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: idx < arr.length - 1 ? '1px solid var(--grey-100)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--grey-600)' }}>{req.playerName}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', background: req.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.08)', color: req.status === 'approved' ? '#16a34a' : '#dc2626' }}>
                      {req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Configuración ── */}
      {tab === 'config' && amAdmin && (
        <>
          {/* Info */}
          <div style={card}>
            <div style={secTitle}>Información de la Liga</div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nombre</label>
              <input style={inp} value={cfgName} onChange={e => setCfgName(e.target.value)} maxLength={80} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Descripción</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={cfgDesc} onChange={e => setCfgDesc(e.target.value)} maxLength={300} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={cfgOpen} onChange={e => setCfgOpen(e.target.checked)} />
                <div>
                  <span style={{ fontSize: 13, color: 'var(--black)', fontWeight: 500 }}>Liga abierta</span>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Cualquier jugador puede solicitar unirse vía el link o QR</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={cfgPublic} onChange={e => setCfgPublic(e.target.checked)} />
                <div>
                  <span style={{ fontSize: 13, color: 'var(--black)', fontWeight: 500 }}>Standings públicos</span>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>La tabla de posiciones es visible en la página pública de la liga</div>
                </div>
              </label>
            </div>
          </div>

          {/* QR */}
          <div style={card}>
            <div style={secTitle}>Compartir Liga</div>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flexShrink: 0, padding: 12, background: '#fff', border: '1px solid var(--grey-200)', display: 'inline-block' }}>
                <QRCodeSVG value={publicUrl} size={140} />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Link público</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} value={publicUrl} readOnly />
                    <button onClick={handleCopyUrl} style={{ flexShrink: 0, padding: '10px 16px', background: qrCopied ? '#16a34a' : 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {qrCopied ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)', lineHeight: 1.6 }}>
                  Compartí este link o el QR para que los jugadores puedan solicitar unirse a la liga. El código único de tu liga es <strong style={{ fontFamily: 'monospace', color: 'var(--black)' }}>{leagueCode}</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Default points */}
          <div style={card}>
            <div style={secTitle}>Puntos por Defecto (nuevas temporadas)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
              {[{ l: 'Victoria', c: '#16a34a', v: cfgWin, s: setCfgWin }, { l: 'Empate', c: '#ca8a04', v: cfgDraw, s: setCfgDraw }, { l: 'Derrota', c: '#dc2626', v: cfgLoss, s: setCfgLoss }].map(({ l, c, v, s }) => (
                <div key={l} style={{ border: `1px solid ${c}30`, padding: '12px', background: `${c}08` }}>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c, marginBottom: 8, display: 'block' }}>{l}</label>
                  <input type="number" style={{ ...inp, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, padding: '8px', borderColor: `${c}40` }} value={v} onChange={e => s(Number(e.target.value))} min={-10} max={100} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>Estos valores se usan como punto de partida al crear nuevas temporadas. Cada temporada puede tener sus propios valores.</div>
          </div>

          {/* Co-admins */}
          <div style={card}>
            <div style={secTitle}>Co-administradores</div>
            <div style={{ marginBottom: 16 }}>
              {members.filter(m => m.role === 'admin').map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--grey-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--black)' }}>{m.playerName}</span>
                    {m.playerId === league.createdBy && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Principal</span>}
                  </div>
                  {isCreator && m.playerId !== league.createdBy && (
                    <button onClick={() => { updateMemberRole(id!, m.playerId, 'member'); reload(); }} style={{ fontSize: 11, color: 'var(--grey-500)', border: '1px solid var(--grey-200)', background: '#fff', padding: '4px 8px', cursor: 'pointer' }}>
                      Quitar admin
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isCreator && (
              <>
                <label style={lbl}>Agregar co-administrador (buscar entre miembros)</label>
                <input style={inp} value={coAdminSearch} onChange={e => setCoAdminSearch(e.target.value)} placeholder="Buscar miembro..." />
                {coAdminResults.length > 0 && (
                  <div style={{ border: '1px solid var(--grey-200)', marginTop: 4, background: '#fff' }}>
                    {coAdminResults.map(p => {
                      const mem = members.find(m => m.playerId === p.id);
                      if (!mem) return null;
                      if (mem.role === 'admin') return null;
                      return (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }} onClick={() => { updateMemberRole(id!, p.id, 'admin'); setCoAdminSearch(''); setCoAdminResults([]); reload(); }}>
                          <span style={{ fontSize: 13, color: 'var(--black)' }}>{p.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--black)' }}>+ Hacer admin</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Save / delete */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleSaveConfig} style={{ padding: '12px 28px', background: cfgSaved ? '#16a34a' : 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {cfgSaved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
            {isCreator && (
              <button onClick={handleDeleteLeague} style={{ padding: '12px 20px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Eliminar Liga
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
