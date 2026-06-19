'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSATournaments, saveSATournaments, getSATournamentsFromSupabase, getFullTournamentFromSupabase, upsertTournamentToSupabase, type SATournament } from '@/lib/superadmin-data';
import { getTournament, saveTournament, getAllTournaments } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import type { CourtMatch, GameRound } from '@/lib/game-engine';
import {
  getScoreCorrections,
  updateScoreCorrectionStatus,
  fetchCorrectionsFromSupabase,
  mergeCorrectionsFromSupabase,
  type ScoreCorrectionRequest,
} from '@/lib/score-correction-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { rowToTournament, rowToTeam, type PersonalizadoTournament, type PersonalizadoTeam } from '@/lib/personalizado-store';

const PAGE_SIZE = 15;

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '32px 36px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SATournament['status'] }) {
  const cfg = {
    ongoing:   { label: 'En curso',    bg: '#dcfce7', color: '#166534' },
    upcoming:  { label: 'Proximo',     bg: '#e0f2fe', color: '#0369a1' },
    completed: { label: 'Finalizado',  bg: '#f0f0f0', color: '#555' },
    cancelled: { label: 'Cancelado',   bg: '#fee2e2', color: '#991b1b' },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function CorrStatusBadge({ status }: { status: ScoreCorrectionRequest['status'] }) {
  const cfg = {
    pending:  { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e' },
    approved: { label: 'Aprobado',  bg: '#dcfce7', color: '#166534' },
    rejected: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b' },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = String(row[h] ?? '').replace(/"/g, '""');
      return val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Personalizado Detail Drawer (SA) ─────────────────────────────────────────

const P_STATUSES: Array<{ value: PersonalizadoTournament['status']; label: string; bg: string; color: string }> = [
  { value: 'draft',             label: 'Borrador',           bg: '#f3f4f6',             color: '#374151' },
  { value: 'registration_open', label: 'Inscripción abierta', bg: 'rgba(214,255,0,0.35)', color: '#6b7a00' },
  { value: 'configured',        label: 'Configurado',         bg: '#dbeafe',             color: '#1e40af' },
  { value: 'live',              label: 'En vivo',             bg: '#dcfce7',             color: '#166534' },
  { value: 'finished',          label: 'Finalizado',          bg: '#f3f4f6',             color: '#374151' },
  { value: 'cancelled',         label: 'Cancelado',           bg: '#fee2e2',             color: '#991b1b' },
];

const P_GENDER: Record<string, string> = { libre: 'Libre', masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto' };

function PersonalizadoDetailDrawer({
  tournament: initial,
  onClose,
  onUpdated,
  onDeleted,
}: {
  tournament: PersonalizadoTournament;
  onClose: () => void;
  onUpdated: (t: PersonalizadoTournament) => void;
  onDeleted: (id: string) => void;
}) {
  const [tournament, setTournament] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const statusCfg = P_STATUSES.find(s => s.value === tournament.status) ?? P_STATUSES[0];

  async function changeStatus(newStatus: PersonalizadoTournament['status']) {
    if (!isSupabaseConfigured || !supabase) return;
    setSaving(true);
    const patch: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'cancelled' && tournament.status !== 'cancelled') patch.previous_status = tournament.status;
    else if (newStatus !== 'cancelled') patch.previous_status = null;
    await supabase.from('personalizado_tournaments').update(patch).eq('id', tournament.id);
    const updated = { ...tournament, status: newStatus, previousStatus: newStatus === 'cancelled' ? tournament.status : undefined };
    setTournament(updated);
    onUpdated(updated);
    setSaving(false);
  }

  async function handleTeamStatus(teamId: string, newStatus: PersonalizadoTeam['status']) {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('personalizado_teams').update({ status: newStatus }).eq('id', teamId);
    const updatedTeams = tournament.teams.map(t => t.id === teamId ? { ...t, status: newStatus } : t);
    const updated = { ...tournament, teams: updatedTeams };
    setTournament(updated);
    onUpdated(updated);
  }

  async function deleteTournament() {
    if (!isSupabaseConfigured || !supabase) return;
    if (!window.confirm(`¿Eliminar "${tournament.name}" permanentemente? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    await supabase.from('personalizado_tournaments').delete().eq('id', tournament.id);
    onDeleted(tournament.id);
    onClose();
  }

  const totalEnrolled = tournament.teams.filter(t => t.status === 'pending' || t.status === 'confirmed').length;
  const totalCapacity = tournament.categories.reduce((s, c) => s + c.maxTeams, 0);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1009 }} onClick={onClose} />
      <div
        style={{ position: 'fixed', top: 0, right: 0, width: 620, height: '100vh', background: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', zIndex: 1010, overflowY: 'auto', padding: '32px 36px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Torneo Personalizado</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{tournament.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ background: statusCfg.bg, color: statusCfg.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{statusCfg.label}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f3f4f6', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>{tournament.code}</span>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
          {[
            { label: 'Organizador', value: tournament.creatorName || '—' },
            { label: 'Fecha', value: [tournament.date, tournament.time].filter(Boolean).join(' · ') || '—' },
            { label: 'Sede', value: tournament.locationName || '—' },
            { label: 'Ciudad', value: [tournament.city, tournament.country].filter(Boolean).join(', ') || '—' },
            { label: 'Canchas', value: String(tournament.courts) },
            { label: 'Categorías', value: String(tournament.categories.length) },
            { label: 'Equipos', value: `${totalEnrolled} / ${totalCapacity} cupos` },
            { label: 'Creado', value: new Date(tournament.createdAt).toLocaleString('es-ES') },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--grey-100)', fontSize: 13 }}>
              <span style={{ color: 'var(--grey-500)' }}>{label}</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Status change */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 8 }}>Cambiar Estado (Admin)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {P_STATUSES.map(s => (
              <button key={s.value} onClick={() => changeStatus(s.value)} disabled={saving || s.value === tournament.status}
                style={{ padding: '5px 11px', borderRadius: 4, border: `1px solid ${s.value === tournament.status ? 'transparent' : 'var(--grey-200)'}`, cursor: s.value === tournament.status ? 'default' : 'pointer', fontSize: 11, fontWeight: 700, background: s.value === tournament.status ? '#0a0a0a' : '#fff', color: s.value === tournament.status ? '#fff' : 'var(--grey-600)', opacity: saving ? 0.6 : 1 }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories + teams */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 10 }}>Categorías e Inscriptos</div>
          {tournament.categories.map(cat => {
            const catTeams = tournament.teams.filter(t => t.categoryId === cat.id);
            const enrolled = catTeams.filter(t => t.status === 'pending' || t.status === 'confirmed').length;
            const expanded = expandedCat === cat.id;
            return (
              <div key={cat.id} style={{ border: '1px solid var(--grey-200)', marginBottom: 8, borderRadius: 4, overflow: 'hidden' }}>
                <div onClick={() => setExpandedCat(expanded ? null : cat.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', background: expanded ? '#fafafa' : '#fff' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--grey-400)', marginLeft: 8 }}>{P_GENDER[cat.gender] ?? cat.gender}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{enrolled}/{cat.maxTeams}</span>
                    <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--grey-100)' }}>
                    {catTeams.length === 0 ? (
                      <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-400)', fontStyle: 'italic' }}>Sin inscriptos</div>
                    ) : catTeams.map(team => {
                      const tsCfg = {
                        pending:        { label: 'Pendiente',    bg: 'rgba(0,0,0,0.05)',        color: 'var(--grey-600)' },
                        confirmed:      { label: 'Confirmado',   bg: 'rgba(34,197,94,0.1)',     color: '#15803d' },
                        rejected:       { label: 'Rechazado',    bg: 'rgba(220,38,38,0.08)',    color: '#b91c1c' },
                        waitlisted:     { label: 'En espera',    bg: 'rgba(245,158,11,0.1)',    color: '#b45309' },
                        partial_review: { label: 'En revisión',  bg: 'rgba(234,179,8,0.15)',    color: '#92400e' },
                        unassigned:     { label: 'Sin categoría',bg: 'rgba(168,85,247,0.1)',    color: '#6d28d9' },
                      }[team.status] ?? { label: team.status, bg: '#f3f4f6', color: '#374151' };
                      return (
                        <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px', borderBottom: '1px solid var(--grey-50)', fontSize: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 600 }}>{team.player1Name}</span>
                            {team.player2Name && <span style={{ color: 'var(--grey-400)' }}> / {team.player2Name}</span>}
                            {team.player1Email && <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 1 }}>{team.player1Email}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: tsCfg.bg, color: tsCfg.color, borderRadius: 3 }}>{tsCfg.label}</span>
                            {team.status !== 'confirmed' && (
                              <button onClick={() => handleTeamStatus(team.id, 'confirmed')} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', fontWeight: 700, borderRadius: 3 }}>✓</button>
                            )}
                            {team.status !== 'rejected' && (
                              <button onClick={() => handleTeamStatus(team.id, 'rejected')} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer', fontWeight: 700, borderRadius: 3 }}>✕</button>
                            )}
                            {team.status === 'rejected' && (
                              <button onClick={() => handleTeamStatus(team.id, 'pending')} style={{ fontSize: 10, padding: '2px 6px', background: '#f3f4f6', color: '#374151', border: '1px solid var(--grey-200)', cursor: 'pointer', fontWeight: 700, borderRadius: 3 }}>↩</button>
                            )}
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

        {/* Danger zone */}
        <div style={{ borderTop: '1px solid rgba(220,38,38,0.2)', paddingTop: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#b91c1c', textTransform: 'uppercase', marginBottom: 10 }}>Zona de Peligro (Admin)</div>
          <button onClick={deleteTournament} disabled={saving}
            style={{ padding: '8px 16px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🗑 Eliminar torneo definitivamente
          </button>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 6 }}>
            Elimina el torneo y todos los datos (equipos, partidos). Irreversible.
          </div>
        </div>

        {saving && (
          <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 12, color: '#166534', marginBottom: 12 }}>
            Guardando cambios…
          </div>
        )}

        <button onClick={onClose} style={{ padding: '10px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Cerrar
        </button>
      </div>
    </>
  );
}

// ── Tournament Detail Drawer ──────────────────────────────────────────────────

function TournamentDetailDrawer({
  summary,
  onClose,
  onStatusChange,
}: {
  summary: SATournament;
  onClose: () => void;
  onStatusChange: (id: string, status: SATournament['status']) => void;
}) {
  const [full, setFull] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [editScore, setEditScore] = useState<{ roundIdx: number; courtIdx: number; p1: string; p2: string } | null>(null);
  const [scoreInput, setScoreInput] = useState({ p1: '', p2: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Try localStorage first (same browser as creator)
    const local = getTournament(summary.id) ?? getAllTournaments().find(t => t.name === summary.name) ?? null;
    if (local) {
      setFull(local);
      setLoading(false);
      return;
    }
    // Fall back to Supabase data column
    getFullTournamentFromSupabase(summary.id).then(sbData => {
      if (sbData) setFull(sbData as unknown as Tournament);
      setLoading(false);
    });
  }, [summary.id, summary.name]);

  async function persistToSupabase(updated: Tournament) {
    setSaving(true);
    try {
      await upsertTournamentToSupabase(updated as unknown as Record<string, unknown>);
    } finally {
      setSaving(false);
    }
  }

  function playerName(id: string): string {
    return full?.players.find(p => p.id === id)?.name ?? id;
  }

  function handleSaveScore() {
    if (!full || !editScore) return;
    const p1Score = Number(scoreInput.p1);
    const p2Score = Number(scoreInput.p2);
    if (isNaN(p1Score) || isNaN(p2Score)) return;

    const rounds: GameRound[] = full.rounds.map((r, ri) => {
      if (ri !== editScore.roundIdx) return r;
      const courts: CourtMatch[] = r.courts.map((c, ci) => {
        if (ci !== editScore.courtIdx) return c;
        return { ...c, pair1Score: p1Score, pair2Score: p2Score, status: 'completed' as const };
      });
      return { ...r, courts };
    });
    const updated: Tournament = { ...full, rounds };
    setFull(updated);
    saveTournament(updated);
    persistToSupabase(updated);
    setEditScore(null);
  }

  const statusColors: Record<SATournament['status'], { bg: string; color: string; label: string }> = {
    ongoing:   { bg: '#dcfce7', color: '#166534', label: 'En curso' },
    upcoming:  { bg: '#dbeafe', color: '#1e40af', label: 'Próximo' },
    completed: { bg: '#f3f4f6', color: '#374151', label: 'Completado' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado' },
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1009 }} onClick={onClose} />
      <div
        style={{ position: 'fixed', top: 0, right: 0, width: 560, height: '100vh', background: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', zIndex: 1010, overflowY: 'auto', padding: '32px 36px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Torneo</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{summary.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', lineHeight: 1 }}>×</button>
        </div>

        {/* Status + date */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <span style={{ background: statusColors[summary.status].bg, color: statusColors[summary.status].color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
            {statusColors[summary.status].label}
          </span>
          <span style={{ fontSize: 13, color: 'var(--grey-400)' }}>{summary.date}</span>
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
          {[
            { label: 'Club', value: summary.club || '—' },
            { label: 'Ciudad', value: summary.city || '—' },
            { label: 'Formato', value: summary.format || '—' },
            { label: 'Jugadores', value: String(summary.players) },
            { label: 'Rondas jugadas', value: String(summary.rounds) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--grey-100)', fontSize: 13 }}>
              <span style={{ color: 'var(--grey-500)' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Status change */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 8 }}>Cambiar Estado</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['ongoing', 'upcoming', 'completed', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => onStatusChange(summary.id, s)}
                style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: summary.status === s ? '#0a0a0a' : '#fff', color: summary.status === s ? '#fff' : 'var(--grey-600)' }}>
                {statusColors[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Reorganization request banner */}
        {full?.reorganizationRequested && (
          <div style={{ marginBottom: 24, padding: '14px 18px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#854d0e', marginBottom: 4 }}>
                  ⚠ Solicitud de reorganización de equipos
                </div>
                <div style={{ fontSize: 12, color: '#a16207' }}>
                  El creador necesita editar los equipos. Al revertir, el torneo vuelve a estado de gestión y se borran las rondas jugadas.
                </div>
                {full.reorganizationRequestedAt && (
                  <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 6 }}>
                    Solicitado: {new Date(full.reorganizationRequestedAt).toLocaleString('es-ES')}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const updated: Tournament = {
                    ...full,
                    status: 'created',
                    rounds: [],
                    currentRound: 0,
                    reorganizationRequested: false,
                    reorganizationRequestedAt: undefined,
                  };
                  saveTournament(updated);
                  persistToSupabase(updated);
                  setFull(updated);
                  onStatusChange(summary.id, 'upcoming');
                }}
                style={{ padding: '8px 16px', background: '#854d0e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
              >
                Revertir a Gestión
              </button>
            </div>
          </div>
        )}

        {/* Participants */}
        {full && full.players.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 10 }}>
              Participantes ({full.players.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--grey-200)', borderRadius: 4, overflow: 'hidden' }}>
              {full.players.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i % 2 === 0 ? '#fff' : 'var(--grey-50)', fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{(p as { level?: string }).level ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rounds & scores */}
        {full && full.rounds.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 12 }}>
              Rondas y Scores
            </div>
            {full.rounds.map((round, ri) => (
              <div key={ri} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-600)', letterSpacing: '0.08em', marginBottom: 6 }}>
                  RONDA {round.num} — {round.status === 'completed' ? 'Completada' : round.status === 'active' ? 'En curso' : 'Pendiente'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {round.courts.map((court, ci) => {
                    const isEditing = editScore?.roundIdx === ri && editScore?.courtIdx === ci;
                    const names1 = court.pair1.map(playerName).join(' / ');
                    const names2 = court.pair2.map(playerName).join(' / ');
                    return (
                      <div key={ci} style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-100)', borderRadius: 4, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? 10 : 0 }}>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ fontWeight: 600 }}>{names1}</span>
                            <span style={{ color: 'var(--grey-400)', margin: '0 8px' }}>vs</span>
                            <span style={{ fontWeight: 600 }}>{names2}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                              {court.pair1Score ?? '—'} – {court.pair2Score ?? '—'}
                            </span>
                            <button
                              onClick={() => {
                                setEditScore({ roundIdx: ri, courtIdx: ci, p1: String(court.pair1Score ?? ''), p2: String(court.pair2Score ?? '') });
                                setScoreInput({ p1: String(court.pair1Score ?? ''), p2: String(court.pair2Score ?? '') });
                              }}
                              style={{ fontSize: 11, color: 'var(--turf-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                        {isEditing && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                            <input type="number" min={0} value={scoreInput.p1}
                              onChange={e => setScoreInput(s => ({ ...s, p1: e.target.value }))}
                              style={{ width: 60, padding: '6px 10px', border: '1px solid var(--grey-300)', borderRadius: 4, fontSize: 14, fontWeight: 700, textAlign: 'center' }} />
                            <span style={{ color: 'var(--grey-400)' }}>–</span>
                            <input type="number" min={0} value={scoreInput.p2}
                              onChange={e => setScoreInput(s => ({ ...s, p2: e.target.value }))}
                              style={{ width: 60, padding: '6px 10px', border: '1px solid var(--grey-300)', borderRadius: 4, fontSize: 14, fontWeight: 700, textAlign: 'center' }} />
                            <button onClick={() => {
                              if (!full) return;
                              const rounds = full.rounds.map((r, rIdx) => rIdx !== ri ? r : {
                                ...r,
                                courts: r.courts.map((c, cIdx) => cIdx !== ci ? c : {
                                  ...c, pair1Score: Number(scoreInput.p1), pair2Score: Number(scoreInput.p2), status: 'completed' as const,
                                }),
                              });
                              const updated = { ...full, rounds };
                              setFull(updated);
                              saveTournament(updated);
                              persistToSupabase(updated);
                              setEditScore(null);
                            }}
                              style={{ padding: '6px 14px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                              Guardar
                            </button>
                            <button onClick={() => setEditScore(null)}
                              style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)' }}>
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--grey-400)' }}>
            Cargando datos del torneo…
          </div>
        )}

        {!loading && !full && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--grey-300)' }}>
            No hay datos detallados disponibles para este torneo.
          </div>
        )}

        {saving && (
          <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 12, color: '#166534', marginBottom: 12 }}>
            Guardando cambios en Supabase…
          </div>
        )}

        <button onClick={onClose} style={{ padding: '10px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Cerrar
        </button>
      </div>
    </>
  );
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<SATournament[]>([]);
  const [corrections, setCorrections] = useState<ScoreCorrectionRequest[]>([]);
  const [tab, setTab] = useState<'tournaments' | 'corrections' | 'personalizado'>('tournaments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [approveConfirm, setApproveConfirm] = useState<{ step: number; corrId: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ corrId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [selectedTournament, setSelectedTournament] = useState<SATournament | null>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [reorgRequestIds, setReorgRequestIds] = useState<Set<string>>(new Set());
  const [personalizados, setPersonalizados] = useState<PersonalizadoTournament[]>([]);
  const [selectedPersonalizado, setSelectedPersonalizado] = useState<PersonalizadoTournament | null>(null);
  // ── CSV Import ──────────────────────────────────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvFile, setCsvFile] = useState<'csv' | 'xlsx' | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const tFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTournaments(getSATournaments());
    setCorrections(getScoreCorrections().filter(c => c.type === 'tournament'));

    const localAll = getAllTournaments();
    const ids = new Set(localAll.filter(t => t.reorganizationRequested).map(t => t.id));
    setReorgRequestIds(ids);

    function fetchFromSupabase() {
      getSATournamentsFromSupabase().then(sbT => {
        if (sbT && sbT.length > 0) {
          setTournaments(sbT);
          saveSATournaments(sbT);
        }
      });
      fetchCorrectionsFromSupabase().then(remote => {
        const tCorrections = remote.filter(c => c.type === 'tournament');
        if (tCorrections.length > 0) {
          mergeCorrectionsFromSupabase(tCorrections);
          setCorrections(getScoreCorrections().filter(c => c.type === 'tournament'));
        }
      });
    }

    fetchFromSupabase();
    const interval = setInterval(fetchFromSupabase, 15000);

    async function fetchPersonalizados() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: tRows } = await supabase
        .from('personalizado_tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (!tRows || tRows.length === 0) { setPersonalizados([]); return; }
      const ids = (tRows as Record<string, unknown>[]).map(r => r.id as string);
      const { data: teamRows } = await supabase
        .from('personalizado_teams')
        .select('*')
        .in('tournament_id', ids);
      const teamsByTid: Record<string, PersonalizadoTeam[]> = {};
      for (const row of (teamRows ?? []) as Record<string, unknown>[]) {
        const tid = row.tournament_id as string;
        if (!teamsByTid[tid]) teamsByTid[tid] = [];
        teamsByTid[tid].push(rowToTeam(row));
      }
      const result = (tRows as Record<string, unknown>[]).map(row => {
        const t = rowToTournament(row);
        return { ...t, teams: teamsByTid[t.id] ?? [] };
      });
      setPersonalizados(result);
    }
    fetchPersonalizados();
    const pInterval = setInterval(fetchPersonalizados, 20000);

    return () => { clearInterval(interval); clearInterval(pInterval); };
  }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  // ── CSV Import handlers ────────────────────────────────────────────────────
  function handleTournamentFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) { setCsvFile('xlsx'); return; }
    setCsvFile('csv');
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const separator = text.includes(';') ? ';' : ',';
      const rows = text.split(/\r?\n/).filter(Boolean).map(line =>
        line.split(separator).map(cell => cell.replace(/^"|"$/g, '').trim())
      );
      setCsvRows(rows);
      const autoMap: Record<string, string> = {};
      const fieldMap: Record<string, string> = {
        nombre: 'name', name: 'name', torneo: 'name',
        club: 'club', ciudad: 'city', city: 'city',
        fecha: 'date', date: 'date',
        formato: 'format', format: 'format',
        jugadores: 'players', players: 'players',
        rondas: 'rounds', rounds: 'rounds',
        estado: 'status', status: 'status',
      };
      (rows[0] ?? []).forEach((h, i) => {
        const key = h.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
        if (fieldMap[key]) autoMap[String(i)] = fieldMap[key];
      });
      setColumnMap(autoMap);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  function handleImportTournaments() {
    if (!csvRows.length) return;
    const reverseMap: Record<string, number> = {};
    Object.entries(columnMap).forEach(([idx, field]) => { reverseMap[field] = Number(idx); });
    const get = (row: string[], field: string) => (reverseMap[field] !== undefined ? row[reverseMap[field]] : '') ?? '';
    const statusMap: Record<string, SATournament['status']> = {
      'en curso': 'ongoing', ongoing: 'ongoing', 'en vivo': 'ongoing',
      proximo: 'upcoming', upcoming: 'upcoming', próximo: 'upcoming',
      finalizado: 'completed', completed: 'completed',
      cancelado: 'cancelled', cancelled: 'cancelled',
    };
    const newTs: SATournament[] = csvRows.slice(1).filter(r => r.some(c => c)).map((row, i) => ({
      id: `t-imp-${Date.now()}-${i}`,
      name: get(row, 'name') || `Torneo importado ${i + 1}`,
      club: get(row, 'club') || '',
      city: get(row, 'city') || '',
      date: get(row, 'date') || new Date().toISOString().split('T')[0],
      format: get(row, 'format') || 'Americano',
      players: parseInt(get(row, 'players'), 10) || 0,
      rounds: parseInt(get(row, 'rounds'), 10) || 0,
      status: statusMap[get(row, 'status').toLowerCase()] ?? 'upcoming',
    }));
    const all = getSATournaments();
    saveSATournaments([...all, ...newTs]);
    setTournaments(getSATournaments());
    toast(`${newTs.length} torneo(s) importado(s) correctamente`);
    setShowImportModal(false);
    setCsvRows([]);
    setCsvFile(null);
    setColumnMap({});
  }

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <span style={{ color: 'var(--grey-300)', marginLeft: 4, fontSize: 9 }}>↕</span>;
    return <span style={{ color: 'var(--turf-green)', marginLeft: 4, fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  const filtered = tournaments.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.club.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchFormat = formatFilter === 'all' || t.format === formatFilter;
    return matchSearch && matchStatus && matchFormat;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    else if (sortKey === 'date') { av = a.date; bv = b.date; }
    else if (sortKey === 'players') { av = a.players; bv = b.players; }
    else if (sortKey === 'status') { av = a.status; bv = b.status; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pageTournaments = sorted.slice(pageStart, pageEnd);

  function renderPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: 'pointer', background: p === safePage ? '#0a0a0a' : '#fff', color: p === safePage ? '#fff' : 'var(--grey-600)', fontSize: 12, fontWeight: p === safePage ? 700 : 400 }}>{p}</button>
      ));
    }
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (safePage > 3) pages.push('...');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages.map((p, i) => p === '...'
      ? <span key={`e${i}`} style={{ padding: '4px 6px', fontSize: 12, color: 'var(--grey-400)' }}>…</span>
      : <button key={p} onClick={() => setPage(p as number)} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: 'pointer', background: p === safePage ? '#0a0a0a' : '#fff', color: p === safePage ? '#fff' : 'var(--grey-600)', fontSize: 12, fontWeight: p === safePage ? 700 : 400 }}>{p}</button>
    );
  }

  function handleApproveStep1(corrId: string) { setApproveConfirm({ step: 1, corrId }); }
  function handleApproveStep2() { if (!approveConfirm) return; setApproveConfirm({ ...approveConfirm, step: 2 }); }
  async function handleApproveFinal() {
    if (!approveConfirm) return;
    const corr = corrections.find(c => c.id === approveConfirm.corrId);
    updateScoreCorrectionStatus(approveConfirm.corrId, 'approved', { reviewedBy: 'Super Admin' });
    setCorrections(getScoreCorrections().filter(c => c.type === 'tournament'));
    setApproveConfirm(null);
    toast('Correccion aprobada y aplicada');

    // Apply the score correction to the tournament in Supabase
    if (corr) {
      try {
        const sbData = await getFullTournamentFromSupabase(corr.entityId);
        if (sbData) {
          const t = sbData as unknown as Tournament;
          const [p1Str, p2Str] = corr.requestedScore.split(/[-–]/);
          const p1Score = parseInt(p1Str?.trim() ?? '', 10);
          const p2Score = parseInt(p2Str?.trim() ?? '', 10);
          if (!isNaN(p1Score) && !isNaN(p2Score)) {
            const roundIdx = corr.roundNum - 1;
            const courtIdx = corr.courtNum - 1;
            const rounds = (t.rounds ?? []).map((r, ri) => ri !== roundIdx ? r : {
              ...r,
              courts: r.courts.map((c, ci) => ci !== courtIdx ? c : {
                ...c, pair1Score: p1Score, pair2Score: p2Score, status: 'completed' as const,
              }),
            });
            await upsertTournamentToSupabase({ ...t, rounds } as unknown as Record<string, unknown>);
          }
        }
      } catch { /* non-blocking */ }
    }
  }

  function handleReject(corrId: string) {
    updateScoreCorrectionStatus(corrId, 'rejected', { reviewedBy: 'Super Admin' });
    setCorrections(getScoreCorrections().filter(c => c.type === 'tournament'));
    setRejectConfirm(null);
    toast('Correccion rechazada');
  }

  const corrById = Object.fromEntries(corrections.map(c => [c.id, c]));
  const approveTarget = approveConfirm ? corrById[approveConfirm.corrId] : null;
  const pendingCorrCount = corrections.filter(c => c.status === 'pending').length;

  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', fontFamily: 'var(--font-body)' };

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-body)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.ok ? '#0a0a0a' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: 6, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderLeft: `3px solid ${t.ok ? 'var(--turf-green)' : '#fca5a5'}` }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Vista</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Torneos</h1>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          style={{ padding: '9px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--grey-600)', textTransform: 'uppercase' }}
        >
          Importar CSV
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 24 }}>
        {([
          { key: 'tournaments', label: `Lista de Torneos (${tournaments.length})` },
          { key: 'corrections', label: `Correcciones de Score (${pendingCorrCount} pendiente${pendingCorrCount !== 1 ? 's' : ''})` },
          { key: 'personalizado', label: `Torneos Personalizados (${personalizados.length})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: tab === key ? 'var(--black)' : 'var(--grey-400)',
            borderBottom: tab === key ? '2px solid var(--turf-green)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'tournaments' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Buscar por nombre o club..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 280, outline: 'none', fontFamily: 'var(--font-body)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 170, outline: 'none', fontFamily: 'var(--font-body)' }}>
              <option value="all">Todos los estados</option>
              <option value="ongoing">En curso</option>
              <option value="upcoming">Proximos</option>
              <option value="completed">Finalizados</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <select value={formatFilter} onChange={e => { setFormatFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 160, outline: 'none', fontFamily: 'var(--font-body)' }}>
              <option value="all">Todos los formatos</option>
              <option value="Americano">Americano</option>
              <option value="Mexicano">Mexicano</option>
              <option value="Round Robin">Round Robin</option>
            </select>
            <button
              onClick={() => exportCSV(filtered.map(t => ({ Nombre: t.name, Club: t.club, Ciudad: t.city, Fecha: t.date, Formato: t.format, Jugadores: t.players, Rondas: t.rounds, Estado: t.status })), 'torneos.csv')}
              style={{ padding: '8px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--grey-600)', letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 'auto' }}
            >
              Exportar CSV
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                    <th onClick={() => handleSort('name')} style={thStyle}>Nombre <SortIcon col="name" /></th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Club</th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Ciudad</th>
                    <th onClick={() => handleSort('date')} style={thStyle}>Fecha <SortIcon col="date" /></th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Formato</th>
                    <th onClick={() => handleSort('players')} style={{ ...thStyle, textAlign: 'center' }}>Jugadores <SortIcon col="players" /></th>
                    <th style={{ ...thStyle, cursor: 'default', textAlign: 'center' }}>Rondas</th>
                    <th onClick={() => handleSort('status')} style={thStyle}>Estado <SortIcon col="status" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pageTournaments.map(t => (
                    <tr key={t.id}
                      style={{ borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}
                      onClick={() => setSelectedTournament(t)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--black)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.name}
                          {reorgRequestIds.has(t.id) && (
                            <span title="Reorganización solicitada" style={{ fontSize: 11, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 4, padding: '1px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              ⚠ Reorg.
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--grey-600)', fontSize: 12 }}>{t.club}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--grey-600)', fontSize: 12 }}>{t.city}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{t.format}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{t.players}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>{t.rounds}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {pageTournaments.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>No se encontraron torneos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {sorted.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: 'var(--grey-500)' }}>
              <span>Mostrando {pageStart + 1}–{pageEnd} de {sorted.length}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: safePage === 1 ? 'default' : 'pointer', background: '#fff', color: safePage === 1 ? 'var(--grey-300)' : 'var(--grey-600)', fontSize: 12 }}>Anterior</button>
                {renderPageNumbers()}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: safePage === totalPages ? 'default' : 'pointer', background: '#fff', color: safePage === totalPages ? 'var(--grey-300)' : 'var(--grey-600)', fontSize: 12 }}>Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'corrections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {corrections.map(corr => (
            <div key={corr.id} style={{
              background: '#fff',
              border: `1px solid ${corr.status === 'pending' ? 'var(--grey-200)' : corr.status === 'approved' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 6,
              padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, fontFamily: 'var(--font-display)' }}>{corr.entityName}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
                    Ronda {corr.roundNum} — Cancha {corr.courtNum} — Solicitado por: <strong>{corr.requestedBy}</strong>
                  </div>
                </div>
                <CorrStatusBadge status={corr.status} />
              </div>

              <div style={{ display: 'flex', gap: 24, marginBottom: 14, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Score actual</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#dc2626' }}>{corr.currentScore}</div>
                </div>
                <div style={{ fontSize: 18, color: 'var(--grey-300)', fontWeight: 300 }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Score solicitado</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--turf-green)' }}>{corr.requestedScore}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--grey-600)', marginBottom: 14, fontStyle: 'italic', background: 'var(--grey-50)', padding: '10px 14px', borderRadius: 4 }}>
                &ldquo;{corr.reason}&rdquo;
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                  {new Date(corr.createdAt).toLocaleString('es-ES')}
                </div>
                {corr.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setRejectConfirm({ corrId: corr.id })} style={{ padding: '8px 18px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Rechazar
                    </button>
                    <button onClick={() => handleApproveStep1(corr.id)} style={{ padding: '8px 18px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Aprobar correccion
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'personalizado' && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Organizador</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Categorías</th>
                  <th style={{ ...thStyle, textAlign: 'center', cursor: 'default' }}>Equipos</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {personalizados.map(pt => {
                  const enrolled = pt.teams.filter(t => t.status === 'pending' || t.status === 'confirmed').length;
                  const capacity = pt.categories.reduce((s, c) => s + c.maxTeams, 0);
                  const psCfg = P_STATUSES.find(s => s.value === pt.status) ?? P_STATUSES[0];
                  return (
                    <tr key={pt.id}
                      style={{ borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}
                      onClick={() => setSelectedPersonalizado(pt)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--black)' }}>{pt.name}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--grey-500)' }}>{pt.code}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-600)' }}>{pt.creatorName || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{pt.date || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{pt.categories.length}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: 12 }}>{enrolled}/{capacity}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: psCfg.bg, color: psCfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{psCfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {personalizados.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>No hay torneos personalizados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PERSONALIZADO DETAIL DRAWER */}
      {selectedPersonalizado && (
        <PersonalizadoDetailDrawer
          tournament={selectedPersonalizado}
          onClose={() => setSelectedPersonalizado(null)}
          onUpdated={updated => {
            setPersonalizados(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPersonalizado(updated);
          }}
          onDeleted={id => {
            setPersonalizados(prev => prev.filter(p => p.id !== id));
            setSelectedPersonalizado(null);
          }}
        />
      )}

      {/* DETAIL DRAWER */}
      {selectedTournament && (
        <TournamentDetailDrawer
          summary={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onStatusChange={(id, status) => {
            const updated = tournaments.map(t => t.id === id ? { ...t, status } : t);
            setTournaments(updated);
            saveSATournaments(updated);
            setReorgRequestIds(prev => { const s = new Set(prev); s.delete(id); return s; });
          }}
        />
      )}

      {/* APPROVE STEP 1 */}
      {approveConfirm?.step === 1 && approveTarget && (
        <Modal onClose={() => setApproveConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Aprobar Correccion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 8 }}>
            Estas a punto de cambiar el score de <strong>{approveTarget.entityName}</strong>:
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', background: 'var(--grey-50)', borderRadius: 4, marginBottom: 20, fontSize: 14 }}>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{approveTarget.currentScore}</span>
            <span style={{ color: 'var(--grey-400)' }}>→</span>
            <span style={{ fontWeight: 700, color: 'var(--turf-green)' }}>{approveTarget.requestedScore}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setApproveConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleApproveStep2} style={{ padding: '9px 20px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Continuar</button>
          </div>
        </Modal>
      )}

      {/* APPROVE STEP 2 */}
      {approveConfirm?.step === 2 && approveTarget && (
        <Modal onClose={() => setApproveConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Confirmar Modificacion de Score</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            Esta accion modificara el score permanentemente. ¿Confirmas la correccion de <strong>{approveTarget.entityName}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setApproveConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleApproveFinal} style={{ padding: '9px 20px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Confirmar y aplicar</button>
          </div>
        </Modal>
      )}

      {/* REJECT CONFIRM */}
      {rejectConfirm && (
        <Modal onClose={() => setRejectConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Rechazar Correccion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas el rechazo de esta solicitud de correccion de score? El score actual se mantendra.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setRejectConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={() => handleReject(rejectConfirm.corrId)} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Rechazar</button>
          </div>
        </Modal>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <Modal onClose={() => { setShowImportModal(false); setCsvRows([]); setCsvFile(null); }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>Importar Torneos — CSV</h2>

          {!csvFile && (
            <div
              onClick={() => tFileRef.current?.click()}
              style={{ border: '2px dashed var(--grey-300)', borderRadius: 8, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', color: 'var(--grey-400)', marginBottom: 16 }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Arrastrá un archivo CSV o hacé clic para seleccionar</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Formato: .csv (separado por coma o punto y coma)</div>
              <div style={{ fontSize: 11, marginTop: 8, color: 'var(--grey-300)' }}>
                Columnas: Nombre, Club, Ciudad, Fecha, Formato, Jugadores, Rondas, Estado
              </div>
              <input ref={tFileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleTournamentFileSelect} />
            </div>
          )}

          {csvFile === 'xlsx' && (
            <div style={{ padding: '20px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, color: '#9a3412', fontSize: 13, marginBottom: 16 }}>
              Soporte XLSX próximamente — usá CSV por ahora.
            </div>
          )}

          {csvFile === 'csv' && csvRows.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 10 }}>
                Vista previa ({csvRows.length - 1} torneos)
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--grey-200)', borderRadius: 4, marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {csvRows.slice(0, 6).map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--grey-100)', background: ri === 0 ? 'var(--grey-50)' : '#fff' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '6px 10px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: ri === 0 ? 700 : 400 }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 10 }}>Mapeo de columnas</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {(csvRows[0] ?? []).map((header, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--grey-600)', minWidth: 80, fontWeight: 600 }}>{header}</span>
                    <select
                      value={columnMap[String(idx)] ?? ''}
                      onChange={e => setColumnMap(m => ({ ...m, [String(idx)]: e.target.value }))}
                      style={{ border: '1px solid var(--grey-200)', borderRadius: 4, padding: '5px 8px', fontSize: 12, flex: 1, outline: 'none' }}
                    >
                      <option value="">— Ignorar —</option>
                      <option value="name">Nombre</option>
                      <option value="club">Club</option>
                      <option value="city">Ciudad</option>
                      <option value="date">Fecha</option>
                      <option value="format">Formato</option>
                      <option value="players">Jugadores</option>
                      <option value="rounds">Rondas</option>
                      <option value="status">Estado</option>
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setCsvRows([]); setCsvFile(null); }} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Volver</button>
                <button onClick={handleImportTournaments} style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Importar {csvRows.length - 1} torneo(s)
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
