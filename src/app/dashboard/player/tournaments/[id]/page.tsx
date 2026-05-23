'use client';
import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import type { GamePlayer, InvitedPlayer } from '@/lib/game-engine';
import { startTournament } from '@/lib/tournament-engine';
import { createInvitation, getInvitationsForGame } from '@/lib/invitation-store';
import { searchPlayers } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrentUser = { id: string; name: string; email: string; shortId?: string; ranking?: number };

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '–';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const MODALIDAD_LABEL: Record<string, string> = {
  individual: 'Individual', parejas: 'Parejas',
};

function statusInfo(status: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    created:       { label: 'Inscripciones abiertas', bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed' },
    starting_soon: { label: 'Por Empezar',            bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
    live:          { label: 'En Vivo',                bg: 'rgba(0,180,0,0.1)',     color: 'var(--turf-green)' },
    finished:      { label: 'Finalizado',             bg: 'var(--grey-100)',       color: 'var(--grey-500)' },
    cancelled:     { label: 'Cancelado',              bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
  };
  return map[status] ?? map.created;
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function GestionarTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);

  // Edit panel
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editMaxPlayers, setEditMaxPlayers] = useState(8);

  // Info section expand
  const [infoExpanded, setInfoExpanded] = useState(true);

  // Provisional slot inputs: slotIndex → text
  const [provSlotInputs, setProvSlotInputs] = useState<Record<number, string>>({});

  // Invite panel
  const [inviteQ, setInviteQ] = useState('');
  const [inviteResults, setInviteResults] = useState<RegisteredPlayer[]>([]);
  const [inviteSent, setInviteSent] = useState<string[]>([]);

  // Co-creator
  const [coCreatorDropdown, setCoCreatorDropdown] = useState('');

  // Cancel confirmation
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Starting_soon: adjust maxPlayers
  const [soonMaxPlayers, setSoonMaxPlayers] = useState<number>(8);

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const u = localStorage.getItem('padelmgt_user');
      if (u) setCurrentUser(JSON.parse(u) as CurrentUser);
    } catch { /* ignore */ }
  }, []);

  // ── Load tournament (initial + polling) ───────────────────────────────────
  const loadTournament = useCallback(() => {
    const t = getTournament(id);
    setTournament(t ?? null);
    if (t) {
      setSoonMaxPlayers(t.maxPlayers);
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
    const timer = setInterval(loadTournament, 5000);
    return () => clearInterval(timer);
  }, [loadTournament]);

  // ── Search players for invite ─────────────────────────────────────────────
  useEffect(() => {
    if (inviteQ.trim().length >= 2 && tournament) {
      const results = searchPlayers(inviteQ);
      const confirmedIds = new Set(tournament.players.map(p => p.id));
      const invitedIds = new Set((tournament.invitedPlayers ?? []).map(p => p.id));
      setInviteResults(results.filter(p => !confirmedIds.has(p.id) && !invitedIds.has(p.id)));
    } else {
      setInviteResults([]);
    }
  }, [inviteQ, tournament]);

  // ── Guard: loading ────────────────────────────────────────────────────────
  if (tournament === undefined) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)' }}>
        Cargando...
      </div>
    );
  }

  // ── Guard: not found ──────────────────────────────────────────────────────
  if (tournament === null) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          Torneo no encontrado
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 28 }}>
          El torneo con ID <code>{id}</code> no existe o fue eliminado.
        </div>
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  const isCreator = currentUser != null && tournament.creatorId === currentUser.id;
  const isCoCreator = currentUser != null && (tournament.coCreatorIds ?? []).includes(currentUser.id);
  const hasAccess = isCreator || isCoCreator;

  // ── Guard: no access ──────────────────────────────────────────────────────
  if (currentUser != null && !hasAccess) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          No tienes acceso
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 28 }}>
          Solo el creador y co-creadores del torneo pueden gestionar esta página.
        </div>
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  // ── Read-only view: finished / cancelled ──────────────────────────────────
  const isCancelled = !!tournament.cancelledAt;
  if (tournament.status === 'finished' || isCancelled) {
    const effectiveStatus = isCancelled ? 'cancelled' : tournament.status;
    const si = statusInfo(effectiveStatus);
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
          <Link href="/dashboard/player/tournaments"
            style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ← Mis Torneos
          </Link>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>PADELMGT</div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          {tournament.name}
        </h1>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: si.bg, color: si.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {si.label}
        </span>
        <div style={{ marginTop: 24, ...card }}>
          <div style={secTitle}>Resumen del torneo</div>
          {[
            { label: 'Fecha',      value: formatDateDDMMYYYY(tournament.date) },
            { label: 'Hora',       value: tournament.time || '–' },
            { label: 'Club',       value: `${tournament.club}, ${tournament.city}` },
            { label: 'Formato',    value: FORMAT_LABEL[tournament.format] ?? tournament.format },
            { label: 'Modalidad',  value: MODALIDAD_LABEL[tournament.pairType] ?? tournament.pairType },
            { label: 'Jugadores',  value: `${tournament.players.length} / ${tournament.maxPlayers}` },
            { label: 'Canchas',    value: String(tournament.courts) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          {tournament.cancelledAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <span style={{ fontSize: 11, color: '#dc2626', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>Cancelado</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDateDDMMYYYY(tournament.cancelledAt.slice(0, 10))}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Live state placeholder ────────────────────────────────────────────────
  if (tournament.status === 'live') {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
          <Link href="/dashboard/player/tournaments"
            style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ← Mis Torneos
          </Link>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>PADELMGT</div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          {tournament.name}
        </h1>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: 'rgba(0,180,0,0.1)', color: 'var(--turf-green)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-block', marginBottom: 32 }}>
          En Vivo
        </span>
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
            En Vivo: usa la página de gestión de rondas
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 20 }}>
            Próximamente — La vista de gestión de rondas en tiempo real estará disponible aquí.
          </div>
          <Link href={`/dashboard/player/tournaments/${id}/live`}
            style={{ padding: '11px 24px', background: 'var(--black)', color: 'var(--neon)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
            Ir a Rondas →
          </Link>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD VIEW (created / starting_soon)
  // ══════════════════════════════════════════════════════════════════════════

  const t = tournament;
  const confirmedPlayers = t.players;
  const pendingInvited = (t.invitedPlayers ?? []).filter(p => p.status === 'pending');
  const rejectedInvited = (t.invitedPlayers ?? []).filter(p => p.status === 'rejected');
  const emptySlots = Math.max(0, t.maxPlayers - confirmedPlayers.length);
  const isStartingSoon = t.status === 'starting_soon';
  const allFilled = confirmedPlayers.length >= t.maxPlayers;
  const canStart = allFilled || isStartingSoon;
  const si = statusInfo(t.status);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSaveEdit() {
    const updated: Tournament = {
      ...t,
      name: editName.trim() || t.name,
      date: editDate || t.date,
      time: editTime || t.time,
      club: editClub.trim() || t.club,
      city: editCity.trim() || t.city,
      maxPlayers: editMaxPlayers,
    };
    saveTournament(updated);
    setTournament(updated);
    setShowEdit(false);
  }

  function openEdit() {
    setEditName(t.name);
    setEditDate(t.date);
    setEditTime(t.time);
    setEditClub(t.club);
    setEditCity(t.city);
    setEditMaxPlayers(t.maxPlayers);
    setShowEdit(true);
  }

  function handleRemovePlayer(playerId: string) {
    if (t.creatorId === playerId) return;
    const updated: Tournament = {
      ...t,
      players: t.players.filter(p => p.id !== playerId),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleAddProvisional(slotIndex: number) {
    const name = (provSlotInputs[slotIndex] ?? '').trim();
    if (!name) return;
    const newPlayer: GamePlayer = {
      id: `prov-${Date.now()}-${slotIndex}`,
      name,
      ranking: 999,
      isCreator: false,
    };
    const newInvitedEntry: InvitedPlayer = {
      id: newPlayer.id,
      name,
      ranking: 999,
      status: 'accepted',
      invitedAt: new Date().toISOString(),
      isFriend: false,
      isProvisional: true,
    };
    const updated: Tournament = {
      ...t,
      players: [...t.players, newPlayer],
      invitedPlayers: [...(t.invitedPlayers ?? []), newInvitedEntry],
    };
    saveTournament(updated);
    setTournament(updated);
    setProvSlotInputs(prev => {
      const n = { ...prev };
      delete n[slotIndex];
      return n;
    });
  }

  function handleInvitePlayer(player: RegisteredPlayer) {
    if (!currentUser) return;
    createInvitation({
      gameId: t.id,
      gameName: t.name,
      gameDate: t.date,
      gameTime: t.time,
      gameClub: t.club,
      gameCity: t.city,
      fromPlayerId: currentUser.id,
      fromPlayerName: currentUser.name,
      toPlayerId: player.id,
      toPlayerName: player.name,
      toPlayerEmail: player.email,
    });
    const newInvited: InvitedPlayer = {
      id: player.id,
      name: player.name,
      email: player.email,
      shortId: player.shortId,
      ranking: player.ranking,
      status: 'pending',
      invitedAt: new Date().toISOString(),
      isFriend: false,
    };
    const updated: Tournament = {
      ...t,
      invitedPlayers: [...(t.invitedPlayers ?? []), newInvited],
    };
    saveTournament(updated);
    setTournament(updated);
    setInviteSent(prev => [...prev, player.id]);
    setInviteQ('');
    setInviteResults([]);
  }

  function handleAddCoCreator() {
    if (!coCreatorDropdown) return;
    if ((t.coCreatorIds ?? []).includes(coCreatorDropdown)) return;
    const updated: Tournament = {
      ...t,
      coCreatorIds: [...(t.coCreatorIds ?? []), coCreatorDropdown],
    };
    saveTournament(updated);
    setTournament(updated);
    setCoCreatorDropdown('');
  }

  function handleRemoveCoCreator(playerId: string) {
    const updated: Tournament = {
      ...t,
      coCreatorIds: (t.coCreatorIds ?? []).filter(cid => cid !== playerId),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleCancelTournament() {
    const updated = {
      ...t,
      cancelledAt: new Date().toISOString(),
    } as Tournament;
    saveTournament(updated);
    setTournament(updated);
    router.push('/dashboard/player/tournaments');
  }

  function handleStartTournament() {
    const result = startTournament(t);
    saveTournament(result);
    setTournament(result);
    router.push(`/dashboard/player/tournaments/${id}/live`);
  }

  function handleUpdateSoonMaxPlayers() {
    const minAllowed = Math.max(4, confirmedPlayers.length);
    const clamped = Math.max(minAllowed, Math.min(soonMaxPlayers, t.maxPlayers));
    const updated: Tournament = { ...t, maxPlayers: clamped };
    saveTournament(updated);
    setTournament(updated);
    setSoonMaxPlayers(clamped);
  }

  // ── Co-creator eligible players ──────────────────────────────────────────
  const eligibleCoCreators = confirmedPlayers.filter(p =>
    p.id !== t.creatorId && !(t.coCreatorIds ?? []).includes(p.id)
  );

  // Keep invitation store in sync (read-only reference — polling handles fresh data)
  getInvitationsForGame(t.id);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 80px', maxWidth: 800, margin: '0 auto' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', borderBottom: '1px solid var(--grey-100)',
        background: '#fff', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/player/tournaments"
          style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ← Mis Torneos
        </Link>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>
          PADELMGT
        </div>
        {!cancelConfirm ? (
          <button
            onClick={() => setCancelConfirm(true)}
            style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancelar Torneo
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>¿Seguro?</span>
            <button onClick={handleCancelTournament}
              style={{ padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              Sí, cancelar
            </button>
            <button onClick={() => setCancelConfirm(false)}
              style={{ padding: '7px 14px', background: 'transparent', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              No, volver
            </button>
          </div>
        )}
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--grey-100)' }}>
        {/* Starting soon banner */}
        {isStartingSoon && (
          <div style={{ padding: '10px 16px', background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            El torneo comienza en menos de 24 horas
          </div>
        )}

        {/* All filled CTA */}
        {allFilled && (
          <div style={{ padding: '14px 20px', background: 'rgba(214,255,0,0.08)', border: '2px solid var(--neon)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>¡Todos los cupos están ocupados!</span>
            <button onClick={handleStartTournament}
              style={{ padding: '10px 22px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              INICIAR TORNEO
            </button>
          </div>
        )}

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {t.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: si.bg, color: si.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {si.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--grey-500)' }}>
          <span>{formatDateDDMMYYYY(t.date)}</span>
          {t.time && <span>{t.time}</span>}
          <span>{t.club}, {t.city}</span>
          {t.country && <span>{t.country}</span>}
          <span>{FORMAT_LABEL[t.format] ?? t.format}</span>
          <span>{MODALIDAD_LABEL[t.pairType] ?? t.pairType}</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '24px 40px' }}>

        {/* ── Section 1: Información del Torneo ── */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div
            onClick={() => setInfoExpanded(e => !e)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', userSelect: 'none', borderBottom: infoExpanded ? '1px solid var(--grey-100)' : 'none' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, fontWeight: 700, color: 'var(--grey-400)' }}>
              Información del Torneo
            </div>
            <span style={{ fontSize: 18, color: 'var(--grey-400)' }}>{infoExpanded ? '▲' : '▼'}</span>
          </div>

          {infoExpanded && (
            <div style={{ padding: '20px 24px' }}>
              {!showEdit ? (
                <>
                  {[
                    { label: 'Nombre',     value: t.name },
                    { label: 'Fecha',      value: formatDateDDMMYYYY(t.date) },
                    { label: 'Hora',       value: t.time || '–' },
                    { label: 'Club',       value: t.club },
                    { label: 'Ciudad',     value: t.city },
                    { label: 'País',       value: t.country || '–' },
                    { label: 'Formato',    value: FORMAT_LABEL[t.format] ?? t.format },
                    { label: 'Modalidad',  value: MODALIDAD_LABEL[t.pairType] ?? t.pairType },
                    { label: 'Jugadores',  value: `${t.maxPlayers}` },
                    { label: 'Canchas',    value: String(t.courts) },
                    { label: 'Puntuación', value: t.scoreConfig.type === 'points' ? `Por puntos (objetivo: ${t.scoreConfig.target ?? '–'})` : `Tradicional (${t.scoreConfig.setsPerMatch ?? 1} sets)` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--grey-100)' }}>
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
                    </div>
                  ))}
                  <button
                    onClick={openEdit}
                    style={{ marginTop: 16, padding: '9px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
                    ✏ Editar parámetros
                  </button>
                </>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Nombre</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Fecha</label>
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Hora</label>
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Club</label>
                      <input type="text" value={editClub} onChange={e => setEditClub(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Ciudad</label>
                      <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Máx. jugadores</label>
                      <input type="number" value={editMaxPlayers} min={confirmedPlayers.length} max={32}
                        onChange={e => setEditMaxPlayers(Number(e.target.value))} style={inp} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSaveEdit}
                      style={{ padding: '10px 22px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Guardar
                    </button>
                    <button onClick={() => setShowEdit(false)}
                      style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 2: Jugadores ── */}
        <div style={card}>
          <div style={secTitle}>Jugadores ({confirmedPlayers.length} / {t.maxPlayers})</div>

          {/* Starting soon — adjust maxPlayers */}
          {isStartingSoon && (
            <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fef9c3', border: '1px solid #fde047' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ajustar cupos (próximo inicio)
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" value={soonMaxPlayers}
                  min={Math.max(4, confirmedPlayers.length)} max={t.maxPlayers}
                  onChange={e => setSoonMaxPlayers(Number(e.target.value))}
                  style={{ ...inp, width: 90 }} />
                <button onClick={handleUpdateSoonMaxPlayers}
                  style={{ padding: '10px 16px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  Actualizar
                </button>
                <span style={{ fontSize: 11, color: '#854d0e' }}>Mínimo: {Math.max(4, confirmedPlayers.length)}</span>
              </div>
            </div>
          )}

          {/* Confirmed */}
          {confirmedPlayers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--turf-green)', marginBottom: 8 }}>
                Confirmados ({confirmedPlayers.length})
              </div>
              {confirmedPlayers.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px solid var(--grey-200)', background: p.isCreator ? 'rgba(214,255,0,0.04)' : '#fff' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.isCreator ? 'var(--black)' : 'var(--turf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    {p.email && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.email}</div>}
                  </div>
                  {p.isCreator && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--black)', color: 'var(--neon)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CREADOR</span>
                  )}
                  {!p.isCreator && t.status === 'created' && (
                    <button onClick={() => handleRemovePlayer(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-300)', padding: 0, lineHeight: 1 }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending */}
          {pendingInvited.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>
                Invitados pendientes ({pendingInvited.length})
              </div>
              {pendingInvited.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-200)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    {p.email && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.email}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(245,166,35,0.15)', color: '#f5a623', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pendiente</span>
                </div>
              ))}
            </div>
          )}

          {/* Rejected */}
          {rejectedInvited.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', marginBottom: 8 }}>
                Rechazados ({rejectedInvited.length})
              </div>
              {rejectedInvited.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-100)', background: 'var(--grey-50)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-400)' }}>{p.name}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(220,38,38,0.1)', color: '#dc2626', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rechazó</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty slots */}
          {emptySlots > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
                Slots vacíos ({emptySlots})
              </div>
              {Array.from({ length: emptySlots }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-200)', background: 'var(--grey-50)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--grey-300)', flexShrink: 0 }}>
                    ?
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--grey-400)', flex: 1 }}>Slot vacío</span>
                  {provSlotInputs[i] !== undefined ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={provSlotInputs[i]}
                        placeholder="Nombre provisional…"
                        onChange={e => setProvSlotInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        style={{ ...inp, width: 180, padding: '6px 10px', fontSize: 12 }}
                      />
                      <button
                        onClick={() => handleAddProvisional(i)}
                        style={{ padding: '6px 12px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Agregar
                      </button>
                      <button
                        onClick={() => setProvSlotInputs(prev => { const n = { ...prev }; delete n[i]; return n; })}
                        style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setProvSlotInputs(prev => ({ ...prev, [i]: '' }))}
                      style={{ padding: '5px 12px', background: 'none', border: '1px dashed var(--grey-300)', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>
                      + Agregar provisional
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Invite panel */}
          {emptySlots > 0 && (
            <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>
                Invitar jugador
              </div>
              <input
                type="text"
                value={inviteQ}
                onChange={e => setInviteQ(e.target.value)}
                placeholder="Buscar por nombre, email o #ID…"
                style={{ ...inp, marginBottom: 0 }}
              />
              {inviteQ.trim().length >= 2 && (
                <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none', maxHeight: 240, overflowY: 'auto' }}>
                  {inviteResults.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>No se encontraron jugadores.</div>
                  ) : inviteResults.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--grey-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                          {initials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.shortId} · #{p.ranking}</div>
                        </div>
                      </div>
                      {inviteSent.includes(p.id) ? (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', background: 'rgba(0,180,0,0.1)', color: 'var(--turf-green)', textTransform: 'uppercase' }}>Enviado</span>
                      ) : (
                        <button onClick={() => handleInvitePlayer(p)}
                          style={{ padding: '6px 14px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Invitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {inviteQ.trim().length > 0 && inviteQ.trim().length < 2 && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--grey-400)' }}>Escribí al menos 2 caracteres para buscar.</div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 3: Co-Creadores ── */}
        <div style={card}>
          <div style={secTitle}>Co-Creadores</div>

          {(t.coCreatorIds ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 14, fontStyle: 'italic' }}>
              No hay co-creadores asignados.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {(t.coCreatorIds ?? []).map(cId => {
                const player = confirmedPlayers.find(p => p.id === cId);
                return (
                  <div key={cId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', marginBottom: 6, border: '1px solid var(--grey-200)', background: '#fff' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials(player?.name ?? cId)}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{player?.name ?? cId}</span>
                    <button onClick={() => handleRemoveCoCreator(cId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {eligibleCoCreators.length > 0 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={coCreatorDropdown}
                onChange={e => setCoCreatorDropdown(e.target.value)}
                style={{
                  ...inp, width: 'auto', flex: 1, appearance: 'none' as const, cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}>
                <option value="">Seleccionar jugador confirmado…</option>
                {eligibleCoCreators.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={handleAddCoCreator} disabled={!coCreatorDropdown}
                style={{ padding: '10px 18px', background: coCreatorDropdown ? 'var(--black)' : 'var(--grey-200)', color: coCreatorDropdown ? '#fff' : 'var(--grey-400)', border: 'none', cursor: coCreatorDropdown ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Agregar
              </button>
            </div>
          )}
        </div>

        {/* ── Section 4: Acciones ── */}
        <div style={card}>
          <div style={secTitle}>Acciones</div>

          {/* Cancel */}
          {!cancelConfirm ? (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setCancelConfirm(true)}
                style={{ padding: '11px 24px', background: 'transparent', border: '2px solid #dc2626', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Cancelar Torneo
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>
                ¿Seguro? Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleCancelTournament}
                  style={{ padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Sí, cancelar el torneo
                </button>
                <button onClick={() => setCancelConfirm(false)}
                  style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                  No, volver
                </button>
              </div>
            </div>
          )}

          {/* Start tournament */}
          <button
            onClick={handleStartTournament}
            disabled={!canStart}
            style={{ width: '100%', padding: '16px', background: canStart ? 'var(--black)' : 'var(--grey-200)', color: canStart ? 'var(--neon)' : 'var(--grey-400)', border: 'none', cursor: canStart ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            INICIAR TORNEO
          </button>
          {!canStart && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)', textAlign: 'center' }}>
              Necesitás completar todos los cupos ({confirmedPlayers.length}/{t.maxPlayers}) para iniciar el torneo.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
