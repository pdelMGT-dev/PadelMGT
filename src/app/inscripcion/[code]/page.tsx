'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  loadPersonalizadoByCode,
  registerTeam,
  enrolledCount,
  waitlistCount,
  type PersonalizadoTournament,
  type PersonalizadoCategory,
} from '@/lib/personalizado-store';
import {
  sendPersonalizadoRegistrationEmail,
  sendPersonalizadoWaitlistedEmail,
} from '@/lib/email';

const GENDER_LABELS: Record<string, string> = {
  libre: 'Libre', masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto',
};

// ── Shared styles ──────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--grey-50, #fafafa)',
  padding: '32px 16px 80px',
};
const shell: React.CSSProperties = { maxWidth: 640, margin: '0 auto' };
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 16,
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--grey-400)', marginBottom: 6, display: 'block',
};
const input: React.CSSProperties = {
  width: '100%', padding: '11px 13px', fontSize: 14,
  border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--black)',
  marginBottom: 14, boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '14px', background: 'var(--black)', color: 'var(--neon)',
  border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

function BrandHeader() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <Link href="/" style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em',
        color: 'var(--black)', textDecoration: 'none', textTransform: 'uppercase',
      }}>
        PADEL<span style={{ color: 'var(--turf-green)' }}>MGT</span>
      </Link>
    </div>
  );
}

export default function InscripcionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [p1Name, setP1Name] = useState('');
  const [p1Email, setP1Email] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p2Email, setP2Email] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | {
    catName: string; p1Name: string; p2Name?: string; waitlisted: boolean;
  }>(null);

  useEffect(() => {
    let active = true;
    loadPersonalizadoByCode(code).then(t => {
      if (!active) return;
      setTournament(t);
      setLoading(false);
    });
    return () => { active = false; };
  }, [code]);

  const selectedCat: PersonalizadoCategory | undefined =
    tournament?.categories.find(c => c.id === selectedCatId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !selectedCat) return;
    setError(null);
    setSubmitting(true);
    const player1Name = p1Name.trim();
    const player1Email = p1Email.trim() || undefined;
    const res = await registerTeam(code, {
      categoryId: selectedCat.id,
      player1Name,
      player1Email,
      player2Name: p2Name.trim(),
      player2Email: p2Email.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'No se pudo completar la inscripción');
      // refresh to reflect possibly-changed counts
      setTournament(await loadPersonalizadoByCode(code));
      return;
    }
    const waitlisted = !!res.waitlisted;
    // Fire-and-forget confirmation email (never blocks/throws)
    if (player1Email) {
      if (waitlisted) {
        void sendPersonalizadoWaitlistedEmail({
          to: player1Email, toName: player1Name,
          tournamentName: tournament.name, categoryName: selectedCat.name,
        });
      } else {
        void sendPersonalizadoRegistrationEmail({
          to: player1Email, toName: player1Name,
          tournamentName: tournament.name, categoryName: selectedCat.name,
          date: tournament.date, locationName: tournament.locationName,
        });
      }
    }
    setDone({
      catName: selectedCat.name,
      p1Name: player1Name,
      p2Name: p2Name.trim() || undefined,
      waitlisted,
    });
    setTournament(await loadPersonalizadoByCode(code));
  }

  // ── States ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={page}><div style={shell}>
        <BrandHeader />
        <div style={{ ...card, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>
      </div></div>
    );
  }

  if (!tournament) {
    return (
      <div style={page}><div style={shell}>
        <BrandHeader />
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>Torneo no encontrado</div>
          <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Verifica el código o el enlace de inscripción.</div>
        </div>
      </div></div>
    );
  }

  if (tournament.status !== 'registration_open') {
    const finishedLike = tournament.status === 'finished' || tournament.status === 'live';
    return (
      <div style={page}><div style={shell}>
        <BrandHeader />
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>{tournament.name}</div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)' }}>
            {finishedLike
              ? 'La inscripción para este torneo ha finalizado.'
              : 'La inscripción para este torneo no está abierta todavía.'}
          </div>
        </div>
      </div></div>
    );
  }

  // Confirmation screen
  if (done) {
    return (
      <div style={page}><div style={shell}>
        <BrandHeader />
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: done.waitlisted ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.12)',
            color: done.waitlisted ? '#b45309' : '#15803d', fontSize: 28, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>{done.waitlisted ? '⏳' : '✓'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>
            {done.waitlisted ? 'Estás en lista de espera' : '¡Inscripción registrada!'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6, marginBottom: 20 }}>
            {done.waitlisted
              ? 'La categoría está llena. Te avisaremos por correo si se libera un lugar.'
              : 'El organizador confirmará tu lugar.'}
          </div>
          <div style={{ textAlign: 'left', border: '1px solid var(--grey-100)', padding: '14px 16px', background: 'var(--grey-50, #fafafa)' }}>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>Torneo</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 10 }}>{tournament.name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>Categoría</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 10 }}>{done.catName}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>{done.p2Name ? 'Pareja' : 'Jugador'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>
              {done.p1Name}{done.p2Name ? ` / ${done.p2Name}` : ''}
            </div>
          </div>
        </div>
      </div></div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────────

  return (
    <div style={page}><div style={shell}>
      <BrandHeader />

      {/* Tournament header */}
      <div style={card}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
          {tournament.name}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--grey-500)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {tournament.date && <span>📅 {tournament.date}{tournament.time ? ` · ${tournament.time}` : ''}</span>}
          {tournament.locationName && <span>📍 {tournament.locationName}</span>}
          {(tournament.city || tournament.country) && (
            <span>{[tournament.city, tournament.country].filter(Boolean).join(', ')}</span>
          )}
        </div>
      </div>

      {/* Category selector */}
      <div style={card}>
        <span style={label}>Elige tu categoría</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tournament.categories.map((cat) => {
            const count = enrolledCount(tournament, cat.id);
            const waiting = waitlistCount(tournament, cat.id);
            const full = count >= cat.maxTeams;
            const selected = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setSelectedCatId(cat.id); setError(null); }}
                style={{
                  textAlign: 'left', padding: '14px 16px', cursor: 'pointer',
                  background: selected ? 'rgba(214,255,0,0.10)' : '#fff',
                  border: selected ? '2px solid var(--black)' : '1px solid var(--grey-200)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cat.name}
                    {full && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px',
                        background: 'rgba(245,158,11,0.14)', color: '#b45309',
                      }}>LISTA DE ESPERA</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                    {GENDER_LABELS[cat.gender]} · Parejas
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 3 }}>
                    {count} / {cat.maxTeams} inscritos{waiting > 0 ? ` · ${waiting} en espera` : ''}
                  </div>
                  {full && (
                    <div style={{ fontSize: 12, color: '#b45309', marginTop: 3 }}>
                      Al inscribirte entrarás en la lista de espera.
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registration form for selected category */}
      {selectedCat && (
        <form onSubmit={handleSubmit} style={card}>
          <span style={label}>Tus datos — {selectedCat.name}</span>

          <label style={label} htmlFor="p1name">Jugador 1 — Nombre *</label>
          <input id="p1name" style={input} value={p1Name} onChange={e => setP1Name(e.target.value)} required placeholder="Nombre completo" />

          <label style={label} htmlFor="p1email">Jugador 1 — Email (opcional)</label>
          <input id="p1email" type="email" style={input} value={p1Email} onChange={e => setP1Email(e.target.value)} placeholder="tucorreo@ejemplo.com" />

          <label style={label} htmlFor="p2name">Jugador 2 — Nombre *</label>
          <input id="p2name" style={input} value={p2Name} onChange={e => setP2Name(e.target.value)} required placeholder="Nombre completo" />

          <label style={label} htmlFor="p2email">Jugador 2 — Email (opcional)</label>
          <input id="p2email" type="email" style={input} value={p2Email} onChange={e => setP2Email(e.target.value)} placeholder="correo@ejemplo.com" />

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Inscribiendo…' : 'Inscribirme'}
          </button>
        </form>
      )}
    </div></div>
  );
}
