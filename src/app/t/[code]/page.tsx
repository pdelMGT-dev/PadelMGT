'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getTournamentByCode, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import { submitJoinRequest, getMyJoinRequest, syncMyJoinRequestFromSupabase, type JoinRequest } from '@/lib/join-request-store';
import { getFamilyMembers, RELATION_LABELS, type FamilyMember } from '@/lib/family-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import KnockoutBracketView from '@/components/KnockoutBracketView';
import WorldCupBracketView from '@/components/WorldCupBracketView';
import MatchSetResult from '@/components/MatchSetResult';
import { fetchTournamentByCode } from '@/lib/supabase';

// Choose the bracket renderer: World Cup uses the FIFA-style mirrored view.
function BracketView(props: React.ComponentProps<typeof KnockoutBracketView> & { format?: string }) {
  const { format, ...rest } = props;
  return format === 'world_cup' ? <WorldCupBracketView {...rest} /> : <KnockoutBracketView {...rest} />;
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  created:       { label: 'Inscripciones abiertas', color: '#a78bfa' },
  starting_soon: { label: 'Por Empezar',             color: '#f5a623' },
  live:          { label: 'En Vivo',                  color: 'var(--neon)' },
  finished:      { label: 'Finalizado',               color: 'rgba(255,255,255,0.5)' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

interface TournamentSnap {
  id?: string;
  n: string; cl: string; ci: string; co: string;
  st: string; p: number; mp: number;
  fmt: string; pt: string; lv: string; d: string;
}

export default function PublicTournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user: currentUser } = useCurrentUser();

  const [tournament, setTournament] = useState<Tournament | null>(() =>
    typeof window !== 'undefined' ? getTournamentByCode(code) : null
  );
  const [snap, setSnap] = useState<TournamentSnap | null>(null);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [joinName, setJoinName] = useState('');
  const [joinSent, setJoinSent] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [sbLoading, setSbLoading] = useState(false);

  // Family-member inscription (only when the organizer enabled it)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [familyJoinSent, setFamilyJoinSent] = useState(false);
  const [familyJoinError, setFamilyJoinError] = useState('');

  // New state for tabs, display mode, and last-updated timestamp
  const [activeTab, setActiveTab] = useState<'groups' | 'bracket'>('groups');
  const [displayMode, setDisplayMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  // Collapsible round state: keyed by "groupId_roundNum" or bracket round name
  const [expandedGroupRounds, setExpandedGroupRounds] = useState<Record<string, boolean>>({});
  const [expandedBracketRounds, setExpandedBracketRounds] = useState<Record<string, boolean>>({});

  function toggleGroupRound(groupId: string, roundNum: number) {
    const key = `${groupId}_${roundNum}`;
    setExpandedGroupRounds(prev => ({ ...prev, [key]: !prev[key] }));
  }
  function isGroupRoundExpanded(groupId: string, roundNum: number) {
    const key = `${groupId}_${roundNum}`;
    // Default: expanded (undefined = true)
    return expandedGroupRounds[key] !== false;
  }
  function toggleBracketRound(name: string) {
    setExpandedBracketRounds(prev => ({ ...prev, [name]: !prev[name] }));
  }
  function isBracketRoundExpanded(name: string) {
    return expandedBracketRounds[name] !== false;
  }

  useEffect(() => {
    setShareUrl(window.location.href);
    const sp = new URLSearchParams(window.location.search).get('s');
    if (sp) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(sp)))) as TournamentSnap;
        setSnap(decoded);
      } catch {}
    }
  }, []);

  // Fetch from Supabase when not found in localStorage (cross-device share)
  useEffect(() => {
    const local = getTournamentByCode(code);
    if (local) return; // already have it
    setSbLoading(true);
    fetchTournamentByCode(code)
      .then(raw => {
        if (!raw) return;
        const t = raw as unknown as Tournament;
        saveTournament(t); // cache locally for future loads
        setTournament(t);
      })
      .finally(() => setSbLoading(false));
  }, [code]);

  useEffect(() => {
    const load = () => {
      const t = getTournamentByCode(code);
      setTournament(t);
      if (currentUser && t) {
        // Check Supabase for status updates from the creator on another device
        syncMyJoinRequestFromSupabase(t.id, currentUser.id)
          .then(req => setMyRequest(req))
          .catch(() => setMyRequest(getMyJoinRequest(t.id, currentUser.id)));
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code, currentUser?.id]);

  // 10-second polling: re-read from localStorage or fall back to Supabase
  useEffect(() => {
    const interval = setInterval(() => {
      const local = getTournamentByCode(code);
      if (local) {
        setTournament(local);
        setLastUpdated(new Date());
      } else if (typeof window !== 'undefined') {
        fetchTournamentByCode(code).then(raw => {
          if (raw) {
            const t = raw as unknown as Tournament;
            saveTournament(t);
            setTournament(t);
            setLastUpdated(new Date());
          }
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [code]);

  // Load the guardian's family members when logged in.
  useEffect(() => {
    if (currentUser) setFamilyMembers(getFamilyMembers(currentUser.id));
    else setFamilyMembers([]);
  }, [currentUser?.id]);

  function handleJoin(entityId: string) {
    if (!currentUser) return;
    const name = (joinName.trim() || currentUser.name || '').trim();
    if (!name) { setJoinError('Ingresá tu nombre'); return; }
    submitJoinRequest(entityId, 'tournament', currentUser.id, name, currentUser.email);
    setJoinSent(true);
    setJoinError('');
  }

  function handleJoinFamily(entityId: string) {
    if (!currentUser) return;
    const member = familyMembers.find(m => m.id === selectedFamilyId);
    if (!member) { setFamilyJoinError('Elegí un familiar'); return; }
    submitJoinRequest(entityId, 'tournament', member.id, member.fullName, undefined, {
      isFamilyMember: true,
      guardianId: currentUser.id,
      guardianName: currentUser.name,
      familyMemberId: member.id,
    });
    setFamilyJoinSent(true);
    setFamilyJoinError('');
  }

  const t = tournament;
  const si = t ? (STATUS_INFO[t.status] ?? { label: t.status, color: '#fff' }) : null;
  const filled = t ? t.players.length >= t.maxPlayers : (snap ? snap.p >= snap.mp : false);
  const canJoin = t ? t.status === 'created' && !filled : (snap ? snap.st === 'created' && !filled : false);

  // ── Full tournament view (found in localStorage) ──────────────────────────
  if (t) {
    return (
      <>
        {/* ── DISPLAY MODE OVERLAY ── */}
        {displayMode && (() => {
          const pairs = t.fixedPairs ?? [];
          return (
            <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', color: '#fff', zIndex: 9999, overflowY: 'auto', fontFamily: 'var(--font-body)' }}>
              {/* Display header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Torneo en vivo</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {/* Tab switcher */}
                  {t.groups && (
                    <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.08)', padding: 3 }}>
                      {(['groups', 'bracket'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                          padding: '7px 18px', border: 'none', background: activeTab === tab ? '#fff' : 'transparent',
                          color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s',
                        }}>
                          {tab === 'groups' ? '📊 Grupos' : '🏆 Bracket'}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>
                    <div>Actualizado</div>
                    <div>{lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                  <button onClick={() => setDisplayMode(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ✕ Salir
                  </button>
                </div>
              </div>

              {/* Display content */}
              <div style={{ padding: '32px 40px' }}>
                {/* GROUP STANDINGS in display mode */}
                {t.groups && (activeTab === 'groups' || !t.bracket) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                    {t.groups.groups.map(group => {
                      const completedGroupMatches = group.matches.filter(m => m.status === 'completed');
                      const byRoundDisp: Record<number, typeof completedGroupMatches> = {};
                      completedGroupMatches.forEach(m => {
                        const r = (m as any).roundNum ?? 1;
                        if (!byRoundDisp[r]) byRoundDisp[r] = [];
                        byRoundDisp[r].push(m);
                      });
                      const roundNumsDisp = Object.keys(byRoundDisp).map(Number).sort((a, b) => a - b);
                      return (
                        <div key={group.id} style={{ border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon, #d9ff4f)' }}>
                            {group.name}
                          </div>
                          <div style={{ padding: '12px 16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Equipo</th>
                                  <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600, fontSize: 10 }}>PJ</th>
                                  <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600, fontSize: 10 }}>PG</th>
                                  <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600, fontSize: 10 }}>SF</th>
                                  <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600, fontSize: 10 }}>SC</th>
                                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, fontSize: 10 }}>PTS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.standings.map((s, i) => {
                                  const advancing = i < (t.knockoutConfig?.teamsAdvancing ?? 1);
                                  const fp = pairs.find(p => p.player1Id === s.playerId);
                                  const teamName = fp ? (fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`) : s.playerName;
                                  return (
                                    <tr key={s.playerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                      <td style={{ padding: '8px 0', fontWeight: advancing ? 700 : 400, fontSize: 14, color: advancing ? 'var(--neon, #d9ff4f)' : '#fff' }}>
                                        {advancing ? '↑ ' : ''}{teamName}
                                      </td>
                                      <td style={{ textAlign: 'center', padding: '8px 4px', color: 'rgba(255,255,255,0.6)' }}>{s.played}</td>
                                      <td style={{ textAlign: 'center', padding: '8px 4px', color: 'rgba(255,255,255,0.6)' }}>{s.wins}</td>
                                      <td style={{ textAlign: 'center', padding: '8px 4px', color: 'rgba(255,255,255,0.6)' }}>{s.pointsFor}</td>
                                      <td style={{ textAlign: 'center', padding: '8px 4px', color: 'rgba(255,255,255,0.6)' }}>{s.pointsAgainst}</td>
                                      <td style={{ textAlign: 'right', padding: '8px 0', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: advancing ? 'var(--neon, #d9ff4f)' : '#fff' }}>{s.pts}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {/* Collapsible rounds in display mode */}
                            {roundNumsDisp.length > 0 && (
                              <div style={{ marginTop: 14 }}>
                                {roundNumsDisp.map(roundNum => {
                                  const rMatches = byRoundDisp[roundNum];
                                  const isOpen = isGroupRoundExpanded(group.id, roundNum);
                                  return (
                                    <div key={roundNum} style={{ marginBottom: 4, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                      <button onClick={() => toggleGroupRound(group.id, roundNum)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ronda {roundNum}</span>
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                                      </button>
                                      {isOpen && (
                                        <div style={{ padding: '4px 12px 10px' }}>
                                          {rMatches.map(match => {
                                            const fp1 = pairs.find(p => p.player1Id === match.pair1[0]);
                                            const fp2 = pairs.find(p => p.player1Id === match.pair2[0]);
                                            const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : match.pair1[0];
                                            const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : match.pair2[0];
                                            return (
                                              <MatchSetResult
                                                key={match.courtNum}
                                                header={`Cancha ${match.courtNum}`}
                                                pair1Label={n1}
                                                pair2Label={n2}
                                                sets={match.sets}
                                                pair1Score={match.pair1Score}
                                                pair2Score={match.pair2Score}
                                                style={{ marginBottom: 4 }}
                                              />
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BRACKET in display mode */}
                {t.bracket && (activeTab === 'bracket' || !t.groups) && (() => {
                  const dispPairs = t.fixedPairs ?? [];
                  return (
                    <div>
                      {t.groups && (
                        <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                          Fase II — Bracket
                        </div>
                      )}
                      {/* White container for bracket (component uses light colors) */}
                      <div style={{ background: '#fff', padding: 24, overflow: 'auto' }}>
                        <BracketView
                          format={t.format}
                          bracket={t.bracket}
                          fixedPairs={dispPairs}
                          players={t.players}
                          isEditable={false}
                        />
                      </div>
                      {/* Collapsible bracket round details in display mode */}
                      <div style={{ marginTop: 20 }}>
                        {[...t.bracket.rounds].reverse().map(round => {
                          const completedMatches = round.matches.filter(m => m.status === 'completed');
                          if (completedMatches.length === 0) return null;
                          const isOpen = isBracketRoundExpanded(round.name);
                          return (
                            <div key={round.name} style={{ marginBottom: 4, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                              <button onClick={() => toggleBracketRound(round.name)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{round.name}</span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                              </button>
                              {isOpen && (
                                <div style={{ padding: '8px 16px 14px' }}>
                                  {completedMatches.map(match => {
                                    if (!match.pair1 || !match.pair2) return null;
                                    const fp1 = dispPairs.find(p => p.player1Id === match.pair1![0]);
                                    const fp2 = dispPairs.find(p => p.player1Id === match.pair2![0]);
                                    const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : (match.pair1[0] ?? '?');
                                    const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : (match.pair2[0] ?? '?');
                                    return (
                                      <MatchSetResult
                                        key={match.id}
                                        header={round.name}
                                        pair1Label={n1}
                                        pair2Label={n2}
                                        sets={match.sets}
                                        pair1Score={match.pair1Score}
                                        pair2Score={match.pair2Score}
                                        size="md"
                                        style={{ marginBottom: 4 }}
                                      />
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
                })()}
              </div>
            </div>
          );
        })()}

        {/* ── NORMAL PAGE ── */}
        {!displayMode && (
          <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'var(--font-body)' }}>
            {/* Existing page header */}
            <div style={{ position: 'relative', background: '#0a0f1e', padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,48px) clamp(32px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
                <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>← Torneos</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ padding: '5px 14px', borderRadius: 30, border: `1px solid ${si?.color ?? '#fff'}`, color: si?.color ?? '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {si?.label ?? t.status}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{code}</span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(36px, 6vw, 80px)', lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 16px', color: '#fff' }}>{t.name}</h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{[t.date, t.time, t.club, t.city].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', padding: '0 clamp(20px,5vw,48px)' }}>
                {[
                  { label: 'Formato', value: FORMAT_LABEL[t.format] ?? t.format },
                  { label: 'Modalidad', value: t.pairType === 'individual' ? 'Individual' : 'Parejas' },
                  { label: 'Nivel', value: t.levelLabel || 'Todos los niveles' },
                  { label: 'Jugadores', value: `${t.players.length} / ${t.maxPlayers}` },
                  { label: 'Canchas', value: String(t.courts) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '20px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab bar + Pantalla button */}
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 clamp(20px,5vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 0 }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {t.groups && (
                  <>
                    {(['groups', 'bracket'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                        borderBottom: activeTab === tab ? '2px solid var(--neon, #d9ff4f)' : '2px solid transparent',
                      }}>
                        {tab === 'groups' ? '📊 Grupos' : '🏆 Bracket'}
                      </button>
                    ))}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  ↻ {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => setDisplayMode(true)}
                  style={{ padding: '8px 16px', background: 'var(--neon, #d9ff4f)', color: '#000', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  📺 Pantalla
                </button>
              </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px clamp(20px,5vw,48px) 80px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
              <div>
                {/* Players confirmed block */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 24, marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Jugadores confirmados</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff' }}>{t.players.length}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/{t.maxPlayers}</span></span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (t.players.length / t.maxPlayers) * 100)}%`, background: 'var(--neon)', transition: 'width 0.3s' }} />
                  </div>
                  {t.players.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                      {t.players.map(p => (
                        <span key={p.id} style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{p.name}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tab content: GROUPS */}
                {(() => {
                  const pairs = t.fixedPairs ?? [];

                  if (t.groups && (activeTab === 'groups' || !t.bracket)) {
                    return (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                          Fase I — Grupos
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                          {t.groups.groups.map(group => (
                            <div key={group.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                              <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.08)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>{group.name}</div>
                              <div style={{ padding: '12px 16px' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Tabla</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                  <thead>
                                    <tr style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                      <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600, fontSize: 9, textTransform: 'uppercase' }}>Equipo</th>
                                      <th style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 600, fontSize: 9 }}>PJ</th>
                                      <th style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 600, fontSize: 9 }}>PG</th>
                                      <th style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 600, fontSize: 9 }}>SF</th>
                                      <th style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 600, fontSize: 9 }}>SC</th>
                                      <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600, fontSize: 9 }}>PTS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.standings.map((s, i) => {
                                      const advancing = i < (t.knockoutConfig?.teamsAdvancing ?? 1);
                                      const fp = pairs.find(p => p.player1Id === s.playerId);
                                      const teamName = fp ? (fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`) : s.playerName;
                                      return (
                                        <tr key={s.playerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                          <td style={{ padding: '5px 0', fontWeight: advancing ? 700 : 400, fontSize: 12, color: advancing ? 'var(--neon, #d9ff4f)' : 'rgba(255,255,255,0.85)' }}>
                                            {advancing ? '↑ ' : ''}{teamName}
                                          </td>
                                          <td style={{ textAlign: 'center', padding: '5px 3px', color: 'rgba(255,255,255,0.5)' }}>{s.played}</td>
                                          <td style={{ textAlign: 'center', padding: '5px 3px', color: 'rgba(255,255,255,0.5)' }}>{s.wins}</td>
                                          <td style={{ textAlign: 'center', padding: '5px 3px', color: 'rgba(255,255,255,0.5)' }}>{s.pointsFor}</td>
                                          <td style={{ textAlign: 'center', padding: '5px 3px', color: 'rgba(255,255,255,0.5)' }}>{s.pointsAgainst}</td>
                                          <td style={{ textAlign: 'right', padding: '5px 0', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.pts}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>

                                {/* Completed matches grouped by round — collapsible */}
                                {(() => {
                                  const completedMatches = group.matches.filter(m => m.status === 'completed');
                                  if (completedMatches.length === 0) return null;
                                  // Group by roundNum (default 1)
                                  const byRound: Record<number, typeof completedMatches> = {};
                                  completedMatches.forEach(m => {
                                    const r = (m as any).roundNum ?? 1;
                                    if (!byRound[r]) byRound[r] = [];
                                    byRound[r].push(m);
                                  });
                                  const roundNums = Object.keys(byRound).map(Number).sort((a, b) => a - b);
                                  return (
                                    <div style={{ marginTop: 12 }}>
                                      {roundNums.map(roundNum => {
                                        const rMatches = byRound[roundNum];
                                        const isOpen = isGroupRoundExpanded(group.id, roundNum);
                                        return (
                                          <div key={roundNum} style={{ marginBottom: 4, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                            <button
                                              onClick={() => toggleGroupRound(group.id, roundNum)}
                                              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}
                                            >
                                              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ronda {roundNum} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({rMatches.length} partido{rMatches.length !== 1 ? 's' : ''})</span></span>
                                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                                            </button>
                                            {isOpen && (
                                              <div style={{ padding: '4px 10px 8px' }}>
                                                {rMatches.map(match => {
                                                  const fp1 = pairs.find(p => p.player1Id === match.pair1[0]);
                                                  const fp2 = pairs.find(p => p.player1Id === match.pair2[0]);
                                                  const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : match.pair1[0];
                                                  const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : match.pair2[0];
                                                  return (
                                                    <MatchSetResult
                                                      key={match.courtNum}
                                                      header={`Cancha ${match.courtNum}`}
                                                      pair1Label={n1}
                                                      pair2Label={n2}
                                                      sets={match.sets}
                                                      pair1Score={match.pair1Score}
                                                      pair2Score={match.pair2Score}
                                                      style={{ marginBottom: 4 }}
                                                    />
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Tab content: BRACKET
                  if (t.bracket && (activeTab === 'bracket' || !t.groups)) {
                    const bracketRoundDetails = (
                      <div style={{ marginTop: 20 }}>
                        {[...t.bracket.rounds].reverse().map(round => {
                          const completedMatches = round.matches.filter(m => m.status === 'completed');
                          if (completedMatches.length === 0) return null;
                          const isOpen = isBracketRoundExpanded(round.name);
                          return (
                            <div key={round.name} style={{ marginBottom: 4, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <button
                                onClick={() => toggleBracketRound(round.name)}
                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#fff' }}
                              >
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{round.name} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({completedMatches.length} partido{completedMatches.length !== 1 ? 's' : ''})</span></span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                              </button>
                              {isOpen && (
                                <div style={{ padding: '8px 14px 12px' }}>
                                  {completedMatches.map(match => {
                                    if (!match.pair1 || !match.pair2) return null;
                                    const fp1 = pairs.find(p => p.player1Id === match.pair1![0]);
                                    const fp2 = pairs.find(p => p.player1Id === match.pair2![0]);
                                    const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : (match.pair1[0] ?? '?');
                                    const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : (match.pair2[0] ?? '?');
                                    return (
                                      <MatchSetResult
                                        key={match.id}
                                        header={round.name}
                                        pair1Label={n1}
                                        pair2Label={n2}
                                        sets={match.sets}
                                        pair1Score={match.pair1Score}
                                        pair2Score={match.pair2Score}
                                        style={{ marginBottom: 4 }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                    return (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                          {t.knockoutConfig?.hasGroups ? 'Fase II — Cuadro' : 'Cuadro de Eliminatorias'}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
                          <BracketView
                            format={t.format}
                            bracket={t.bracket}
                            fixedPairs={pairs}
                            players={t.players}
                            isEditable={false}
                          />
                        </div>
                        {bracketRoundDetails}
                      </div>
                    );
                  }

                  // No groups, no bracket (non-knockout formats): bracket-only check
                  if (!t.groups && t.bracket) {
                    const bracketRoundDetails2 = (
                      <div style={{ marginTop: 20 }}>
                        {[...t.bracket.rounds].reverse().map(round => {
                          const completedMatches = round.matches.filter(m => m.status === 'completed');
                          if (completedMatches.length === 0) return null;
                          const isOpen = isBracketRoundExpanded(round.name);
                          return (
                            <div key={round.name} style={{ marginBottom: 4, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <button
                                onClick={() => toggleBracketRound(round.name)}
                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#fff' }}
                              >
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{round.name} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({completedMatches.length} partido{completedMatches.length !== 1 ? 's' : ''})</span></span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                              </button>
                              {isOpen && (
                                <div style={{ padding: '8px 14px 12px' }}>
                                  {completedMatches.map(match => {
                                    if (!match.pair1 || !match.pair2) return null;
                                    const fp1 = pairs.find(p => p.player1Id === match.pair1![0]);
                                    const fp2 = pairs.find(p => p.player1Id === match.pair2![0]);
                                    const n1 = fp1 ? (fp1.name?.trim() || `${fp1.player1Name} / ${fp1.player2Name}`) : (match.pair1[0] ?? '?');
                                    const n2 = fp2 ? (fp2.name?.trim() || `${fp2.player1Name} / ${fp2.player2Name}`) : (match.pair2[0] ?? '?');
                                    return (
                                      <MatchSetResult
                                        key={match.id}
                                        header={round.name}
                                        pair1Label={n1}
                                        pair2Label={n2}
                                        sets={match.sets}
                                        pair1Score={match.pair1Score}
                                        pair2Score={match.pair2Score}
                                        style={{ marginBottom: 4 }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                    return (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                          Cuadro de Eliminatorias
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
                          <BracketView
                            format={t.format}
                            bracket={t.bracket}
                            fixedPairs={pairs}
                            players={t.players}
                            isEditable={false}
                          />
                        </div>
                        {bracketRoundDetails2}
                      </div>
                    );
                  }

                  return null;
                })()}

                {canJoin && (
                  currentUser ? (
                    myRequest || joinSent ? (
                      <div style={{ background: 'rgba(214,255,0,0.08)', border: '1px solid rgba(214,255,0,0.3)', padding: '20px 24px' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon)', marginBottom: 4 }}>✓ Solicitud enviada</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>El organizador confirmará tu inscripción.</div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Unirte a este torneo</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder={currentUser.name} style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }} />
                          <button onClick={() => handleJoin(t.id)} style={{ padding: '10px 24px', background: 'var(--neon)', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Solicitar</button>
                        </div>
                        {joinError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{joinError}</div>}
                      </div>
                    )
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Querés unirte?</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Iniciá sesión para solicitar unirte al torneo.</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="btn btn-on-dark">Iniciar sesión →</Link>
                        <Link href="/register" className="btn btn-outline-dark">Crear cuenta</Link>
                      </div>
                    </div>
                  )
                )}
                {/* Family-member inscription — only when organizer enabled it and the guardian is logged in */}
                {canJoin && currentUser && t.acceptsFamilyMembers && (
                  <div style={{ marginTop: 16, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.3)', padding: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Inscribir a un familiar</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>Inscribí a un familiar menor sin cuenta propia.</div>
                    {familyJoinSent ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon)' }}>✓ Solicitud del familiar enviada. El organizador la confirmará.</div>
                    ) : familyMembers.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                        No tenés familiares registrados. Añadilos en tu perfil → Familia.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={selectedFamilyId}
                            onChange={e => setSelectedFamilyId(e.target.value)}
                            style={{ flex: 1, minWidth: 180, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }}
                          >
                            <option value="">Elegí un familiar…</option>
                            {familyMembers.map(m => (
                              <option key={m.id} value={m.id} style={{ color: '#000' }}>
                                {m.fullName} — {RELATION_LABELS[m.relationType]} ({m.id})
                              </option>
                            ))}
                          </select>
                          <button onClick={() => handleJoinFamily(t.id)} style={{ padding: '10px 20px', background: 'var(--neon)', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Solicitar inscripción del familiar</button>
                        </div>
                        {familyJoinError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{familyJoinError}</div>}
                      </>
                    )}
                  </div>
                )}
                {!canJoin && t.status !== 'created' && (
                  <div style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {t.status === 'finished' ? 'Este torneo ya finalizó.' : t.status === 'live' ? 'Este torneo está en juego.' : 'Cupos completos.'}
                  </div>
                )}
              </div>

              <div style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 24, textAlign: 'center' }}>
                  <QRCodeSVG value={shareUrl || `https://padelmgt.com/t/${code}`} size={160} style={{ marginBottom: 16 }} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all', marginBottom: 16 }}>{shareUrl}</div>
                  <button onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Copiar link</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Snapshot view (cross-device) ──────────────────────────────────────────
  if (!t && snap) {
    const si2 = STATUS_INFO[snap.st] ?? { label: snap.st, color: '#fff' };
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'var(--font-body)' }}>
        <div style={{ position: 'relative', background: '#0a0f1e', padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,48px) clamp(32px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
            <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>← Torneos</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ padding: '5px 14px', borderRadius: 30, border: `1px solid ${si2.color}`, color: si2.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{si2.label}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{code}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(36px, 6vw, 80px)', lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 16px', color: '#fff' }}>{snap.n}</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{[snap.cl, snap.ci, snap.co, snap.d].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px clamp(20px,5vw,48px) 80px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
            {[
              { label: 'Formato', value: FORMAT_LABEL[snap.fmt] ?? snap.fmt },
              { label: 'Jugadores', value: `${snap.p} / ${snap.mp}` },
              { label: 'Nivel', value: snap.lv || 'Todos los niveles' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            {snap.st === 'created' && snap.p < snap.mp ? (
              currentUser ? (
                joinSent ? (
                  <div style={{ background: 'rgba(214,255,0,0.08)', border: '1px solid rgba(214,255,0,0.3)', padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon)', marginBottom: 4 }}>✓ Solicitud enviada</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>El organizador confirmará tu inscripción.</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Solicitar unirse</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder={currentUser.name} style={{ flex: 1, minWidth: 160, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }} />
                      <button
                        onClick={() => {
                          const name = (joinName.trim() || currentUser.name || '').trim();
                          if (!name) { setJoinError('Ingresá tu nombre'); return; }
                          if (!snap.id) { setJoinError('No se pudo identificar el torneo.'); return; }
                          submitJoinRequest(snap.id, 'tournament', currentUser.id, name, currentUser.email);
                          setJoinSent(true); setJoinError('');
                        }}
                        style={{ padding: '10px 24px', background: 'var(--neon)', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                      >Solicitar</button>
                    </div>
                    {joinError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{joinError}</div>}
                  </div>
                )
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Querés unirte?</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Iniciá sesión para solicitar unirte al torneo.</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="btn btn-on-dark">Iniciar sesión →</Link>
                    <Link href="/register" className="btn btn-outline-dark">Crear cuenta</Link>
                  </div>
                </div>
              )
            ) : (
              <div style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {snap.st === 'finished' ? 'Este torneo ya finalizó.' : snap.p >= snap.mp ? 'Cupos completos.' : 'No disponible.'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading from Supabase ─────────────────────────────────────────────────
  if (sbLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--neon)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cargando torneo…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 12 }}>404</div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Torneo no encontrado o link inválido.</div>
      <Link href="/tournaments" style={{ padding: '12px 24px', background: 'var(--neon)', color: '#000', textDecoration: 'none', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ver torneos</Link>
    </div>
  );
}
