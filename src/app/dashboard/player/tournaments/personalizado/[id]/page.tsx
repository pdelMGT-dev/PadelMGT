'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  getPersonalizado,
  savePersonalizado,
  calcOpeningPrice,
  setTeamStatus,
  enrolledCount,
  type PersonalizadoTournament,
} from '@/lib/personalizado-store';

// ── Shared styles ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};
const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};

const STATUS_LABELS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'BORRADOR',
  registration_open: 'INSCRIPCIÓN ABIERTA',
  live: 'EN VIVO',
  finished: 'FINALIZADO',
};

const STATUS_COLORS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'rgba(0,0,0,0.12)',
  registration_open: 'rgba(214,255,0,0.15)',
  live: 'rgba(34,197,94,0.15)',
  finished: 'rgba(156,163,175,0.15)',
};

const STATUS_TEXT_COLORS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'var(--grey-500)',
  registration_open: '#6b7a00',
  live: '#15803d',
  finished: 'var(--grey-400)',
};

const FORMAT_LABELS: Record<string, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  round_robin: 'Round Robin',
  knockout: 'Knockout',
};

const GENDER_LABELS: Record<string, string> = {
  libre: 'Libre', masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PersonalizadoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const t = getPersonalizado(id);
    setTournament(t);
    setLoading(false);
  }, [id]);

  // Post-payment return: flip status to registration_open (simulates webhook for dev/MVP).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('registration') === 'opened') {
      const t = getPersonalizado(id);
      if (t && t.status === 'draft') {
        savePersonalizado({ ...t, status: 'registration_open', openedAt: new Date().toISOString() });
        setTournament(getPersonalizado(id));
        window.history.replaceState({}, '', `/dashboard/player/tournaments/personalizado/${id}`);
      }
    }
  }, [id]);

  async function handleOpenRegistration() {
    const t = getPersonalizado(id);
    if (!t) return;
    setOpening(true);
    try {
      const price = calcOpeningPrice(t);
      const res = await fetch('/api/stripe/open-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: t.id, tournamentCode: t.code, price, userEmail: undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || 'No se pudo iniciar el pago');
        setOpening(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setOpening(false);
      alert('Error de red al iniciar el pago');
    }
  }

  function handleSetTeamStatus(teamId: string, status: 'confirmed' | 'rejected') {
    setTeamStatus(id, teamId, status);
    setTournament(getPersonalizado(id));
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
        <Link
          href="/dashboard/player/tournaments"
          style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}
        >
          ← Mis Torneos
        </Link>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
      </div>
    );
  }

  const registrationUrl = `${origin}/inscripcion/${tournament.code}`;
  const openPrice = calcOpeningPrice(tournament);

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
      {/* Back link */}
      <Link
        href="/dashboard/player/tournaments"
        style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}
      >
        ← Mis Torneos
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            {tournament.name}
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '4px 10px',
            background: STATUS_COLORS[tournament.status],
            color: STATUS_TEXT_COLORS[tournament.status],
            border: '1px solid currentColor',
          }}>
            {STATUS_LABELS[tournament.status]}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {tournament.date && <span>📅 {tournament.date} · {tournament.time}</span>}
          {tournament.locationName && <span>📍 {tournament.locationName}</span>}
          {(tournament.city || tournament.country) && (
            <span>{[tournament.city, tournament.country].filter(Boolean).join(', ')}</span>
          )}
          <span>Código: <strong style={{ color: 'var(--black)' }}>{tournament.code}</strong></span>
        </div>
      </div>

      {/* Categories */}
      {tournament.categories.map((cat) => {
        const categoryTeams = tournament.teams.filter(t => t.categoryId === cat.id);
        return (
          <div key={cat.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                  {GENDER_LABELS[cat.gender]} · {FORMAT_LABELS[cat.format]} · {cat.modalidad === 'individual' ? 'Individual' : 'Parejas'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>
                  {enrolledCount(tournament, cat.id)} / {cat.maxTeams} equipos inscritos
                </div>
                {cat.registrationFee > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>Cuota: ${cat.registrationFee}</div>
                )}
              </div>
            </div>

            {/* QR code when registration is open */}
            {tournament.status === 'registration_open' && (
              <div style={{ marginTop: 16, padding: '16px', background: 'var(--grey-50, #fafafa)', border: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', gap: 20 }}>
                <QRCodeSVG value={registrationUrl} size={96} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>QR de inscripción</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', wordBreak: 'break-all', marginBottom: 6 }}>{registrationUrl}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Los participantes pueden escanear este código para inscribirse.</div>
                </div>
              </div>
            )}

            {/* Teams list */}
            {categoryTeams.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Inscriptos</div>
                {categoryTeams.map((team) => (
                  <div key={team.id} style={{ padding: '8px 12px', border: '1px solid var(--grey-100)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{team.player1Name}</span>
                      {team.player2Name && <span style={{ color: 'var(--grey-400)' }}> / {team.player2Name}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px',
                        background: team.status === 'confirmed' ? 'rgba(34,197,94,0.1)' : team.status === 'rejected' ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.05)',
                        color: team.status === 'confirmed' ? '#15803d' : team.status === 'rejected' ? '#b91c1c' : 'var(--grey-500)',
                      }}>
                        {team.status === 'confirmed' ? 'Confirmado' : team.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                      {tournament.status === 'registration_open' && team.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleSetTeamStatus(team.id, 'confirmed')}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer',
                              background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)',
                            }}
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => handleSetTeamStatus(team.id, 'rejected')}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer',
                              background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)',
                            }}
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {categoryTeams.length === 0 && tournament.status !== 'draft' && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic' }}>
                Aún no hay inscriptos en esta categoría.
              </div>
            )}
          </div>
        );
      })}

      {/* Open Registration CTA — shown when draft */}
      {tournament.status === 'draft' && (
        <div style={{ ...card, background: 'rgba(214,255,0,0.04)', borderColor: 'rgba(214,255,0,0.3)', marginTop: 24 }}>
          <div style={secTitle}>Abrir Inscripción</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--black)', marginBottom: 6 }}>
                ${openPrice}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-400)', lineHeight: 1.6, maxWidth: 480 }}>
                Al pagar, se activará el registro público. Los participantes podrán inscribirse escaneando el código QR.
              </div>
            </div>
            <button
              onClick={handleOpenRegistration}
              disabled={opening}
              style={{
                padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)',
                border: 'none', cursor: opening ? 'wait' : 'pointer', opacity: opening ? 0.6 : 1,
                fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
              }}
            >
              {opening ? 'Redirigiendo…' : `Abrir Inscripción — $${openPrice}`}
            </button>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--grey-100)', fontSize: 12, color: 'var(--grey-400)' }}>
            ℹ️ El torneo está en borrador. Una vez abierto, se generará un QR único para cada categoría que podrás compartir con los participantes.
          </div>
        </div>
      )}
    </div>
  );
}
