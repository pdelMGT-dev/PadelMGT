'use client';

import React, { use, useEffect, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { loadPersonalizadoByCode, type PersonalizadoTournament } from '@/lib/personalizado-store';
import { TournamentTabs } from '@/app/dashboard/player/tournaments/personalizado/[id]/TournamentTabs';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', registration_open: 'Inscripción Abierta', configured: 'Configurado',
  live: 'En Vivo', finished: 'Finalizado', cancelled: 'Cancelado',
};

export default function PersonalizadoLivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const t = await loadPersonalizadoByCode(code);
      if (!active) return;
      setTournament(t);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [code]);

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--black, #0a0a0a)', color: 'var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>Cargando…</div>;
  }

  if (!tournament) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--black, #0a0a0a)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center' }}>
        <CalendarDays size={36} style={{ color: 'var(--neon)' }} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Torneo no encontrado</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>Verificá el código <strong>{code}</strong>.</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5' }}>
      {/* Public header */}
      <div style={{ background: 'var(--black, #0a0a0a)', color: '#fff', padding: '28px clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>{tournament.name}</h1>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', background: tournament.status === 'live' ? 'var(--neon)' : 'rgba(255,255,255,0.12)', color: tournament.status === 'live' ? 'var(--black)' : '#fff' }}>
              {STATUS_LABELS[tournament.status] ?? tournament.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {tournament.date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CalendarDays size={14} /> {tournament.date} · {tournament.time}</span>}
            {tournament.locationName && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={14} /> {tournament.locationName}</span>}
            {(tournament.city || tournament.country) && <span>{[tournament.city, tournament.country].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
      </div>

      {/* Read-only tabs */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)' }}>
        <TournamentTabs tournament={tournament} canManage={false} canEditResults={false} onUpdate={setTournament} />
      </div>

      <div style={{ textAlign: 'center', padding: '24px 16px', fontSize: 11, color: 'var(--grey-400)' }}>
        Vista pública · PadelMGT
      </div>
    </div>
  );
}
