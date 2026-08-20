'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getAllGames } from '@/lib/game-store';
import type { ActiveGame } from '@/lib/game-engine';
import { updatePlayer, seedLocalPlayer } from '@/lib/player-store';
import { fetchPlayerByEmail } from '@/lib/supabase';
import { getRankingHistoryForGame, fetchRankingHistoryForPlayerFromSupabase } from '@/lib/ranking-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PLAYER_LEVELS, LEVEL_CONFIG, getLevelInfo, normalizeLegacyLevel, type PlayerLevel } from '@/lib/level-config';
import {
  getFamilyMembers, saveFamilyMember, deleteFamilyMember, getFamilyLinks,
  saveFamilyLink, createFamilyMember, updateFamilyMember, requestFamilyLink,
  fetchFamilyMembersFromSupabase, fetchFamilyLinksFromSupabase,
  RELATION_LABELS,
  type FamilyMember, type FamilyLink, type RelationType,
} from '@/lib/family-store';
import {
  getPendingApprovalsForGuardian, respondToApproval, fetchApprovalsForGuardianFromSupabase,
  type FamilyApprovalRequest,
} from '@/lib/family-approval-store';
import { getGame, updateGame } from '@/lib/game-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'perfil' | 'familia' | 'historial' | 'config';

type UserProfile = {
  id: string; name: string; email: string; role: string;
  level?: string; points?: number; clubName?: string;
  phone?: string; description?: string; nationality?: string;
  sex?: 'masculino' | 'femenino'; birthDate?: string;
  avatarBase64?: string;
  photoUrl?: string;
  city?: string;
};

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

const COUNTRIES: string[] = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Portugal', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela', 'Alemania', 'Australia',
  'Bélgica', 'Canadá', 'China', 'Dinamarca', 'Estados Unidos', 'Francia',
  'Grecia', 'Holanda', 'India', 'Italia', 'Japón', 'Noruega', 'Polonia',
  'Reino Unido', 'Rusia', 'Sudáfrica', 'Suecia', 'Suiza', 'Turquía',
  'Ucrania', 'Otro',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAge(birthDate: string): number {
  const b = new Date(birthDate); const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inp: React.CSSProperties = {
  display: 'block', width: '100%', border: '1px solid var(--grey-200)',
  padding: '10px 14px', fontSize: 14, background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font-body)',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6,
};
const sel: React.CSSProperties = { ...inp, appearance: 'none' as const, cursor: 'pointer' };

// ---------------------------------------------------------------------------
// Format label helper
// ---------------------------------------------------------------------------

function formatLabel(fmt: string): string {
  if (fmt === 'americano' || fmt === 'mexicano') return 'Juego Rápido';
  const map: Record<string, string> = {
    round_robin: 'Round Robin',
    team_league: 'Liga',
    knockout: 'Knockout',
    world_cup: 'World Cup',
  };
  return map[fmt] ?? fmt;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerProfilePage() {
  const { user: sessionUser, setUser: setSessionUser } = useCurrentUser();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<Tab>('perfil');
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [finishedGames, setFinishedGames] = useState<ActiveGame[]>([]);
  const [, forceRankingHistoryRefresh] = useState(0);

  // Settings form state
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fNat, setFNat] = useState('');
  const [fCity, setFCity] = useState('');
  const [fSex, setFSex] = useState<'masculino' | 'femenino' | ''>('');
  const [fBirth, setFBirth] = useState('');
  const [fLevel, setFLevel] = useState<PlayerLevel>('1.0');
  const [levelExpanded, setLevelExpanded] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Family tab state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyLinks, setFamilyLinks] = useState<FamilyLink[]>([]);
  const [approvals, setApprovals] = useState<FamilyApprovalRequest[]>([]);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [familySaving, setFamilySaving] = useState(false);
  const [familyError, setFamilyError] = useState('');
  // Modal form fields
  const [mName, setMName] = useState('');
  const [mRelation, setMRelation] = useState<RelationType>('hijo');
  const [mSex, setMSex] = useState<'masculino' | 'femenino'>('masculino');
  const [mBirth, setMBirth] = useState('');
  const [mEmail, setMEmail] = useState('');
  // Link request fields
  const [mLinkEmail, setMLinkEmail] = useState('');
  const [mLinkRelation, setMLinkRelation] = useState<RelationType>('pareja');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkMsg, setLinkMsg] = useState('');

  // Hydrate local UserProfile state from the session hook
  useEffect(() => {
    if (sessionUser) setUser(sessionUser as unknown as UserProfile);
  }, [sessionUser]);

  // Supabase is the source of truth for profile data: pull the fresh row on
  // mount and merge it over the session snapshot, so edits made on another
  // device are visible here.
  useEffect(() => {
    if (!sessionUser?.email) return;
    let alive = true;
    fetchPlayerByEmail(sessionUser.email).then(row => {
      if (!alive || !row) return;
      const cf = (row.custom_fields as Record<string, string>) ?? {};
      // Seed the local player cache from this authoritative fetch — without
      // this, updatePlayer() below has no matching local row to merge edits
      // into and silently drops the save (this was the actual bug: sex/level
      // edits looked saved in the UI but never reached Supabase).
      seedLocalPlayer({
        id: row.id as string,
        shortId: cf.shortId ?? '',
        name: (row.name as string) ?? '',
        email: (row.email as string) ?? sessionUser.email,
        sex: (['M', 'F'].includes(cf.sex) ? cf.sex as 'M' | 'F' : undefined),
        country: (row.country as string) ?? undefined,
        city: (row.city as string) ?? undefined,
        level: cf.level ? normalizeLegacyLevel(cf.level) : undefined,
        photoUrl: cf.photoUrl || undefined,
        phone: (row.phone as string) ?? undefined,
        description: cf.description,
        birthDate: cf.birthDate,
        ranking: 0,
        rankingPoints: (row.ranking_points as number) ?? 0,
        profileCompleted: cf.profileCompleted === 'true',
        plan: cf.plan,
      });
      setUser(prev => prev ? {
        ...prev,
        name:        (row.name as string) || prev.name,
        phone:       (row.phone as string) ?? prev.phone,
        city:        (row.city as string) ?? prev.city,
        nationality: (row.country as string) ?? prev.nationality,
        level:       cf.level ?? prev.level,
        sex:         cf.sex === 'M' ? 'masculino' : cf.sex === 'F' ? 'femenino' : prev.sex,
        description: cf.description ?? prev.description,
        birthDate:   cf.birthDate ?? prev.birthDate,
        photoUrl:    cf.photoUrl !== undefined ? (cf.photoUrl || undefined) : prev.photoUrl,
      } : prev);
      // The form init effect only reruns on id change — refresh the fields
      // with the server values directly.
      if (row.name) setFName(row.name as string);
      if (row.phone != null) setFPhone((row.phone as string) ?? '');
      if (row.city != null) setFCity((row.city as string) ?? '');
      if (row.country) setFNat(row.country as string);
      if (cf.level) setFLevel(normalizeLegacyLevel(cf.level));
      if (cf.sex) setFSex(cf.sex === 'M' ? 'masculino' : cf.sex === 'F' ? 'femenino' : (cf.sex as 'masculino' | 'femenino'));
      if (cf.description !== undefined) setFDesc(cf.description);
      if (cf.birthDate !== undefined) setFBirth(cf.birthDate);
    });
    return () => { alive = false; };
  }, [sessionUser?.email]);

  // Load family data when user is set or tab switches to familia
  useEffect(() => {
    if (!user) return;
    setFamilyMembers(getFamilyMembers(user.id));
    setFamilyLinks(getFamilyLinks(user.id));
    setApprovals(getPendingApprovalsForGuardian(user.id));
    fetchFamilyMembersFromSupabase(user.id).then(remote => {
      if (remote !== null) setFamilyMembers(remote);
    }).catch(() => {});
    fetchFamilyLinksFromSupabase(user.id).then(remote => {
      if (remote !== null) setFamilyLinks(remote);
    }).catch(() => {});
    fetchApprovalsForGuardianFromSupabase(user.id).then(remote => {
      if (remote !== null) setApprovals(remote.filter(r => r.status === 'pending'));
    }).catch(() => {});
  }, [user?.id, tab]);

  // ── Guardian approval handlers ──────────────────────────────────────────────
  function handleApproval(req: FamilyApprovalRequest, response: 'approved' | 'rejected') {
    const { ok, request } = respondToApproval(req.id, response);
    if (ok && request && request.context === 'quick_game') {
      const game = getGame(request.entityId);
      if (game) {
        const newStatus = response === 'approved' ? 'accepted' : 'rejected';
        const invitedPlayers = (game.invitedPlayers ?? []).map(p =>
          (p.familyMemberId === request.familyMemberId || p.id === request.familyMemberId)
            ? { ...p, status: newStatus as typeof p.status }
            : p
        );
        updateGame(game.id, { invitedPlayers });
      }
    }
    if (user) setApprovals(getPendingApprovalsForGuardian(user.id));
  }

  // Load games and init form whenever user changes
  useEffect(() => {
    if (!user) return;
    const all = getAllGames();
    const mine = all.filter(g => (g.players ?? []).some(p => p.id === user.id));
    setActiveGames(mine.filter(g => g.status !== 'finished'));
    setFinishedGames(mine.filter(g => g.status === 'finished'));
    fetchRankingHistoryForPlayerFromSupabase(user.id).then(remote => {
      if (remote !== null) forceRankingHistoryRefresh(v => v + 1);
    }).catch(() => {});
    // init form
    setFName(user.name || '');
    setFEmail(user.email || '');
    setFPhone(user.phone || '');
    setFDesc(user.description || '');
    setFNat(user.nationality || '');
    setFCity(user.city || '');
    setFSex(user.sex || '');
    setFBirth(user.birthDate || '');
    setFLevel(normalizeLegacyLevel(user.level));
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------

  const totalGames = finishedGames.length;
  const wins = finishedGames.filter(g => user && (g.standings ?? []).findIndex(s => s.playerId === user.id) === 0).length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const totalPts = finishedGames.reduce((acc, g) => {
    const s = user ? (g.standings ?? []).find(st => st.playerId === user.id) : null;
    return acc + (s?.pts ?? 0);
  }, 0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      name: fName.trim() || user.name,
      email: fEmail.trim() || user.email,
      phone: fPhone.trim() || undefined,
      description: fDesc.trim() || undefined,
      nationality: fNat || undefined,
      city: fCity.trim() || undefined,
      sex: fSex || undefined,
      birthDate: fBirth || undefined,
      level: fLevel,
    };
    setSessionUser(updated as unknown as Parameters<typeof setSessionUser>[0]);
    setUser(updated);
    if (updated.id) {
      // Push EVERY profile field so the edit is visible from any device.
      // email is included explicitly — the server route requires it, and
      // relying solely on the local cache having it is what caused silent
      // save failures (see updatePlayer / seedLocalPlayer above).
      updatePlayer(updated.id, {
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? '',
        description: updated.description ?? '',
        birthDate: updated.birthDate ?? '',
        country: updated.nationality,
        city: updated.city,
        sex: updated.sex === 'masculino' ? 'M' : updated.sex === 'femenino' ? 'F' : undefined,
        level: fLevel,
        photoUrl: updated.photoUrl,
      });
    }
    setSaveMsg('¡Perfil actualizado!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = { ...user, avatarBase64: base64, photoUrl: base64 };
      setSessionUser(updated as unknown as Parameters<typeof setSessionUser>[0]);
      setUser(updated);
      if (user.id) updatePlayer(user.id, { email: user.email, photoUrl: base64 });
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteAvatar() {
    if (!user) return;
    const updated = { ...user, avatarBase64: undefined, photoUrl: undefined };
    setSessionUser(updated as unknown as Parameters<typeof setSessionUser>[0]);
    setUser(updated);
    // Empty string (not undefined) so the deletion survives JSON serialization
    // and clears the photo server-side too.
    if (user.id) updatePlayer(user.id, { email: user.email, photoUrl: '' });
  }

  // ---------------------------------------------------------------------------
  // Not logged in
  // ---------------------------------------------------------------------------

  if (!user) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 16 }}>
          Sin sesión
        </div>
        <Link href="/login" style={{ fontSize: 14, color: 'var(--black)', fontWeight: 600 }}>
          Iniciar sesión →
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Minor check
  // ---------------------------------------------------------------------------

  const isMinor = fBirth ? getAge(fBirth) < 16 : false;

  // ---------------------------------------------------------------------------
  // Evolution chart data
  // ---------------------------------------------------------------------------

  // Use real ranking history from completed games; empty for new users
  const chartData: number[] = (() => {
    try {
      const games = typeof window !== 'undefined' ? getAllGames().filter(g => g.status === 'finished') : [];
      if (games.length === 0) return [];
      return games.slice(-10).map(g => {
        const history = getRankingHistoryForGame(g.id);
        const userId = user?.id ?? '';
        const entry = history.find(h => h.playerId === userId);
        return entry?.newTotal ?? 0;
      }).filter(v => v > 0);
    } catch { return []; }
  })();
  const chartMin = chartData.length > 0 ? Math.min(...chartData) : 0;
  const chartMax = chartData.length > 0 ? Math.max(...chartData) : 0;
  const chartRange = (chartMax - chartMin) || 1;
  const chartPoints = chartData.length >= 2 ? chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 500;
    const y = 80 - ((v - chartMin) / chartRange) * 70 + 5;
    return { x, y, v };
  }) : [];
  const polylinePoints = chartPoints.map(p => `${p.x},${p.y}`).join(' ');

  // ---------------------------------------------------------------------------
  // Avatar helper
  // ---------------------------------------------------------------------------

  function AvatarCircle({ size, fontSize }: { size: number; fontSize: number }) {
    const src = user!.avatarBase64 || user!.photoUrl;
    if (src) {
      return (
        <img
          src={src}
          alt="avatar"
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--court-blue)', color: '#fff',
        fontFamily: 'var(--font-display)', fontSize, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {initials(user!.name)}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="dash-page bs-page" style={{ padding: '40px 40px 80px' }}>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Profile Header                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="profile-header-block" style={{
        background: 'var(--black)', padding: 32,
        display: 'flex', gap: 24, alignItems: 'flex-start',
        marginBottom: 24, position: 'relative',
      }}>
        {/* Avatar */}
        <AvatarCircle size={64} fontSize={22} />

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div className="bs-h1" style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
            textTransform: 'uppercase', color: '#fff', lineHeight: 1.1, marginBottom: 6,
          }}>
            {user.name}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-400)', marginBottom: 12 }}>
            {user.level && <span>{getLevelInfo(user.level).label} — {getLevelInfo(user.level).group}</span>}
            {user.level && user.clubName && <span style={{ margin: '0 6px' }}>·</span>}
            {user.clubName && <span>{user.clubName}</span>}
          </div>
          {/* Chips row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {user.points !== undefined && (
              <span style={{
                background: 'var(--court-blue)', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '3px 10px',
              }}>
                {user.points} pts
              </span>
            )}
            {user.level && (() => {
              const li = getLevelInfo(user.level);
              return (
                <span style={{
                  background: li.color + '33', color: li.color,
                  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', border: `1px solid ${li.color}55`,
                }}>
                  {li.level} {li.group}
                </span>
              );
            })()}
            {user.clubName && (
              <span style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 11,
                padding: '3px 10px',
              }}>
                {user.clubName}
              </span>
            )}
            {user.sex && (
              <span style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 11,
                padding: '3px 10px', textTransform: 'capitalize',
              }}>
                {user.sex}
              </span>
            )}
          </div>
        </div>

        {/* Config button top-right */}
        <button
          onClick={() => setTab('config')}
          style={{
            background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none',
            fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          Configuración
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Stats row                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Juegos', value: totalGames },
          { label: 'Victorias', value: wins },
          { label: 'Win Rate', value: `${winRate}%` },
          { label: 'Puntos', value: totalPts },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', padding: '24px 28px', border: '1px solid var(--grey-100)' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700,
              color: 'var(--black)', lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--grey-400)', marginTop: 6,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Tabs                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="profile-tabs-row" style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 28 }}>
        {(['perfil', 'familia', 'historial', 'config'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { perfil: 'Perfil', familia: 'Familia', historial: 'Historial', config: 'Configuración' };
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14,
                padding: '12px 20px',
                borderBottom: active ? '2px solid var(--black)' : '2px solid transparent',
                color: active ? 'var(--black)' : 'var(--grey-400)',
                fontWeight: active ? 700 : 400,
                marginBottom: -1,
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Tab content                                                      */}
      {/* ------------------------------------------------------------------ */}

      {/* ======================== TAB: PERFIL ============================== */}
      {tab === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Evolution chart */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Evolución de Ranking</div>
            {chartData.length >= 2 ? (
              <>
                <svg
                  width="100%"
                  viewBox="0 0 500 80"
                  preserveAspectRatio="none"
                  style={{ display: 'block', height: 80 }}
                >
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="var(--turf-green)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {chartPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--turf-green)" />
                  ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--grey-400)' }}>Últimos {chartData.length} juegos</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--grey-400)' }}>Ahora</span>
                </div>
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--grey-300)', fontSize: 13 }}>
                Jugá partidos para ver tu evolución aquí.
              </div>
            )}
          </div>

          {/* Active games */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Mis Juegos Activos</div>
            {activeGames.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-400)' }}>
                No tenés juegos activos en este momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeGames.map(g => {
                  const isQuick = g.format === 'americano' || g.format === 'mexicano';
                  const href = isQuick
                    ? `/dashboard/player/quick-game/${g.id}`
                    : `/dashboard/player/tournaments/${g.id}`;
                  const statusColors: Record<string, string> = {
                    created: 'var(--grey-200)',
                    starting_soon: '#FDE68A',
                    live: 'var(--bs-light)',
                  };
                  const statusLabels: Record<string, string> = {
                    created: 'Inscripto',
                    starting_soon: 'Por comenzar',
                    live: 'En juego',
                  };
                  return (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0', borderBottom: '1px solid var(--grey-100)',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 2 }}>
                          {g.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-400)' }}>
                          {g.date} · {g.time} · {g.club}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          background: statusColors[g.status] ?? 'var(--grey-200)',
                          color: 'var(--black)', fontFamily: 'var(--font-body)',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.08em', padding: '2px 8px',
                        }}>
                          {statusLabels[g.status] ?? g.status}
                        </span>
                        <Link href={href} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
                          Ver →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== TAB: FAMILIA ============================= */}
      {tab === 'familia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Section: Aprobaciones pendientes ────────────────────────── */}
          {approvals.length > 0 && (
            <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
              <div style={{ ...lbl, marginBottom: 16 }}>
                Aprobaciones pendientes
                <span style={{ marginLeft: 8, background: '#f59e0b', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {approvals.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {approvals.map(req => {
                  const ctxLabel: Record<FamilyApprovalRequest['context'], string> = {
                    quick_game: 'Juego Rápido', tournament: 'Torneo', personalizado: 'Torneo Personalizado',
                  };
                  return (
                    <div key={req.id} style={{ border: '1px solid var(--grey-200)', padding: 18 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--black)', lineHeight: 1.5, marginBottom: 14 }}>
                        <strong>{req.fromPlayerName}</strong> invitó a <strong>{req.familyMemberName}</strong> a <strong>{req.entityName}</strong> ({ctxLabel[req.context]})
                        {req.entityDate ? ` el ${req.entityDate}` : ''}.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleApproval(req, 'approved')}
                          style={{ background: 'var(--turf-green)', color: '#fff', border: 'none', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproval(req, 'rejected')}
                          style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section: Mis Familiares ─────────────────────────────────── */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ ...lbl }}>Mis Familiares</div>
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setMName(''); setMRelation('hijo'); setMSex('masculino'); setMBirth(''); setMEmail('');
                  setFamilyError('');
                  setShowFamilyModal(true);
                }}
                style={{
                  background: 'var(--black)', color: '#fff', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  padding: '8px 18px', cursor: 'pointer',
                }}
              >
                + Añadir miembro
              </button>
            </div>

            {familyMembers.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-400)', padding: '12px 0' }}>
                No tenés familiares registrados todavía.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {familyMembers.map(m => {
                  const age = (() => {
                    try {
                      const b = new Date(m.birthDate); const n = new Date();
                      let a = n.getFullYear() - b.getFullYear();
                      if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
                      return a;
                    } catch { return null; }
                  })();
                  const statusLabel = m.invitationStatus === 'none' ? 'sin cuenta' : m.invitationStatus === 'invited' ? 'invitado' : 'en plataforma ✓';
                  const statusColor = m.invitationStatus === 'accepted' ? 'var(--turf-green)' : m.invitationStatus === 'invited' ? '#b45309' : 'var(--grey-400)';
                  return (
                    <div key={m.id} style={{ border: '1px solid var(--grey-200)', padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--grey-400)', marginBottom: 2 }}>{m.id}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--black)' }}>{m.fullName}</div>
                        </div>
                        <span style={{
                          background: 'var(--grey-100)', color: 'var(--black)',
                          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
                          padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {RELATION_LABELS[m.relationType]}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-500)', marginBottom: 6 }}>
                        {age !== null ? `${age} años` : ''}{age !== null && m.sex ? ' · ' : ''}{m.sex === 'masculino' ? 'Masculino' : 'Femenino'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: statusColor, fontWeight: 600, marginBottom: 14 }}>
                        {statusLabel}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMember(m);
                            setMName(m.fullName);
                            setMRelation(m.relationType);
                            setMSex(m.sex);
                            setMBirth(m.birthDate);
                            setMEmail(m.email ?? '');
                            setFamilyError('');
                            setShowFamilyModal(true);
                          }}
                          style={{
                            fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
                            background: 'none', border: '1px solid var(--grey-200)',
                            color: 'var(--black)', padding: '6px 12px',
                          }}
                        >
                          ✎ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm(`¿Eliminar a ${m.fullName}?`)) return;
                            deleteFamilyMember(m.id, m.ownerId);
                            setFamilyMembers(prev => prev.filter(x => x.id !== m.id));
                          }}
                          style={{
                            fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
                            background: 'none', border: '1px solid #fecaca',
                            color: '#dc2626', padding: '6px 12px',
                          }}
                        >
                          ✕ Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section: Vincular con usuario de la plataforma ──────────── */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Vincular con usuario de la plataforma</div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-500)', marginBottom: 20, lineHeight: 1.6 }}>
              Si tu familiar ya tiene cuenta en PadelMGT, podés enviarle una solicitud de vínculo. Recibirá un email para aceptar.
            </p>
            <div className="bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label style={lbl}>Email del familiar</label>
                <input
                  style={inp}
                  type="email"
                  value={mLinkEmail}
                  onChange={e => setMLinkEmail(e.target.value)}
                  placeholder="familiar@email.com"
                />
              </div>
              <div>
                <label style={lbl}>Relación (cómo lo ves)</label>
                <select style={sel} value={mLinkRelation} onChange={e => setMLinkRelation(e.target.value as RelationType)}>
                  {(Object.keys(RELATION_LABELS) as RelationType[]).map(r => (
                    <option key={r} value={r}>{RELATION_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={linkSaving || !mLinkEmail.trim()}
                onClick={async () => {
                  if (!user || !mLinkEmail.trim()) return;
                  setLinkSaving(true);
                  setLinkMsg('');
                  const result = await requestFamilyLink(
                    { id: user.id, name: user.name, email: user.email },
                    mLinkEmail.trim(),
                    mLinkRelation,
                  );
                  setLinkSaving(false);
                  if (result.ok) {
                    setLinkMsg('Solicitud enviada.');
                    setMLinkEmail('');
                    setFamilyLinks(getFamilyLinks(user.id));
                  } else {
                    setLinkMsg(result.error ?? 'Error al enviar solicitud.');
                  }
                }}
                style={{
                  background: 'var(--black)', color: '#fff', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  padding: '10px 20px', cursor: linkSaving ? 'not-allowed' : 'pointer',
                  opacity: linkSaving ? 0.6 : 1, whiteSpace: 'nowrap',
                }}
              >
                {linkSaving ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
            {linkMsg && (
              <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 13, color: linkMsg.startsWith('Solicitud') ? 'var(--turf-green)' : '#dc2626', fontWeight: 600 }}>
                {linkMsg}
              </div>
            )}
          </div>

          {/* ── Section: Solicitudes pendientes ─────────────────────────── */}
          {familyLinks.some(l => l.toPlayerId === user.id && l.status === 'pending') && (
            <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
              <div style={{ ...lbl, marginBottom: 16 }}>Solicitudes pendientes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {familyLinks
                  .filter(l => l.toPlayerId === user.id && l.status === 'pending')
                  .map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--grey-100)' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>
                          {l.fromPlayerName}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>
                          quiere vincularse como tu {RELATION_LABELS[l.relationToFrom] ?? l.relationToFrom}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch('/api/family/link', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'respond', linkId: l.id, response: 'accepted' }),
                            });
                            if (res.ok) {
                              saveFamilyLink({ ...l, status: 'accepted' });
                              setFamilyLinks(getFamilyLinks(user.id));
                            }
                          }}
                          style={{
                            background: 'var(--turf-green)', color: '#fff', border: 'none',
                            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                            padding: '6px 14px', cursor: 'pointer',
                          }}
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch('/api/family/link', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'respond', linkId: l.id, response: 'rejected' }),
                            });
                            if (res.ok) {
                              saveFamilyLink({ ...l, status: 'rejected' });
                              setFamilyLinks(getFamilyLinks(user.id));
                            }
                          }}
                          style={{
                            background: 'none', border: '1px solid #fecaca', color: '#dc2626',
                            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                            padding: '6px 14px', cursor: 'pointer',
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Family member modal ─────────────────────────────────────────── */}
      {showFamilyModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowFamilyModal(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}
        >
          <div style={{ background: '#fff', padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              textTransform: 'uppercase', marginBottom: 24,
            }}>
              {editingMember ? 'Editar familiar' : 'Añadir familiar'}
            </div>

            {familyError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                {familyError}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Nombre y Apellido</label>
              <input style={inp} value={mName} onChange={e => setMName(e.target.value)} placeholder="Nombre completo" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Tipo de relación</label>
              <select style={sel} value={mRelation} onChange={e => setMRelation(e.target.value as RelationType)}>
                {(Object.keys(RELATION_LABELS) as RelationType[]).map(r => (
                  <option key={r} value={r}>{RELATION_LABELS[r]}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Sexo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['masculino', 'femenino'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMSex(s)}
                    style={{
                      flex: 1, padding: '10px 0', cursor: 'pointer',
                      background: mSex === s ? 'var(--black)' : '#fff',
                      color: mSex === s ? '#fff' : 'var(--grey-600)',
                      border: mSex === s ? '1px solid var(--black)' : '1px solid var(--grey-200)',
                      fontFamily: 'var(--font-body)', fontSize: 13, textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Fecha de nacimiento</label>
              <input style={inp} type="date" value={mBirth} onChange={e => setMBirth(e.target.value)} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Email (opcional)</label>
              <input style={inp} type="email" value={mEmail} onChange={e => setMEmail(e.target.value)} placeholder="familiar@email.com" />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                disabled={familySaving}
                onClick={async () => {
                  if (!user) return;
                  if (!mName.trim() || !mBirth) {
                    setFamilyError('Nombre y fecha de nacimiento son requeridos.');
                    return;
                  }
                  setFamilySaving(true);
                  setFamilyError('');
                  try {
                    if (editingMember) {
                      const patch: Partial<FamilyMember> = {
                        fullName: mName.trim(),
                        relationType: mRelation,
                        sex: mSex,
                        birthDate: mBirth,
                        email: mEmail.trim() || undefined,
                      };
                      await updateFamilyMember(editingMember.id, user.id, patch);
                    } else {
                      await createFamilyMember(user.id, {
                        fullName: mName.trim(),
                        relationType: mRelation,
                        sex: mSex,
                        birthDate: mBirth,
                        email: mEmail.trim() || undefined,
                      });
                    }
                    setFamilyMembers(getFamilyMembers(user.id));
                    setShowFamilyModal(false);
                  } catch {
                    setFamilyError('Error al guardar. Intenta de nuevo.');
                  }
                  setFamilySaving(false);
                }}
                style={{
                  flex: 1, background: 'var(--black)', color: '#fff', border: 'none',
                  fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '14px', cursor: familySaving ? 'not-allowed' : 'pointer',
                  opacity: familySaving ? 0.6 : 1,
                }}
              >
                {familySaving ? 'Guardando...' : editingMember ? 'Guardar cambios' : 'Añadir familiar'}
              </button>
              <button
                type="button"
                onClick={() => setShowFamilyModal(false)}
                style={{
                  background: 'none', border: '1px solid var(--grey-200)', color: 'var(--grey-600)',
                  fontFamily: 'var(--font-body)', fontSize: 13, padding: '14px 20px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== TAB: HISTORIAL =========================== */}
      {tab === 'historial' && (
        <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
          <div style={{ ...lbl, marginBottom: 20 }}>Historial Completo</div>
          {finishedGames.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-400)' }}>
              No hay juegos finalizados aún.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--grey-200)' }}>
                    {['Fecha', 'Juego', 'Tipo', 'Posición', 'Pts', 'PJ', '+/−', 'Ranking Δ'].map(h => (
                      <th key={h} style={{
                        ...lbl, textAlign: 'left', padding: '8px 12px',
                        whiteSpace: 'nowrap', borderBottom: 'none',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finishedGames.map(g => {
                    const standing = (g.standings ?? []).find(s => s.playerId === user.id);
                    const posIdx = (g.standings ?? []).findIndex(s => s.playerId === user.id);
                    const pos = posIdx >= 0 ? posIdx + 1 : '—';
                    const total = (g.standings ?? []).length;
                    const rankEntry = getRankingHistoryForGame(g.id).find(e => e.playerId === user.id);
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{g.date}</td>
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--black)' }}>{g.name}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)' }}>{formatLabel(g.format)}</td>
                        <td style={{ padding: '12px 12px' }}>
                          <span style={{ fontWeight: 700, color: posIdx === 0 ? 'var(--turf-green)' : 'var(--black)' }}>
                            {pos}/{total}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', color: 'var(--black)' }}>{standing?.pts ?? '—'}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)' }}>{standing?.played ?? '—'}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)' }}>
                          {standing ? (standing.diff >= 0 ? `+${standing.diff}` : String(standing.diff)) : '—'}
                        </td>
                        <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                          {rankEntry ? (
                            <span style={{ fontWeight: 700, color: rankEntry.delta > 0 ? 'var(--turf-green)' : rankEntry.delta < 0 ? '#ee0005' : '#b45309' }}>
                              {rankEntry.delta > 0 ? '+' : ''}{rankEntry.delta}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================== TAB: CONFIG ============================== */}
      {tab === 'config' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Avatar section */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Foto de Perfil</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <AvatarCircle size={64} fontSize={22} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                    background: 'var(--black)', color: '#fff', border: 'none',
                    padding: '8px 16px',
                  }}
                >
                  Subir foto
                </button>
                {(user.avatarBase64 || user.photoUrl) && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                      background: 'none', color: 'var(--grey-500)',
                      border: '1px solid var(--grey-200)', padding: '8px 16px',
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Personal info */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, fontSize: 12, marginBottom: 20 }}>Información Personal</div>

            {/* Row 1: Name + Email */}
            <div className="profile-form-row bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={fName} onChange={e => setFName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input style={inp} type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
            </div>

            {/* Row 2: Phone + Nationality */}
            <div className="profile-form-row bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Teléfono</label>
                <input style={inp} value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+34 600 000 000" />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={lbl}>País</label>
                <select
                  style={sel}
                  value={fNat}
                  onChange={e => setFNat(e.target.value)}
                >
                  <option value="">Seleccionar país</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2b: City */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Ciudad</label>
              <input style={inp} value={fCity} onChange={e => setFCity(e.target.value)} placeholder="Tu ciudad" />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Descripción</label>
              <textarea
                style={{ ...inp, height: 80, resize: 'vertical' }}
                value={fDesc}
                onChange={e => setFDesc(e.target.value)}
                placeholder="Cuéntanos algo sobre vos..."
              />
            </div>

            {/* Row 3: Sex + Birth Date */}
            <div className="profile-form-row bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={lbl}>Sexo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['masculino', 'femenino'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFSex(fSex === s ? '' : s)}
                      style={{
                        flex: 1, padding: '10px 0', fontFamily: 'var(--font-body)',
                        fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                        border: fSex === s ? '2px solid var(--black)' : '1px solid var(--grey-200)',
                        background: fSex === s ? 'var(--black)' : '#fff',
                        color: fSex === s ? '#fff' : 'var(--grey-600)',
                        fontWeight: fSex === s ? 700 : 400,
                      }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Fecha de Nacimiento</label>
                <input
                  style={inp}
                  type="date"
                  value={fBirth}
                  onChange={e => setFBirth(e.target.value)}
                />
              </div>
            </div>

            {/* Minor notice */}
            {isMinor && (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: '#FEF3C7', border: '1px solid #FDE68A',
                fontFamily: 'var(--font-body)', fontSize: 13, color: '#92400E',
              }}>
                Jugador menor de 16 años. La plataforma permite registrar menores de edad. Se requiere autorización de un tutor para participar en torneos.
              </div>
            )}
          </div>

          {/* Level selector */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, fontSize: 12, marginBottom: 4 }}>Nivel de Juego</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-400)', marginBottom: 16 }}>
              Seleccioná el nivel que mejor describe tu habilidad actual.
            </div>

            {/* Current level display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: LEVEL_CONFIG[fLevel]?.color ?? '#9CA3AF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff',
              }}>
                {fLevel}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: 'var(--black)' }}>
                  {LEVEL_CONFIG[fLevel]?.group}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-500)', marginTop: 2 }}>
                  {LEVEL_CONFIG[fLevel]?.description}
                </div>
              </div>
            </div>

            {/* Level grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {PLAYER_LEVELS.map(lvl => {
                const info = LEVEL_CONFIG[lvl];
                const active = fLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFLevel(lvl)}
                    title={`${info.group} — ${info.description}`}
                    style={{
                      padding: '8px 4px', cursor: 'pointer',
                      border: active ? `2px solid ${info.color}` : '1px solid var(--grey-200)',
                      background: active ? info.color : '#fff',
                      color: active ? '#fff' : 'var(--grey-600)',
                      fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                      transition: 'all 0.1s',
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            {/* Expand/collapse full descriptions */}
            <button
              type="button"
              onClick={() => setLevelExpanded(!levelExpanded)}
              style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-400)', padding: 0, textDecoration: 'underline' }}
            >
              {levelExpanded ? 'Ocultar descripción de niveles' : 'Ver descripción de todos los niveles'}
            </button>

            {levelExpanded && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PLAYER_LEVELS.map(lvl => {
                  const info = LEVEL_CONFIG[lvl];
                  return (
                    <div key={lvl} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setFLevel(lvl)}>
                      <div style={{
                        flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
                        background: info.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: '#fff',
                        border: fLevel === lvl ? '2px solid var(--black)' : '2px solid transparent',
                      }}>
                        {lvl}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: 'var(--black)' }}>
                          {info.label} — <span style={{ color: info.color }}>{info.group}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--grey-500)', marginTop: 1 }}>
                          {info.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save button */}
          <div>
            <button
              type="submit"
              style={{
                display: 'block', width: '100%',
                background: 'var(--black)', color: '#fff', border: 'none',
                fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '16px', cursor: 'pointer',
              }}
            >
              Guardar cambios
            </button>
            {saveMsg && (
              <div style={{
                marginTop: 12, fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--turf-green)', fontWeight: 600, textAlign: 'center',
              }}>
                {saveMsg}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
