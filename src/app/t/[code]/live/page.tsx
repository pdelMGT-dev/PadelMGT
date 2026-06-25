'use client';

import React, { use, useEffect, useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, MapPin, Search, Clock, Trophy, RefreshCw, Zap, Maximize, Minimize } from 'lucide-react';
import {
  loadPersonalizadoByCode,
  calculateGroupStandings,
  publishedTournamentView,
  type PersonalizadoTournament,
  type PersonalizadoMatch,
  type BracketMatch,
  type PersonalizadoTeam,
} from '@/lib/personalizado-store';
import { TournamentTabs } from '@/app/dashboard/player/tournaments/personalizado/[id]/TournamentTabs';

type AnyMatch = PersonalizadoMatch | BracketMatch;

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', registration_open: 'Inscripción Abierta', configured: 'Configurado',
  live: 'En Vivo', finished: 'Finalizado', cancelled: 'Cancelado',
};

function teamName(t: PersonalizadoTeam | undefined): string {
  if (!t) return 'Por definir';
  return t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name;
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function todayStr(): string { return new Date().toISOString().split('T')[0]; }

function nowTimeStr(): string {
  const n = new Date();
  return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
}

export default function PersonalizadoLivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [query, setQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen toggle (native Fullscreen API)
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const loadData = useCallback(async () => {
    const t = await loadPersonalizadoByCode(code);
    setTournament(t);
    setLastUpdated(new Date());
    setSecondsAgo(0);
    if (loading) setLoading(false);
  }, [code, loading]);

  // Refresh faster while any match is in progress so the live score streams in near real time.
  const liveCount = useMemo(() => {
    const c = tournament?.config;
    if (!c) return 0;
    return (c.matches ?? []).filter(m => m.status === 'playing').length
      + (c.bracketMatches ?? []).filter(m => m.status === 'playing').length;
  }, [tournament]);
  const refreshMs = liveCount > 0 ? 10_000 : 30_000;

  // Auto-refresh: every 10 s while matches are live, 30 s otherwise.
  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, refreshMs);
    return () => clearInterval(iv);
  }, [loadData, refreshMs]);

  // Tick the "hace Xs" counter
  useEffect(() => {
    const iv = setInterval(() => setSecondsAgo(s => s + 1), 1_000);
    return () => clearInterval(iv);
  }, [lastUpdated]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const teamMap = useMemo(() =>
    new Map((tournament?.teams ?? []).map(t => [t.id, t])), [tournament]);

  const catMap = useMemo(() =>
    new Map((tournament?.categories ?? []).map(c => [c.id, c.name])), [tournament]);

  // Public view: schedule positions come from the PUBLISHED snapshot; live results/status are
  // merged on top by id. Everything below reads `view` so unpublished edits stay private.
  const view = useMemo(() => tournament ? publishedTournamentView(tournament) : null, [tournament]);

  const stats = useMemo(() => {
    if (!view?.config) return null;
    const classM = view.config.matches ?? [];
    const bracketM = view.config.bracketMatches ?? [];
    const total = classM.length + bracketM.length;
    const done = classM.filter(m => m.status === 'done').length + bracketM.filter(m => m.status === 'done').length;
    const live = classM.filter(m => m.status === 'playing').length + bracketM.filter(m => m.status === 'playing').length;
    const today = todayStr();
    const todayAll: AnyMatch[] = [
      ...classM.filter(m => m.day === today),
      ...(bracketM.filter(m => m.day === today) as AnyMatch[]),
    ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    return { total, done, live, todayAll, pct: total ? Math.round(done / total * 100) : 0 };
  }, [view]);

  const liveNow = useMemo(() => stats?.todayAll.filter(m => m.status === 'playing') ?? [], [stats]);

  const upcoming = useMemo(() => {
    if (!stats) return [];
    const nt = nowTimeStr();
    const today = todayStr();
    // today's unplayed matches from now on
    const todayUp = stats.todayAll.filter(m => m.status !== 'done' && m.status !== 'playing' && (m.time ?? '') >= nt);
    if (todayUp.length >= 4) return todayUp.slice(0, 8);
    // supplement with next days if today is sparse
    if (!view?.config) return todayUp;
    const rest: AnyMatch[] = [
      ...(view.config.matches ?? []).filter(m => m.day > today && m.status !== 'done'),
      ...(view.config.bracketMatches ?? []).filter(m => (m.day ?? '') > today && m.status !== 'done') as AnyMatch[],
    ].sort((a, b) => {
      const d = (a.day ?? '').localeCompare(b.day ?? '');
      return d !== 0 ? d : (a.time ?? '').localeCompare(b.time ?? '');
    });
    return [...todayUp, ...rest].slice(0, 8);
  }, [stats, view]);

  // Search — shows ALL of a team's published matches (classification + elimination), chronologically.
  const searchResults = useMemo(() => {
    if (!query.trim() || !view?.config) return [];
    const q = norm(query);
    const allClass = view.config.matches ?? [];
    const allBracket = view.config.bracketMatches ?? [];
    return view.teams
      .filter(t => norm(`${t.player1Name} ${t.player2Name ?? ''}`).includes(q))
      .slice(0, 5)
      .map(team => {
        const standing = team.groupId
          ? (() => {
              const rows = calculateGroupStandings(view, team.categoryId, team.groupId);
              const idx = rows.findIndex(r => r.teamId === team.id);
              return idx >= 0 ? { pos: idx + 1, ...rows[idx] } : null;
            })()
          : null;
        const teamMatches: AnyMatch[] = [
          ...allClass.filter(m => m.teamAId === team.id || m.teamBId === team.id),
          ...(allBracket.filter(m => m.teamAId === team.id || m.teamBId === team.id) as AnyMatch[]),
        ].sort((a, b) => {
          const d = (a.day ?? '').localeCompare(b.day ?? '');
          return d !== 0 ? d : (a.time ?? '').localeCompare(b.time ?? '');
        });
        return { team, standing, teamMatches };
      });
  }, [query, view]);

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
        <RefreshCw size={14} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <CalendarDays size={40} style={{ color: 'var(--neon)' }} />
        <div style={{ fontSize: 20, fontWeight: 700 }}>Torneo no encontrado</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>Verificá el código <strong>{code}</strong>.</div>
      </div>
    );
  }

  const liveShareUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${code}/live` : `/t/${code}/live`;
  const totalTeams = tournament.teams.filter(t => t.status === 'confirmed' || t.status === 'pending').length;
  const courtsCount = tournament.config?.courtNames?.length ?? tournament.courts ?? 1;
  const endDate = tournament.config?.schedule?.endDate;
  const dateRange = endDate && endDate !== tournament.date
    ? `${tournament.date} → ${endDate}` : tournament.date;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f2' }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .live-dot { animation: livePulse 1.4s ease-in-out infinite; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0a0a0a', color: '#fff', padding: '36px clamp(16px, 4vw, 48px) 30px' }}>
        <div style={{ width: '100%', margin: '0 auto' }}>

          {/* Title + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}>
                {tournament.name}
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '5px 14px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 7,
                background: tournament.status === 'live' ? 'var(--neon)' : tournament.status === 'finished' ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.08)',
                color: tournament.status === 'live' ? '#0a0a0a' : '#fff',
              }}>
                {tournament.status === 'live' && <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a0a0a', display: 'inline-block' }} />}
                {STATUS_LABELS[tournament.status] ?? tournament.status}
              </span>
            </div>
            {/* Refresh badge + fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 6, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={11} />
                {secondsAgo < 5 ? 'Actualizado' : `Hace ${secondsAgo}s`}
              </div>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                {isFullscreen ? 'Salir' : 'Pantalla completa'}
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
            {tournament.date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={13} /> {dateRange}{tournament.time ? ` · ${tournament.time}` : ''}
              </span>
            )}
            {tournament.locationName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} />
                {tournament.locationName}
                {(tournament.city || tournament.country) ? ` — ${[tournament.city, tournament.country].filter(Boolean).join(', ')}` : ''}
              </span>
            )}
          </div>

          {/* Stats pills + progress bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Categorías', value: tournament.categories.length },
              { label: 'Equipos', value: totalTeams },
              { label: 'Canchas', value: courtsCount },
              { label: 'Partidos', value: stats?.total ?? 0 },
              { label: 'Jugados', value: stats?.done ?? 0 },
              ...(stats && stats.live > 0 ? [{ label: 'En vivo', value: stats.live, accent: true }] : []),
            ].map(s => (
              <div key={s.label} style={{
                borderRadius: 9, padding: '7px 14px', textAlign: 'center',
                background: (s as {accent?: boolean}).accent ? 'var(--neon)' : 'rgba(255,255,255,0.07)',
                minWidth: 64,
              }}>
                <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1, color: (s as {accent?: boolean}).accent ? '#0a0a0a' : '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2, color: (s as {accent?: boolean}).accent ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
            {stats && stats.total > 0 && (
              <div style={{ flex: '1 1 200px', maxWidth: 320, padding: '0 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>
                  <span>Progreso del torneo</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{stats.pct}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${stats.pct}%`, background: 'var(--neon)', borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Live now (shown first so it's the first thing you see) ──── */}
        {liveNow.length > 0 && (
          <section>
            <SectionTitle icon={<Zap size={15} fill="currentColor" style={{ color: 'var(--neon)' }} />} label="En vivo ahora" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {liveNow.map(m => <MatchCard key={m.id} match={m} teamMap={teamMap} catMap={catMap} isLive />)}
            </div>
          </section>
        )}

        {/* ── Public calendar QR ───────────────────────────────────────── */}
        <section>
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#fff', padding: 6, border: '1px solid #eee', borderRadius: 10, flexShrink: 0 }}>
              <QRCodeSVG value={liveShareUrl} size={104} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>Vista pública del calendario</div>
              <div style={{ fontSize: 13, color: '#333', wordBreak: 'break-all', marginBottom: 6, fontWeight: 600 }}>{liveShareUrl}</div>
              <div style={{ fontSize: 12, color: '#999' }}>Los jugadores escanean para ver cuándo y dónde les toca jugar (sin cuenta).</div>
            </div>
          </div>
        </section>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <section>
          <SectionTitle icon={<Search size={14} style={{ color: '#888' }} />} label="Buscar equipo o jugador" />
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Nombre del jugador o equipo…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '13px 16px 13px 42px', fontSize: 15,
                border: '2px solid transparent', borderRadius: 12, outline: 'none',
                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--neon)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
            />
          </div>

          {query.trim() && searchResults.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', textAlign: 'center', color: '#999', fontSize: 13 }}>
              No se encontraron equipos con &ldquo;{query}&rdquo;
            </div>
          )}

          {searchResults.map(({ team, standing, teamMatches }) => {
            const doneM = teamMatches.filter(m => m.status === 'done');
            const recent = doneM.slice(-3);
            return (
            <div key={team.id} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              borderLeft: '4px solid var(--neon)', marginBottom: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{teamName(team)}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {catMap.get(team.categoryId) ?? 'Categoría'}
                    {team.groupId ? ` · Grupo ${team.groupId.split('-G').pop()}` : ''}
                  </div>
                </div>
                {standing && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: standing.pos <= 2 ? 'var(--neon, #d1f000)' : '#222' }}>{standing.pos}°</div>
                    <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>en grupo</div>
                  </div>
                )}
              </div>

              {standing && (
                <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f4f4f4' }}>
                  {[
                    { l: 'PJ', v: standing.pj },
                    { l: 'PG', v: standing.pg },
                    { l: 'PP', v: standing.pp },
                    { l: 'Pts', v: standing.pts, bold: true },
                    { l: 'Dif', v: (standing.diff >= 0 ? '+' : '') + standing.diff },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: s.bold ? 800 : 500, fontSize: s.bold ? 15 : 14 }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: '#bbb' }}>{s.l}</div>
                    </div>
                  ))}
                  {recent.length > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
                      {recent.map(m => {
                        const won = m.result?.winnerId === team.id;
                        return (
                          <span key={m.id} title={won ? 'Victoria' : 'Derrota'} style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: won ? '#22c55e' : '#ef4444', color: '#fff',
                            fontSize: 10, fontWeight: 800,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}>{won ? 'G' : 'P'}</span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* All of this team's scheduled matches (classification + elimination) */}
              {teamMatches.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f4f4f4' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>
                    Todos sus partidos ({teamMatches.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {teamMatches.map(m => {
                      const isElim = 'round' in m;
                      const rivalId = m.teamAId === team.id ? m.teamBId : m.teamAId;
                      const rivalTeam = rivalId ? teamMap.get(rivalId) : undefined;
                      const placeholder = isElim
                        ? (m.teamAId === team.id ? (m as BracketMatch).placeholderB : (m as BracketMatch).placeholderA)
                        : undefined;
                      const rivalName = rivalTeam ? teamName(rivalTeam) : (placeholder ?? 'Por definir');
                      const done = m.status === 'done';
                      const playing = m.status === 'playing';
                      const won = done && m.result?.winnerId === team.id;
                      const accent = isElim ? '#8b5cf6' : '#3b82f6';
                      // Live partial score for a match in progress, shown next to the EN VIVO badge.
                      const liveStr = playing
                        ? (m.liveScore?.sets ?? []).filter(s => s.a != null || s.b != null).map(s => `${s.a ?? '·'}-${s.b ?? '·'}`).join(' ')
                        : '';
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #f7f7f7', fontSize: 12 }}>
                          <div style={{ textAlign: 'center', minWidth: 46, flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#222' }}>{m.time ?? '—'}</div>
                            <div style={{ fontSize: 9, color: '#bbb' }}>{(m.day ?? '').slice(5).replace('-', '/')}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accent }}>
                              {isElim ? (m as BracketMatch).roundLabel : `Gr. ${(m as PersonalizadoMatch).groupLabel}`}
                              {m.courtName ? ` · ${m.courtName}` : ''}
                            </div>
                            <div style={{ fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              vs {rivalName}
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            {done
                              ? <span style={{ fontSize: 11, fontWeight: 800, color: won ? '#16a34a' : '#ef4444' }}>{won ? 'Ganó' : 'Perdió'}{m.result ? ` · ${m.result.walkover ? 'W.O.' : m.result.sets.map(s => `${s.a}-${s.b}`).join(' ')}` : ''}</span>
                              : playing
                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    {liveStr && <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{liveStr}</span>}
                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#16a34a', padding: '2px 7px', borderRadius: 100, letterSpacing: '0.06em' }}>EN VIVO</span>
                                  </span>
                                : <span style={{ fontSize: 10, color: '#aaa' }}>Pautado</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
          })}
        </section>

        {/* ── Upcoming + Categories ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <SectionTitle icon={<Clock size={15} style={{ color: 'var(--neon)' }} />} label="Próximos partidos" small />
              <div>
                {upcoming.map((m, i) => {
                  const isElim = 'round' in m;
                  const a = teamMap.get(m.teamAId ?? '');
                  const b = teamMap.get(m.teamBId ?? '');
                  return (
                    <div key={m.id} style={{
                      display: 'flex', gap: 12, padding: '9px 0',
                      borderBottom: i < upcoming.length - 1 ? '1px solid #f4f4f4' : 'none',
                      fontSize: 12,
                    }}>
                      <div style={{ textAlign: 'center', minWidth: 40, flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#222' }}>{m.time}</div>
                        <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{(m.courtName ?? '').replace('Cancha ', 'C')}</div>
                        {m.day !== todayStr() && (
                          <div style={{ fontSize: 9, color: '#3b82f6', marginTop: 1, fontWeight: 600 }}>
                            {m.day?.slice(5).replace('-', '/')}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isElim ? '#8b5cf6' : '#3b82f6', marginBottom: 3 }}>
                          {catMap.get(m.categoryId) ?? ''}
                          {isElim ? ` · ${(m as BracketMatch).roundLabel}` : (m as PersonalizadoMatch).groupLabel ? ` · Gr. ${(m as PersonalizadoMatch).groupLabel}` : ''}
                        </div>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#111' }}>
                          {a ? teamName(a) : (isElim ? (m as BracketMatch).placeholderA : undefined) ?? 'Por definir'}
                          <span style={{ fontWeight: 400, color: '#bbb' }}> vs </span>
                          {b ? teamName(b) : (isElim ? (m as BracketMatch).placeholderB : undefined) ?? 'Por definir'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category progress */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<Trophy size={15} style={{ color: 'var(--neon)' }} />} label="Categorías" small />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tournament.categories.map(cat => {
                const catTeams = tournament.teams.filter(t => t.categoryId === cat.id && (t.status === 'confirmed' || t.status === 'pending'));
                const classM = (view?.config?.matches ?? []).filter(m => m.categoryId === cat.id);
                const done = classM.filter(m => m.status === 'done').length;
                const pct = classM.length ? Math.round(done / classM.length * 100) : 0;
                const bracketDone = (view?.config?.bracketMatches ?? []).filter(m => m.categoryId === cat.id && m.status === 'done').length;
                const phase = bracketDone > 0 ? 'Eliminatoria' : done === classM.length && classM.length > 0 ? 'Clasificación completa' : 'Clasificación';
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{catTeams.length} equipos · {phase}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#22c55e' : '#555' }}>{pct}%</div>
                    </div>
                    <div style={{ height: 4, background: '#eee', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'var(--neon)', borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Full calendar / standings / bracket tabs ─────────────────── */}
        <TournamentTabs tournament={view ?? tournament} canManage={false} canEditResults={false} onUpdate={setTournament} />
      </div>

      <div style={{ textAlign: 'center', padding: '28px 16px', fontSize: 11, color: '#bbb' }}>
        Vista pública · PadelMGT
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function SectionTitle({ icon, label, small }: { icon: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: small ? 14 : 12 }}>
      {icon}
      <span style={{ fontSize: small ? 12 : 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#333' }}>
        {label}
      </span>
    </div>
  );
}

function MatchCard({
  match, teamMap, catMap, isLive = false,
}: {
  match: AnyMatch;
  teamMap: Map<string, PersonalizadoTeam>;
  catMap: Map<string, string>;
  isLive?: boolean;
}) {
  const isElim = 'round' in match;
  const a = teamMap.get(match.teamAId ?? '');
  const b = teamMap.get(match.teamBId ?? '');
  const bm = match as BracketMatch;

  // Live partial score: only the sets that already have a number entered for either team.
  const activeSets = (match.liveScore?.sets ?? []).filter(s => s.a != null || s.b != null);

  const GREEN = '#16a34a';
  const teamRow = (name: string, dim: boolean, side: 'a' | 'b') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0, opacity: dim ? 0.45 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      {isLive && activeSets.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {activeSets.map((s, i) => {
            const v = side === 'a' ? s.a : s.b;
            return (
              <span key={i} style={{ minWidth: 22, textAlign: 'center', fontSize: 17, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {v == null ? '·' : v}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      background: isLive ? GREEN : '#fff',
      borderRadius: 13,
      padding: '14px 16px',
      boxShadow: isLive ? `0 0 0 2px ${GREEN}, 0 6px 18px rgba(22,163,74,0.35)` : '0 1px 4px rgba(0,0,0,0.07)',
      position: 'relative', overflow: 'hidden',
    }}>
      {isLive && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: '#fff', color: GREEN, fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
          EN VIVO
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isLive ? 'rgba(255,255,255,0.85)' : (isElim ? '#8b5cf6' : '#3b82f6'), marginBottom: 7 }}>
        {catMap.get(match.categoryId) ?? ''}
        {isElim ? ` · ${bm.roundLabel}` : ''}
        {' · '}{match.courtName}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, color: isLive ? '#fff' : '#111', lineHeight: 1.6 }}>
        {teamRow(a ? teamName(a) : bm.placeholderA ?? 'Por definir', !a, 'a')}
        {teamRow(b ? teamName(b) : bm.placeholderB ?? 'Por definir', !b, 'b')}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: isLive ? 'rgba(255,255,255,0.55)' : '#bbb' }}>{match.time}</div>
    </div>
  );
}
