'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import {
  loadPersonalizadoById,
  saveControlPanel,
  generateGroupSchedule,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type PersonalizadoMatch,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px clamp(14px, 3vw, 24px)', marginBottom: 16,
};

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    loadPersonalizadoById(id).then(t => { if (active) { setTournament(t); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  const teamName = useMemo(() => {
    const map = new Map<string, string>();
    for (const tm of tournament?.teams ?? []) {
      map.set(tm.id, tm.player2Name ? `${tm.player1Name} / ${tm.player2Name}` : tm.player1Name);
    }
    return (tid: string) => map.get(tid) ?? '—';
  }, [tournament]);

  const catName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of tournament?.categories ?? []) map.set(c.id, c.name);
    return (cid: string) => map.get(cid) ?? '';
  }, [tournament]);

  const matches = tournament?.config?.matches ?? [];

  // Teams must be assigned to groups before generating.
  const assignedCount = (tournament?.teams ?? []).filter(t => (t.status === 'pending' || t.status === 'confirmed') && t.groupId).length;

  async function handleGenerate() {
    if (!tournament) return;
    setWorking(true);
    const generated = generateGroupSchedule(tournament);
    const config = { ...DEFAULT_CONTROL_CONFIG, ...(tournament.config ?? {}), matches: generated };
    const res = await saveControlPanel({
      id: tournament.id,
      categories: tournament.categories,
      config,
      status: tournament.status === 'configured' || tournament.status === 'registration_open' ? 'live' : undefined,
    });
    setWorking(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo generar', 'error'); return; }
    const refreshed = await loadPersonalizadoById(id);
    setTournament(refreshed);
    showToast(`Calendario generado: ${generated.length} partidos`, 'success');
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>;
  if (!tournament) {
    return <div style={{ padding: '40px clamp(16px,4vw,40px)', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
    </div>;
  }

  // Group matches by time slot for the timeline view.
  const bySlot = new Map<number, PersonalizadoMatch[]>();
  for (const m of matches) {
    const arr = bySlot.get(m.slot) ?? [];
    arr.push(m);
    bySlot.set(m.slot, arr);
  }
  const slots = [...bySlot.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div style={{ padding: '40px clamp(16px, 4vw, 40px) 120px', maxWidth: 1000, margin: '0 auto' }}>
      <Link
        href={`/dashboard/player/tournaments/personalizado/${id}`}
        style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}
      >
        ← Volver al torneo
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            Calendario de partidos
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            {tournament.name}
          </h1>
        </div>
        <button
          type="button" onClick={handleGenerate} disabled={working || assignedCount < 2}
          style={{
            padding: '12px 22px', border: 'none', background: 'var(--black)', color: 'var(--neon)',
            cursor: working || assignedCount < 2 ? 'not-allowed' : 'pointer', opacity: assignedCount < 2 ? 0.5 : 1,
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          {working ? 'Generando…' : matches.length > 0 ? 'Regenerar calendario' : 'Generar calendario'}
        </button>
      </div>

      {assignedCount < 2 && (
        <div style={{ ...card, background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.25)', color: '#92400e', fontSize: 13, lineHeight: 1.6 }}>
          Primero asigna los equipos a sus grupos en el{' '}
          <Link href={`/dashboard/player/tournaments/personalizado/${id}/control`} style={{ color: '#92400e', fontWeight: 700 }}>Panel de Control</Link>{' '}
          (bloque J). Necesitas al menos 2 equipos asignados para generar el calendario.
        </div>
      )}

      {matches.length === 0 && assignedCount >= 2 && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
          Aún no hay calendario. Pulsa <strong>Generar calendario</strong> para crear los partidos de la fase de grupos.
        </div>
      )}

      {slots.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 14 }}>
          {matches.length} partidos · {slots.length} franjas horarias · {tournament.config?.courtNames?.length ?? tournament.courts} canchas
        </div>
      )}

      {/* Timeline by slot */}
      {slots.map(([slot, slotMatches]) => (
        <div key={slot} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{slotMatches[0].time}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Franja {slot + 1}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {slotMatches.map(m => (
              <div key={m.id} style={{ border: '1px solid var(--grey-100)', padding: '12px 14px', background: 'var(--grey-50, #fafafa)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                    {m.courtName}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(0,0,0,0.05)', color: 'var(--grey-500)' }}>
                    {catName(m.categoryId)} · Grupo {m.groupLabel}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{teamName(m.teamAId)}</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)', margin: '3px 0', fontWeight: 700 }}>vs</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{teamName(m.teamBId)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
