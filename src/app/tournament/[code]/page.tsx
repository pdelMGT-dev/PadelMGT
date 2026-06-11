'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getTournamentByCode, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import type { ScoreConfig, FixedPair } from '@/lib/game-engine';
import { submitJoinRequest, getMyJoinRequest, type JoinRequest } from '@/lib/join-request-store';
import { QRCodeSVG } from 'qrcode.react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import KnockoutBracketView from '@/components/KnockoutBracketView';
import { fetchTournamentByCode } from '@/lib/supabase';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; dot?: boolean }> = {
  created:       { label: 'Inscripciones abiertas', color: '#a78bfa', bg: 'rgba(124,58,237,0.2)' },
  starting_soon: { label: 'Por Empezar',             color: '#f5a623', bg: 'rgba(245,166,35,0.2)' },
  live:          { label: 'En Vivo',                  color: 'var(--neon)', bg: 'rgba(214,255,0,0.15)', dot: true },
  finished:      { label: 'Finalizado',               color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)' },
  cancelled:     { label: 'Cancelado',                color: '#f87171', bg: 'rgba(239,68,68,0.15)' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const CATEGORY_LABEL: Record<string, string> = {
  open: 'Open', amateur: 'Amateur', pro: 'Pro', mixed: 'Mixto',
};

function scoreConfigLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `${cfg.target} pts`;
  return `${cfg.setsPerMatch ?? 1} set${(cfg.setsPerMatch ?? 1) !== 1 ? 's' : ''}`;
}

export default function PublicTournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user } = useCurrentUser();
  const currentUserId = user?.id ?? null;
  const [tournament, setTournament] = useState<Tournament | null>(() =>
    typeof window !== 'undefined' ? getTournamentByCode(code) : null
  );
  const [roundOpen, setRoundOpen] = useState<Record<number, boolean>>({});
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'bracket'>('groups');
  const [expandedGroupRounds, setExpandedGroupRounds] = useState<Record<string, boolean>>({});
  const [expandedBracketRounds, setExpandedBracketRounds] = useState<Record<string, boolean>>({});
  const [screenW, setScreenW] = useState(1200);
  const [sbLoading, setSbLoading] = useState(false);

  function toggleGroupRound(groupId: string, roundNum: number) {
    const key = `${groupId}_${roundNum}`;
    setExpandedGroupRounds(prev => ({ ...prev, [key]: !prev[key] }));
  }
  function isGroupRoundExpanded(groupId: string, roundNum: number) {
    return expandedGroupRounds[`${groupId}_${roundNum}`] !== false;
  }
  function toggleBracketRound(name: string) {
    setExpandedBracketRounds(prev => ({ ...prev, [name]: !prev[name] }));
  }
  function isBracketRoundExpanded(name: string) {
    return expandedBracketRounds[name] !== false;
  }

  useEffect(() => {
    const update = () => setScreenW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Fetch from Supabase if not in localStorage (cross-device share)
  useEffect(() => {
    const local = getTournamentByCode(code);
    if (local) return;
    setSbLoading(true);
    fetchTournamentByCode(code)
      .then(raw => {
        if (!raw) return;
        const t = raw as unknown as Tournament;
        saveTournament(t);
        setTournament(t);
      })
      .finally(() => setSbLoading(false));
  }, [code]);

  useEffect(() => {
    if (!currentUserId) return;
    const t2 = getTournamentByCode(code);
    if (t2) setMyRequest(getMyJoinRequest(t2.id, currentUserId));
  }, [code, currentUserId]);

  useEffect(() => {
    const load = () => {
      const t2 = getTournamentByCode(code);
      setTournament(t2 ?? null);
      if (currentUserId && t2) setMyRequest(getMyJoinRequest(t2.id, currentUserId));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code, currentUserId]);

  // 10-second polling: re-read from localStorage or fall back to Supabase
  useEffect(() => {
    const interval = setInterval(() => {
      const local = getTournamentByCode(code);
      if (local) {
        setTournament(local);
      } else {
        fetchTournamentByCode(code).then(raw => {
          if (raw) {
            const t = raw as unknown as Tournament;
            saveTournament(t);
            setTournament(t);
          }
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [code]);

  if (!tournament) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Torneo no encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 24 }}>El código <strong>{code}</strong> no corresponde a ningún torneo.</div>
        <Link href="/" style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    );
  }

  const si = STATUS_INFO[tournament.status] ?? STATUS_INFO.created;
  const isLive     = tournament.status === 'live';
  const isFinished = tournament.status === 'finished';
  const isPending  = tournament.status === 'created' || tournament.status === 'starting_soon';
  const isFull     = tournament.players.length >= tournament.maxPlayers;
  const isEnrolled = currentUserId != null && tournament.players.some(p => p.id === currentUserId);
  const isCreator  = currentUserId != null && currentUserId === tournament.creatorId;
  const isDesktop  = screenW >= 900;
  const pairs = tournament.fixedPairs ?? [];

  function getName(pid: string) {
    return tournament!.players.find(p => p.id === pid)?.name ?? pid;
  }

  function getPairLabel(playerId: string): string {
    const fp = tournament!.fixedPairs;
    if (fp?.length) {
      const pair = fp.find((p: FixedPair) => p.player1Id === playerId);
      if (pair) return pair.name || `${pair.player1Name} / ${pair.player2Name}`;
    }
    return tournament!.players.find(p => p.id === playerId)?.name ?? playerId;
  }

  function getPairSub(playerId: string): string | null {
    const fp = tournament!.fixedPairs;
    if (!fp?.length) return null;
    const pair = fp.find((p: FixedPair) => p.player1Id === playerId);
    return pair?.name ? `${pair.player1Name} / ${pair.player2Name}` : null;
  }

  const currentRound = tournament.rounds.find(r => r.num === tournament.currentRound) ?? null;
  const doneRounds   = tournament.rounds.filter(r => r.status === 'completed');

  function handleJoinRequest() {
    if (!tournament || !currentUserId) return;
    const raw = localStorage.getItem('padelmgt_user');
    const u = raw ? JSON.parse(raw) : null;
    if (!u) return;
    const req = submitJoinRequest(tournament.id, 'tournament', currentUserId, u.name, u.email);
    setMyRequest(req);
    setRequestSent(true);
  }

  const winPct = (s: { wins: number; played: number }) =>
    s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'var(--font-body)' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', background: 'var(--court-blue-deep, #0a0f1e)', color: '#fff', padding: `72px clamp(16px, 4vw, 48px) 48px`, overflow: 'hidden' }}>
        {/* court bg texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/court-bg.svg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)' }} />

        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 20 }}>
            <Link href="/tournaments" style={{ color: 'inherit', textDecoration: 'none' }}>TORNEOS</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{tournament.name.toUpperCase()}</span>
            <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: si.bg, borderRadius: 2 }}>
              {si.dot && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon)', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 9, fontWeight: 700, color: si.color, letterSpacing: '0.12em' }}>{si.label.toUpperCase()}</span>
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1 }}>
            {tournament.name}
          </h1>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            {[tournament.club, tournament.city].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      {/* ── Info bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid #e5e5e5' }}>
          {[
            { label: 'Formato',   value: FORMAT_LABEL[tournament.format] ?? tournament.format },
            { label: 'Categoría', value: tournament.mixto ? 'Mixto' : 'Open' },
            { label: 'Nivel',     value: tournament.levelLabel ?? 'All Levels' },
            { label: 'Jugadores', value: `${tournament.players.length}/${tournament.maxPlayers}` },
          ].map(item => (
            <div key={item.label} style={{ padding: '24px 28px', borderRight: '1px solid #e5e5e5' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: `40px ${isDesktop ? '48px' : '16px'} 80px`, display: 'grid', gridTemplateColumns: isDesktop ? '1fr 320px' : '1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div>

          {/* Organizer bar */}
          {isCreator && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--black)', color: '#fff', marginBottom: 24 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Sos el organizador de este torneo</span>
              {isFinished ? (
                <Link href={`/dashboard/player/tournaments/${tournament.id}/live`}
                  style={{ padding: '8px 20px', background: 'var(--neon)', color: 'var(--black)', fontSize: 11, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Ver resultados →
                </Link>
              ) : (
                <Link href={`/dashboard/player/tournaments/${tournament.id}`}
                  style={{ padding: '8px 20px', background: 'var(--neon)', color: 'var(--black)', fontSize: 11, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Gestionar →
                </Link>
              )}
            </div>
          )}

          {/* Podium — finished */}
          {isFinished && tournament.standings.length >= 1 && (() => {
            const top3 = tournament.standings.slice(0, 3);
            const medals = ['🥇', '🥈', '🥉'];
            const heights = [130, 95, 70];
            const order = [1, 0, 2];
            const platColors = ['#c9a227', '#9e9e9e', '#a0522d'];
            return (
              <div style={{ background: 'var(--black)', padding: '32px 24px 0', marginBottom: 24 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'center', marginBottom: 28 }}>PODIO FINAL</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                  {order.map(i => {
                    const s = top3[i];
                    if (!s) return <div key={i} style={{ width: 100 }} />;
                    const isFirst = i === 0;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120 }}>
                        <div style={{ fontSize: isFirst ? 44 : 32, marginBottom: 6 }}>{medals[i]}</div>
                        <div style={{ color: '#fff', fontSize: isFirst ? 13 : 11, fontWeight: 700, textAlign: 'center', marginBottom: getPairSub(s.playerId) ? 2 : 4, maxWidth: 112, wordBreak: 'break-word', lineHeight: 1.3 }}>{getPairLabel(s.playerId)}</div>
                        {getPairSub(s.playerId) && (
                          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, textAlign: 'center', marginBottom: 4, maxWidth: 112, wordBreak: 'break-word' }}>{getPairSub(s.playerId)}</div>
                        )}
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: isFirst ? 18 : 14, fontWeight: 700, color: platColors[i], marginBottom: 10 }}>{s.pts} pts</div>
                        <div style={{ width: '100%', height: heights[i], background: platColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: isFirst ? 26 : 20, fontWeight: 700, color: '#fff' }}>{i + 1}º</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* PARTIDOS section — only for rounds-based formats (americano, mexicano, round_robin) */}
          {tournament.rounds.length > 0 && (isLive || isFinished || doneRounds.length > 0) && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>PARTIDOS</h2>

              {/* Current live round */}
              {isLive && currentRound && currentRound.courts.map(court => {
                const isDone = court.status === 'completed';
                const isPlaying = !isDone;
                return (
                  <div key={court.courtNum} style={{ display: 'grid', gridTemplateColumns: isDesktop ? '90px 1fr auto 90px' : '1fr', alignItems: 'center', gap: 0, marginBottom: 2, background: isPlaying ? 'var(--black)' : '#fff', border: isPlaying ? 'none' : '1px solid #e8e8e8' }}>
                    <div style={{ padding: '14px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isPlaying ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)' }}>
                      COURT {court.courtNum}
                    </div>
                    <div style={{ padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        {court.pair1.map(pid => (
                          <div key={pid} style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? '#fff' : 'var(--black)', lineHeight: 1.4 }}>
                            {getName(pid)}
                          </div>
                        ))}
                      </div>
                      {isDone && (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                          <span>{court.pair1Score}</span>
                          <span style={{ color: 'var(--grey-300)', margin: '0 6px', fontSize: 16 }}>-</span>
                          <span>{court.pair2Score}</span>
                        </div>
                      )}
                      <div>
                        {court.pair2.map(pid => (
                          <div key={pid} style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? '#fff' : 'var(--black)', lineHeight: 1.4 }}>
                            {getName(pid)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {isPlaying ? (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--neon)', background: 'rgba(214,255,0,0.15)', padding: '4px 8px' }}>● LIVE</span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase' }}>Finalizado</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Done / finished rounds — collapsible */}
              {(isFinished ? tournament.rounds : doneRounds).map(round => {
                const isOpen = isFinished ? !!roundOpen[round.num] : true;
                const toggle = () => setRoundOpen(prev => ({ ...prev, [round.num]: !prev[round.num] }));
                return (
                  <div key={round.num} style={{ marginBottom: 2 }}>
                    <button
                      onClick={toggle}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid #e8e8e8', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                        RONDA {round.num} <span style={{ color: 'var(--grey-300)', fontWeight: 400 }}>({round.courts.length} partido{round.courts.length !== 1 ? 's' : ''})</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                    </button>
                    {isOpen && round.courts.map(court => {
                      const p1won = (court.pair1Score ?? 0) > (court.pair2Score ?? 0);
                      const p2won = (court.pair2Score ?? 0) > (court.pair1Score ?? 0);
                      return (
                        <div key={court.courtNum} style={{ padding: '10px 16px', background: '#fafafa', borderLeft: '1px solid #e8e8e8', borderRight: '1px solid #e8e8e8', borderBottom: '1px solid #e8e8e8' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: p1won ? 700 : 500, color: p1won ? 'var(--black)' : 'var(--grey-500)' }}>{p1won ? '▶ ' : ''}{court.pair1.map(pid => getName(pid)).join(' / ')}</span>
                              <span style={{ fontSize: 12, fontWeight: p2won ? 700 : 500, color: p2won ? 'var(--black)' : 'var(--grey-500)' }}>{p2won ? '▶ ' : ''}{court.pair2.map(pid => getName(pid)).join(' / ')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 60 }}>
                              {(court as any).sets && (court as any).sets.length > 0 ? (
                                (court as any).sets.map((s: {p1: number; p2: number}, si: number) => (
                                  <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, color: 'var(--grey-300)' }}>Set {si + 1}</span>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.p1 > s.p2 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p1}</span>
                                    <span style={{ color: 'var(--grey-300)' }}>–</span>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.p2 > s.p1 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p2}</span>
                                  </div>
                                ))
                              ) : court.pair1Score !== null ? (
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{court.pair1Score} – {court.pair2Score}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* GRUPOS section — for Knockout with group stage */}
          {tournament.groups && (
            <div style={{ marginBottom: 32 }}>
              {/* Tab bar when both groups and bracket exist */}
              {tournament.bracket && (
                <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', marginBottom: 16 }}>
                  {(['groups', 'bracket'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: activeTab === tab ? 'var(--black)' : 'var(--grey-400)',
                      borderBottom: activeTab === tab ? '2px solid var(--black)' : '2px solid transparent',
                      marginBottom: -2,
                    }}>
                      {tab === 'groups' ? '📊 Grupos' : '🏆 Bracket'}
                    </button>
                  ))}
                </div>
              )}

              {/* Groups tab content */}
              {(!tournament.bracket || activeTab === 'groups') && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                    Fase I — Grupos
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 12, marginBottom: 24 }}>
                    {tournament.groups.groups.map(group => {
                      const completedMatches = group.matches.filter(m => m.status === 'completed');
                      const byRound: Record<number, typeof completedMatches> = {};
                      completedMatches.forEach(m => {
                        const r = (m as any).roundNum ?? 1;
                        if (!byRound[r]) byRound[r] = [];
                        byRound[r].push(m);
                      });
                      const roundNums = Object.keys(byRound).map(Number).sort((a, b) => a - b);
                      return (
                        <div key={group.id} style={{ background: '#fff', border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 16px', background: 'var(--black)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{group.name}</div>
                          <div style={{ padding: '12px 16px' }}>
                            {/* Standings table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e8e8e8', color: 'var(--grey-400)' }}>
                                  <th style={{ textAlign: 'left', padding: '4px 0', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Equipo</th>
                                  <th style={{ textAlign: 'center', padding: '4px 4px', fontSize: 9, fontWeight: 700 }}>PJ</th>
                                  <th style={{ textAlign: 'center', padding: '4px 4px', fontSize: 9, fontWeight: 700 }}>PG</th>
                                  <th style={{ textAlign: 'center', padding: '4px 4px', fontSize: 9, fontWeight: 700 }}>SF</th>
                                  <th style={{ textAlign: 'center', padding: '4px 4px', fontSize: 9, fontWeight: 700 }}>SC</th>
                                  <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 9, fontWeight: 700 }}>PTS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.standings.map((s, i) => {
                                  const advancing = i < (tournament.knockoutConfig?.teamsAdvancing ?? 1);
                                  const fp = pairs.find(p => p.player1Id === s.playerId);
                                  const teamName = fp ? (fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`) : s.playerName;
                                  return (
                                    <tr key={s.playerId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                      <td style={{ padding: '5px 0', fontSize: 12, fontWeight: advancing ? 700 : 400, color: 'var(--black)' }}>
                                        {advancing ? '↑ ' : ''}{teamName}
                                      </td>
                                      <td style={{ textAlign: 'center', padding: '5px 4px', color: 'var(--grey-500)' }}>{s.played}</td>
                                      <td style={{ textAlign: 'center', padding: '5px 4px', color: 'var(--grey-500)' }}>{s.wins}</td>
                                      <td style={{ textAlign: 'center', padding: '5px 4px', color: 'var(--grey-500)' }}>{s.pointsFor}</td>
                                      <td style={{ textAlign: 'center', padding: '5px 4px', color: 'var(--grey-500)' }}>{s.pointsAgainst}</td>
                                      <td style={{ textAlign: 'right', padding: '5px 0', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>{s.pts}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {/* Collapsible round results */}
                            {roundNums.map(roundNum => {
                              const rMatches = byRound[roundNum];
                              const isOpen = isGroupRoundExpanded(group.id, roundNum);
                              return (
                                <div key={roundNum} style={{ marginBottom: 3, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                                  <button onClick={() => toggleGroupRound(group.id, roundNum)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fafafa', border: 'none', cursor: 'pointer', color: 'var(--grey-500)' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ronda {roundNum} <span style={{ color: 'var(--grey-300)', fontWeight: 400 }}>({rMatches.length})</span></span>
                                    <span style={{ fontSize: 10, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                                  </button>
                                  {isOpen && (
                                    <div style={{ padding: '4px 10px 8px' }}>
                                      {rMatches.map(match => {
                                        const fp1 = pairs.find(p => p.player1Id === match.pair1[0]);
                                        const fp2 = pairs.find(p => p.player1Id === match.pair2[0]);
                                        const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : match.pair1[0];
                                        const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : match.pair2[0];
                                        const p1won = (match.pair1Score ?? 0) > (match.pair2Score ?? 0);
                                        const p2won = (match.pair2Score ?? 0) > (match.pair1Score ?? 0);
                                        return (
                                          <div key={match.courtNum} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 11 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span style={{ fontWeight: p1won ? 700 : 400, color: p1won ? 'var(--black)' : 'var(--grey-500)' }}>{p1won ? '▶ ' : ''}{n1}</span>
                                                <span style={{ fontWeight: p2won ? 700 : 400, color: p2won ? 'var(--black)' : 'var(--grey-400)' }}>{p2won ? '▶ ' : ''}{n2}</span>
                                              </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 56 }}>
                                                {match.sets && match.sets.length > 0 ? (
                                                  match.sets.map((s, si) => (
                                                    <div key={si} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                                      <span style={{ fontSize: 9, color: 'var(--grey-300)' }}>S{si + 1}</span>
                                                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: s.p1 > s.p2 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p1}</span>
                                                      <span style={{ color: 'var(--grey-300)' }}>–</span>
                                                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: s.p2 > s.p1 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p2}</span>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>{match.pair1Score} – {match.pair2Score}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Bracket tab content */}
              {tournament.bracket && activeTab === 'bracket' && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                    Fase II — Cuadro
                  </h2>
                  <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: 16, overflowX: 'auto', marginBottom: 16 }}>
                    <KnockoutBracketView bracket={tournament.bracket} fixedPairs={pairs} players={tournament.players} isEditable={false} />
                  </div>
                  {/* Collapsible bracket round results */}
                  {[...tournament.bracket.rounds].reverse().map(round => {
                    const completedMatches = round.matches.filter(m => m.status === 'completed');
                    if (completedMatches.length === 0) return null;
                    const isOpen = isBracketRoundExpanded(round.name);
                    return (
                      <div key={round.name} style={{ marginBottom: 3, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                        <button onClick={() => toggleBracketRound(round.name)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#fafafa', border: 'none', cursor: 'pointer', color: 'var(--grey-500)' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{round.name} <span style={{ color: 'var(--grey-300)', fontWeight: 400 }}>({completedMatches.length})</span></span>
                          <span style={{ fontSize: 11, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '8px 16px 12px' }}>
                            {completedMatches.map(match => {
                              if (!match.pair1 || !match.pair2) return null;
                              const fp1 = pairs.find(p => p.player1Id === match.pair1![0]);
                              const fp2 = pairs.find(p => p.player1Id === match.pair2![0]);
                              const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : (match.pair1[0] ?? '?');
                              const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : (match.pair2[0] ?? '?');
                              const p1won = (match.pair1Score ?? 0) > (match.pair2Score ?? 0);
                              const p2won = (match.pair2Score ?? 0) > (match.pair1Score ?? 0);
                              return (
                                <div key={match.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                      <span style={{ fontWeight: p1won ? 700 : 400, color: p1won ? 'var(--black)' : 'var(--grey-500)' }}>{p1won ? '▶ ' : ''}{n1}</span>
                                      <span style={{ fontWeight: p2won ? 700 : 400, color: p2won ? 'var(--black)' : 'var(--grey-400)' }}>{p2won ? '▶ ' : ''}{n2}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, minWidth: 64 }}>
                                      {match.sets && match.sets.length > 0 ? (
                                        match.sets.map((s, si) => (
                                          <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{ fontSize: 9, color: 'var(--grey-300)' }}>S{si + 1}</span>
                                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.p1 > s.p2 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p1}</span>
                                            <span style={{ color: 'var(--grey-300)' }}>–</span>
                                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.p2 > s.p1 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p2}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{match.pair1Score} – {match.pair2Score}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* BRACKET section — for pure Knockout format (no group stage) */}
          {!tournament.groups && tournament.bracket && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>CUADRO</h2>
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: 16, overflowX: 'auto', marginBottom: 12 }}>
                <KnockoutBracketView bracket={tournament.bracket} fixedPairs={pairs} players={tournament.players} isEditable={false} />
              </div>
              {[...tournament.bracket.rounds].reverse().map(round => {
                const completedMatches = round.matches.filter(m => m.status === 'completed');
                if (completedMatches.length === 0) return null;
                const isOpen = isBracketRoundExpanded(round.name);
                return (
                  <div key={round.name} style={{ marginBottom: 3, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                    <button onClick={() => toggleBracketRound(round.name)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#fafafa', border: 'none', cursor: 'pointer', color: 'var(--grey-500)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{round.name} <span style={{ color: 'var(--grey-300)', fontWeight: 400 }}>({completedMatches.length})</span></span>
                      <span style={{ fontSize: 11, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '8px 16px 12px' }}>
                        {completedMatches.map(match => {
                          if (!match.pair1 || !match.pair2) return null;
                          const fp1 = pairs.find(p => p.player1Id === match.pair1![0]);
                          const fp2 = pairs.find(p => p.player1Id === match.pair2![0]);
                          const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : (match.pair1[0] ?? '?');
                          const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : (match.pair2[0] ?? '?');
                          const p1won = (match.pair1Score ?? 0) > (match.pair2Score ?? 0);
                          const p2won = (match.pair2Score ?? 0) > (match.pair1Score ?? 0);
                          return (
                            <div key={match.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <span style={{ fontWeight: p1won ? 700 : 400, color: p1won ? 'var(--black)' : 'var(--grey-500)' }}>{p1won ? '▶ ' : ''}{n1}</span>
                                  <span style={{ fontWeight: p2won ? 700 : 400, color: p2won ? 'var(--black)' : 'var(--grey-400)' }}>{p2won ? '▶ ' : ''}{n2}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, minWidth: 64 }}>
                                  {match.sets && match.sets.length > 0 ? (
                                    match.sets.map((s, si) => (
                                      <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 9, color: 'var(--grey-300)' }}>S{si + 1}</span>
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.p1 > s.p2 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p1}</span>
                                        <span style={{ color: 'var(--grey-300)' }}>–</span>
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.p2 > s.p1 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p2}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{match.pair1Score} – {match.pair2Score}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* CLASIFICACIÓN */}
          {tournament.standings.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                {isFinished ? 'CLASIFICACIÓN FINAL' : 'CLASIFICACIÓN'}
              </h2>
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e8e8e8' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: 40, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>#</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>JUGADOR</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>PJ</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>G</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>PTS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>% VICTORIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.standings.map((s, i) => {
                      const isMe = currentUserId != null && s.playerId === currentUserId;
                      return (
                        <tr key={s.playerId} style={{ borderBottom: '1px solid #f0f0f0', background: isMe ? 'rgba(214,255,0,0.06)' : '#fff' }}>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {i === 0 ? (
                              <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: '#e8a000', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>1</span>
                            ) : i === 1 ? (
                              <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: '#9e9e9e', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>2</span>
                            ) : i === 2 ? (
                              <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: '#a0522d', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>3</span>
                            ) : (
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-400)' }}>{i + 1}</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500 }}>
                              {getPairLabel(s.playerId)}
                              {isMe && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>}
                            </div>
                            {getPairSub(s.playerId) && (
                              <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 1 }}>{getPairSub(s.playerId)}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--grey-500)' }}>{s.played}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{s.wins}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{s.pts}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: winPct(s) >= 50 ? 'var(--turf-green)' : 'var(--grey-400)' }}>
                            {winPct(s)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Players list (pending/open) */}
          {(isPending || isLive) && (
            <div style={{ marginBottom: 32 }}>
              {tournament.pairType === 'parejas' && pairs.length > 0 ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                    EQUIPOS <span style={{ fontSize: 16, color: 'var(--grey-400)', fontWeight: 400 }}>{pairs.length}/{Math.floor(tournament.maxPlayers / 2)}</span>
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
                    {pairs.map((fp, i) => {
                      const isCreatorPair = fp.player1Id === tournament.creatorId || fp.player2Id === tournament.creatorId;
                      const label = fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`;
                      return (
                        <div key={fp.pairIndex} style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: isCreatorPair ? 700 : 500 }}>{label}</div>
                            {fp.name?.trim() && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{fp.player1Name} / {fp.player2Name}</div>}
                            {isCreatorPair && <div style={{ fontSize: 9, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Organizador</div>}
                          </div>
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, Math.floor(tournament.maxPlayers / 2) - pairs.length) }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '1px dashed #e0e0e0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px dashed #d0d0d0', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#bbb' }}>Disponible</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                    JUGADORES <span style={{ fontSize: 16, color: 'var(--grey-400)', fontWeight: 400 }}>{tournament.players.length}/{tournament.maxPlayers}</span>
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
                    {tournament.players.map(p => (
                      <div key={p.id} style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: p.isCreator ? 700 : 500 }}>{p.name}</div>
                          {p.isCreator && <div style={{ fontSize: 9, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Organizador</div>}
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, tournament.maxPlayers - tournament.players.length) }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '1px dashed #e0e0e0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px dashed #d0d0d0', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#bbb' }}>Disponible</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ position: isDesktop ? 'sticky' : 'static', top: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* QR section */}
          <div style={{ background: '#1a1a2e', color: '#fff', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ padding: 8, background: '#fff', borderRadius: 4 }}>
                <QRCodeSVG
                  value={typeof window !== 'undefined' ? `${window.location.origin}/tournament/${tournament.code}` : `https://padelmgt.com/tournament/${tournament.code}`}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#0a0f1e"
                  level="M"
                />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>ÚNETE CON QR</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Escanea para unirte a este torneo desde tu móvil</div>
          </div>

          {/* Join / Status block */}
          {isPending && (
            <div>
              {isFull ? (
                <div style={{ background: 'var(--neon)', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4, color: 'var(--black)' }}>TORNEO COMPLETO</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', marginBottom: 14 }}>Podés unirte a la lista de espera</div>
                  {myRequest || requestSent ? (
                    <div style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.08)', color: 'var(--black)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ✓ En lista de espera
                    </div>
                  ) : (
                    <button onClick={handleJoinRequest} disabled={!currentUserId} style={{ width: '100%', padding: '12px', background: 'var(--black)', color: '#fff', border: 'none', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: currentUserId ? 'pointer' : 'not-allowed', opacity: currentUserId ? 1 : 0.5 }}>
                      {currentUserId ? 'Lista de Espera' : 'Iniciá sesión para unirte'}
                    </button>
                  )}
                </div>
              ) : isEnrolled ? (
                <div style={{ background: 'rgba(30,170,82,0.1)', border: '1px solid rgba(30,170,82,0.3)', padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--turf-green)' }}>✓ Ya estás inscrito</div>
                </div>
              ) : myRequest?.status === 'approved' ? (
                <div style={{ background: 'rgba(30,170,82,0.1)', border: '1px solid rgba(30,170,82,0.3)', padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--turf-green)' }}>✓ ¡Solicitud aprobada!</div>
                </div>
              ) : myRequest?.status === 'rejected' ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>✗ Solicitud rechazada</div>
                </div>
              ) : (requestSent || myRequest?.status === 'pending') ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>⏳ Solicitud enviada</div>
                  <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>Esperando aprobación</div>
                </div>
              ) : currentUserId ? (
                <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
                  <button
                    onClick={handleJoinRequest}
                    style={{ width: '100%', padding: '12px', background: 'var(--black)', color: '#fff', border: 'none', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
                    Solicitar inscripción →
                  </button>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e8e8e8', textAlign: 'center' }}>
                  <Link href="/login" style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Iniciar sesión para inscribirse →
                  </Link>
                </div>
              )}
            </div>
          )}

          {isLive && (
            <div style={{ padding: '14px 20px', background: 'rgba(214,255,0,0.08)', border: '1px solid rgba(214,255,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon)', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--neon)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>En Vivo · Actualiza cada 5s</span>
            </div>
          )}

          {/* Details block */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderTop: 'none', padding: '20px 24px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 14 }}>DETALLES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Fecha',   value: tournament.date + (tournament.time ? ` · ${tournament.time}` : '') },
                { label: 'Club',    value: tournament.club },
                { label: 'Ciudad',  value: tournament.city },
                { label: 'Formato', value: FORMAT_LABEL[tournament.format] ?? tournament.format },
                { label: 'Score',   value: scoreConfigLabel(tournament.scoreConfig) },
                { label: 'Rondas',  value: `${tournament.rounds.length > 0 ? tournament.rounds.length : '—'}` },
              ].filter(d => d.value).map(d => (
                <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--grey-400)', fontWeight: 600, flexShrink: 0 }}>{d.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', color: 'var(--black)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Format guide link */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderTop: 'none', padding: '16px 24px' }}>
            <Link href={`/tournaments/${tournament.format}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'var(--black)' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 3 }}>GUÍA DEL FORMATO</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  CÓMO FUNCIONA {(FORMAT_LABEL[tournament.format] ?? tournament.format).toUpperCase()}
                </div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--grey-400)' }}>→</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
