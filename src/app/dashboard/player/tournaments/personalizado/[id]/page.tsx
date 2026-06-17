'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  getPersonalizado,
  loadPersonalizadoById,
  savePersonalizado,
  changeTeamStatus,
  clearTeamPartner,
  registerTeam,
  enrolledCount,
  waitlistCount,
  canManagePersonalizado,
  type PersonalizadoTournament,
  type PersonalizadoTeam,
} from '@/lib/personalizado-store';
import { sendPersonalizadoStatusEmail } from '@/lib/email';
import { searchPlayers, type RegisteredPlayer } from '@/lib/player-store';
import { useToast } from '@/components/ToastProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  fetchPersonalizadoPricing,
  resolvePrice,
  totalTeamsOf,
  DEFAULT_PERSONALIZADO_PRICING,
  type PersonalizadoPricingConfig,
} from '@/lib/personalizado-pricing';

// ── Shared styles ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};
const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--grey-400)', marginBottom: 6, display: 'block',
};

const STATUS_LABELS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'BORRADOR', registration_open: 'INSCRIPCIÓN ABIERTA',
  configured: 'CONFIGURADO', live: 'EN VIVO', finished: 'FINALIZADO',
};
const STATUS_COLORS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'rgba(0,0,0,0.12)', registration_open: 'rgba(214,255,0,0.15)',
  configured: 'rgba(59,130,246,0.15)', live: 'rgba(34,197,94,0.15)', finished: 'rgba(156,163,175,0.15)',
};
const STATUS_TEXT_COLORS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'var(--grey-500)', registration_open: '#6b7a00',
  configured: '#1d4ed8', live: '#15803d', finished: 'var(--grey-400)',
};
const GENDER_LABELS: Record<string, string> = {
  libre: 'Libre', masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto',
};

// ── PlayerSearchBox sub-component ─────────────────────────────────────────────

function PlayerSearchBox({
  label, value, onChange, results, selected, onSelect, onClear, exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  results: RegisteredPlayer[];
  selected: RegisteredPlayer | null;
  onSelect: (p: RegisteredPlayer) => void;
  onClear: () => void;
  exclude?: string[];
}) {
  const filtered = results.filter(p => !exclude?.includes(p.id));
  return (
    <div style={{ marginBottom: 14 }}>
      <span style={lbl}>{label}</span>
      {selected ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'rgba(214,255,0,0.08)', border: '2px solid var(--black)' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{selected.name}</span>
            <span style={{ fontSize: 11, color: 'var(--grey-400)', marginLeft: 8 }}>{selected.shortId} · {selected.email}</span>
          </div>
          <button type="button" onClick={onClear} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--grey-400)', padding: '0 4px' }}>✕</button>
        </div>
      ) : (
        <>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Buscar por nombre, email o #shortId…"
            style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--black)', boxSizing: 'border-box' }}
          />
          {filtered.length > 0 && (
            <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none', background: '#fff', maxHeight: 180, overflowY: 'auto' }}>
              {filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--grey-100)', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-50,#fafafa)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                    {p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.shortId} · {p.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {value.trim().length >= 2 && filtered.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--grey-400)', border: '1px solid var(--grey-200)', borderTop: 'none' }}>
              No se encontraron jugadores con esa búsqueda.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PersonalizadoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const { id } = use(params);
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  // ── Opening pricing + promo code ────────────────────────────────────────────
  const [pricingConfig, setPricingConfig] = useState<PersonalizadoPricingConfig>(DEFAULT_PERSONALIZADO_PRICING);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [codedPrice, setCodedPrice] = useState<number | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // ── Rejection modal ──────────────────────────────────────────────────────────
  const [rejectModal, setRejectModal] = useState<{ teamId: string; teamName: string; catName: string; hasPartner: boolean; p1Name: string; p2Name?: string; p1Email?: string; p2Email?: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<'team' | 'partner'>('team');
  const [rejecting, setRejecting] = useState(false);

  // ── Collapsed rejected sections per category ─────────────────────────────────
  const [showRejected, setShowRejected] = useState<Record<string, boolean>>({});

  // ── Manual team addition ─────────────────────────────────────────────────────
  const [addTeamCatId, setAddTeamCatId] = useState<string | null>(null);
  const [p1Query, setP1Query] = useState('');
  const [p1Results, setP1Results] = useState<RegisteredPlayer[]>([]);
  const [selectedP1, setSelectedP1] = useState<RegisteredPlayer | null>(null);
  const [p2Query, setP2Query] = useState('');
  const [p2Results, setP2Results] = useState<RegisteredPlayer[]>([]);
  const [selectedP2, setSelectedP2] = useState<RegisteredPlayer | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);

  // Search debounce
  useEffect(() => {
    if (p1Query.trim().length < 2) { setP1Results([]); return; }
    const t = setTimeout(() => setP1Results(searchPlayers(p1Query.trim()).slice(0, 6)), 200);
    return () => clearTimeout(t);
  }, [p1Query]);

  useEffect(() => {
    if (p2Query.trim().length < 2) { setP2Results([]); return; }
    const t = setTimeout(() => setP2Results(searchPlayers(p2Query.trim()).slice(0, 6)), 200);
    return () => clearTimeout(t);
  }, [p2Query]);

  function resetAddForm() {
    setAddTeamCatId(null);
    setP1Query(''); setP1Results([]); setSelectedP1(null);
    setP2Query(''); setP2Results([]); setSelectedP2(null);
  }

  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);
    (async () => {
      let t = await loadPersonalizadoById(id);
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('registration') === 'opened' && t && t.status === 'draft') {
        t = { ...t, status: 'registration_open', openedAt: new Date().toISOString() };
        savePersonalizado(t);
        window.history.replaceState({}, '', `/dashboard/player/tournaments/personalizado/${id}`);
      }
      if (!active) return;
      setTournament(t);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  // Load the live pricing config so the organizer sees the SA-configured price.
  useEffect(() => {
    fetchPersonalizadoPricing().then(setPricingConfig).catch(() => {});
  }, []);

  // Access guard: this is the organizer management view — creator or co-creators only.
  const accessDenied = !!tournament && !canManagePersonalizado(tournament, currentUser?.id);

  // Base/auto price from the public config; a validated code overrides via codedPrice.
  const totalTeams = tournament ? totalTeamsOf(tournament.categories) : 0;
  const autoPreview = resolvePrice(pricingConfig, totalTeams, null);

  async function applyPromoCode() {
    const t = tournament ?? getPersonalizado(id);
    if (!t || !promoInput.trim()) return;
    setValidatingPromo(true);
    setPromoFeedback(null);
    try {
      const res = await fetch('/api/personalizado-pricing/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: t.id, code: promoInput.trim() }),
      });
      const data = await res.json() as { finalPrice?: number; basePrice?: number; appliedPromo?: { code: string } | null; reason?: string | null };
      if (data.reason) {
        setPromoFeedback({ ok: false, msg: data.reason });
        setAppliedCode('');
        setCodedPrice(null);
      } else if (data.appliedPromo && typeof data.finalPrice === 'number') {
        setAppliedCode(promoInput.trim().toUpperCase());
        setCodedPrice(data.finalPrice);
        setPromoFeedback({ ok: true, msg: data.finalPrice === 0 ? 'Código aplicado — ¡torneo gratis!' : `Código aplicado — nuevo precio $${data.finalPrice}` });
      } else {
        setPromoFeedback({ ok: false, msg: 'El código no modifica el precio' });
      }
    } catch {
      setPromoFeedback({ ok: false, msg: 'No se pudo validar el código' });
    }
    setValidatingPromo(false);
  }

  function clearPromoCode() {
    setAppliedCode('');
    setCodedPrice(null);
    setPromoInput('');
    setPromoFeedback(null);
  }

  async function handleOpenRegistration() {
    const t = tournament ?? getPersonalizado(id);
    if (!t) return;
    setOpening(true);
    try {
      const res = await fetch('/api/stripe/open-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: t.id,
          tournamentCode: t.code,
          price: codedPrice ?? autoPreview.finalPrice,
          promoCode: appliedCode || undefined,
          userEmail: currentUser?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) { alert(data.error || 'No se pudo iniciar el pago'); setOpening(false); return; }
      window.location.href = data.url;
    } catch { setOpening(false); alert('Error de red al iniciar el pago'); }
  }

  async function handleConfirm(teamId: string) {
    const result = await changeTeamStatus(id, teamId, 'confirmed');
    if (!result.ok) { showToast(result.error ?? 'No se pudo actualizar', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    if (!updated) return;
    const team = updated.teams.find(t => t.id === teamId);
    const catName = updated.categories.find(c => c.id === team?.categoryId)?.name ?? '';
    if (team?.player1Email) {
      void sendPersonalizadoStatusEmail({ to: team.player1Email, toName: team.player1Name, tournamentName: updated.name, categoryName: catName, statusMessage: '¡Tu lugar fue confirmado!' });
    }
  }

  function openRejectModal(team: PersonalizadoTeam, catName: string) {
    const teamName = team.player2Name ? `${team.player1Name} / ${team.player2Name}` : team.player1Name;
    const hasPartner = !!team.player2Name;
    setRejectModal({ teamId: team.id, teamName, catName, hasPartner, p1Name: team.player1Name, p2Name: team.player2Name, p1Email: team.player1Email, p2Email: team.player2Email });
    setRejectReason('');
    setRejectTarget('team');
  }

  async function handleConfirmReject() {
    if (!rejectModal || !tournament) return;
    setRejecting(true);

    if (rejectTarget === 'partner') {
      // Only reject player 2 — keep player 1 in the tournament as "needs partner"
      const result = await clearTeamPartner(id, rejectModal.teamId);
      setRejecting(false);
      if (!result.ok) { showToast(result.error ?? 'No se pudo rechazar al compañero', 'error'); return; }
      const updated = await loadPersonalizadoById(id);
      setTournament(updated);
      // Email to player 1
      if (rejectModal.p1Email) {
        void sendPersonalizadoStatusEmail({
          to: rejectModal.p1Email, toName: rejectModal.p1Name,
          tournamentName: tournament.name, categoryName: rejectModal.catName,
          statusMessage: rejectReason.trim()
            ? `Tu compañero/a fue rechazado/a. Motivo: ${rejectReason.trim()}. Puedes inscribir un nuevo compañero/a usando el link del torneo.`
            : 'Tu compañero/a no cumplió los requisitos de la categoría. Puedes inscribir un nuevo compañero/a usando el link del torneo.',
        });
      }
      // Email to player 2
      if (rejectModal.p2Email && rejectModal.p2Name) {
        void sendPersonalizadoStatusEmail({
          to: rejectModal.p2Email, toName: rejectModal.p2Name,
          tournamentName: tournament.name, categoryName: rejectModal.catName,
          statusMessage: rejectReason.trim()
            ? `Tu inscripción fue rechazada. Motivo: ${rejectReason.trim()}`
            : 'Tu inscripción fue rechazada por el organizador.',
        });
      }
      showToast('Compañero/a rechazado — el Jugador 1 puede buscar un nuevo compañero', 'success');
    } else {
      // Reject entire team
      const result = await changeTeamStatus(id, rejectModal.teamId, 'rejected');
      setRejecting(false);
      if (!result.ok) { showToast(result.error ?? 'No se pudo rechazar', 'error'); return; }
      const updated = await loadPersonalizadoById(id);
      setTournament(updated);
      if (!updated) return;
      const team = updated.teams.find(t => t.id === rejectModal.teamId);
      if (team?.player1Email) {
        void sendPersonalizadoStatusEmail({
          to: team.player1Email, toName: team.player1Name,
          tournamentName: updated.name, categoryName: rejectModal.catName,
          statusMessage: rejectReason.trim()
            ? `Tu inscripción fue rechazada. Motivo: ${rejectReason.trim()}`
            : 'Tu inscripción fue rechazada por el organizador.',
        });
      }
      if (result.promoted) {
        const promoted = updated.teams.find(t => t.id === result.promoted!.id) ?? result.promoted;
        if (promoted.player1Email) {
          void sendPersonalizadoStatusEmail({ to: promoted.player1Email, toName: promoted.player1Name, tournamentName: updated.name, categoryName: rejectModal.catName, statusMessage: '¡Se liberó un lugar y pasaste de la lista de espera!' });
        }
        showToast('Equipo promovido de la lista de espera', 'success');
      }
    }
    setRejectModal(null);
    setRejectReason('');
  }

  async function handleRestore(teamId: string) {
    const result = await changeTeamStatus(id, teamId, 'pending');
    if (!result.ok) { showToast(result.error ?? 'No se pudo restaurar', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    showToast('Inscripción restaurada a Pendiente', 'success');
  }

  async function handleAddTeam(catId: string) {
    if (!selectedP1 || !selectedP2 || !tournament) return;
    setAddingTeam(true);
    const res = await registerTeam(tournament.code, {
      categoryId: catId,
      player1Name: selectedP1.name, player1Email: selectedP1.email, player1Id: selectedP1.id,
      player2Name: selectedP2.name, player2Email: selectedP2.email, player2Id: selectedP2.id,
    });
    if (!res.ok) { showToast(res.error ?? 'Error al agregar equipo', 'error'); setAddingTeam(false); return; }
    // Auto-confirm since organizer is adding manually
    if (res.team?.id) await changeTeamStatus(id, res.team.id, 'confirmed');
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    resetAddForm();
    setAddingTeam(false);
    showToast('Equipo agregado y confirmado', 'success');
  }

  const STATUS_CSV: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmado', rejected: 'Rechazado', waitlisted: 'Lista de espera' };
  const PAYMENT_CSV: Record<string, string> = { unpaid: 'Pendiente', paid: 'Pagado', free: 'Gratis' };

  function exportCSV() {
    const t = tournament;
    if (!t || t.teams.length === 0) return;
    const headers = ['Categoría', 'Jugador 1', 'Email 1', 'ID 1', 'Jugador 2', 'Email 2', 'ID 2', 'Estado', 'Pago', 'Inscrito'];
    const escField = (val: unknown) => { const s = String(val ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = t.teams.map(team => {
      const cat = t.categories.find(c => c.id === team.categoryId)?.name ?? '';
      return [cat, team.player1Name, team.player1Email ?? '', team.player1Id ?? '', team.player2Name ?? '', team.player2Email ?? '', team.player2Id ?? '', STATUS_CSV[team.status] ?? team.status, PAYMENT_CSV[team.paymentStatus] ?? team.paymentStatus, team.registeredAt].map(escField).join(',');
    });
    const csv = [headers.map(escField).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `inscriptos_${t.code}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div style={{ padding: '40px', color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>;

  if (tournament && accessDenied) {
    return (
      <div style={{ padding: '40px clamp(16px, 4vw, 48px) 80px' }}>
        <Link href="/dashboard/player/tournaments" style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>← Mis Torneos</Link>
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>Acceso restringido</div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6 }}>
            Solo el creador del torneo o sus co-creadores pueden gestionar este torneo.
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: '40px clamp(16px, 4vw, 48px) 80px' }}>
        <Link href="/dashboard/player/tournaments" style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>← Mis Torneos</Link>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
      </div>
    );
  }

  const registrationUrl = `${origin}/inscripcion/${tournament.code}`;
  const openBasePrice = autoPreview.basePrice;
  const openPrice = codedPrice ?? autoPreview.finalPrice;
  const hasDiscount = openPrice < openBasePrice;
  const openPromoBadge = appliedCode || autoPreview.appliedPromo?.displayBadge || 'PROMO';

  return (
    <div style={{ padding: '40px clamp(16px, 4vw, 48px) 80px' }}>
      {/* Back */}
      <Link href="/dashboard/player/tournaments" style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>← Mis Torneos</Link>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>{tournament.name}</h1>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', background: STATUS_COLORS[tournament.status], color: STATUS_TEXT_COLORS[tournament.status], border: '1px solid currentColor' }}>
            {STATUS_LABELS[tournament.status]}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {tournament.date && <span>📅 {tournament.date} · {tournament.time}</span>}
          {tournament.locationName && <span>📍 {tournament.locationName}</span>}
          {(tournament.city || tournament.country) && <span>{[tournament.city, tournament.country].filter(Boolean).join(', ')}</span>}
          <span>Código: <strong style={{ color: 'var(--black)' }}>{tournament.code}</strong></span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {tournament.teams.length > 0 && (
            <button onClick={exportCSV} style={{ padding: '9px 18px', background: '#fff', color: 'var(--black)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ⬇ Exportar inscritos (CSV)
            </button>
          )}
          {(tournament.status === 'registration_open' || tournament.status === 'configured') && (
            <Link href={`/dashboard/player/tournaments/personalizado/${tournament.id}/control`} style={{ padding: '9px 18px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ⚙ Panel de Control
            </Link>
          )}
          {(tournament.status === 'configured' || tournament.status === 'live') && (
            <Link href={`/dashboard/player/tournaments/personalizado/${tournament.id}/schedule`} style={{ padding: '9px 18px', background: '#fff', color: 'var(--black)', border: '1px solid var(--grey-200)', cursor: 'pointer', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              🗓 Calendario
            </Link>
          )}
        </div>
      </div>

      {/* Categories */}
      {tournament.categories.map((cat) => {
        const allCatTeams     = tournament.teams.filter(t => t.categoryId === cat.id);
        const activeTeams     = allCatTeams.filter(t => t.status !== 'waitlisted' && t.status !== 'rejected');
        const waitlistedTeams = allCatTeams.filter(t => t.status === 'waitlisted');
        const rejectedTeams   = allCatTeams.filter(t => t.status === 'rejected');
        const waiting         = waitlistCount(tournament, cat.id);
        const isAddingHere    = addTeamCatId === cat.id;

        return (
          <div key={cat.id} style={card}>
            {/* Category header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{GENDER_LABELS[cat.gender]} · Parejas</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', textAlign: 'right' }}>
                  {enrolledCount(tournament, cat.id)} / {cat.maxTeams} inscritos{waiting > 0 ? ` · ${waiting} en espera` : ''}
                </div>
                {tournament.status === 'registration_open' && !isAddingHere && (
                  <button
                    onClick={() => { resetAddForm(); setAddTeamCatId(cat.id); }}
                    style={{ padding: '6px 14px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  >
                    + Agregar equipo
                  </button>
                )}
              </div>
            </div>

            {/* QR */}
            {tournament.status === 'registration_open' && (
              <div style={{ marginBottom: 12, padding: '14px 16px', background: 'var(--grey-50, #fafafa)', border: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', gap: 20 }}>
                <QRCodeSVG value={registrationUrl} size={80} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>QR de inscripción</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', wordBreak: 'break-all', marginBottom: 4 }}>{registrationUrl}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Los participantes pueden escanear este código para inscribirse.</div>
                </div>
              </div>
            )}

            {/* Manual add form */}
            {isAddingHere && (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--grey-200)', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 14 }}>Agregar equipo manualmente</div>
                <PlayerSearchBox
                  label="Jugador 1"
                  value={p1Query} onChange={setP1Query}
                  results={p1Results}
                  selected={selectedP1} onSelect={p => { setSelectedP1(p); setP1Results([]); }}
                  onClear={() => { setSelectedP1(null); setP1Query(''); }}
                />
                <PlayerSearchBox
                  label="Jugador 2"
                  value={p2Query} onChange={setP2Query}
                  results={p2Results}
                  selected={selectedP2} onSelect={p => { setSelectedP2(p); setP2Results([]); }}
                  onClear={() => { setSelectedP2(null); setP2Query(''); }}
                  exclude={selectedP1 ? [selectedP1.id] : []}
                />
                <div style={{ fontSize: 11, color: 'var(--grey-400)', marginBottom: 14 }}>
                  El equipo se añadirá como <strong>Confirmado</strong> directamente.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAddTeam(cat.id)}
                    disabled={!selectedP1 || !selectedP2 || addingTeam}
                    style={{ padding: '9px 20px', background: (!selectedP1 || !selectedP2) ? 'var(--grey-200)' : 'var(--black)', color: (!selectedP1 || !selectedP2) ? 'var(--grey-400)' : 'var(--neon)', border: 'none', cursor: (!selectedP1 || !selectedP2 || addingTeam) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {addingTeam ? 'Agregando…' : 'Agregar Equipo'}
                  </button>
                  <button onClick={resetAddForm} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Active teams */}
            {activeTeams.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Inscriptos</div>
                {activeTeams.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    canManage={tournament.status === 'registration_open'}
                    onConfirm={() => handleConfirm(team.id)}
                    onReject={() => openRejectModal(team, cat.name)}
                  />
                ))}
              </div>
            )}

            {/* Waitlist */}
            {waitlistedTeams.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b45309', marginBottom: 8 }}>
                  Lista de espera ({waitlistedTeams.length})
                </div>
                {waitlistedTeams.map((team) => (
                  <div key={team.id} style={{ padding: '8px 12px', border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span><span style={{ fontWeight: 600 }}>{team.player1Name}</span>{team.player2Name && <span style={{ color: 'var(--grey-400)' }}> / {team.player2Name}</span>}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>Lista de espera</span>
                  </div>
                ))}
              </div>
            )}

            {/* Rejected — collapsible */}
            {rejectedTeams.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setShowRejected(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}
                >
                  <span style={{ fontSize: 9 }}>{showRejected[cat.id] ? '▾' : '▸'}</span>
                  Rechazados ({rejectedTeams.length})
                </button>
                {showRejected[cat.id] && (
                  <div style={{ marginTop: 6 }}>
                    {rejectedTeams.map((team) => (
                      <div key={team.id} style={{ padding: '8px 12px', border: '1px solid rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.03)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: 'var(--grey-400)', textDecoration: 'line-through' }}>
                          {team.player1Name}{team.player2Name ? ` / ${team.player2Name}` : ''}
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(220,38,38,0.08)', color: '#b91c1c' }}>Rechazado</span>
                          {tournament.status === 'registration_open' && (
                            <button
                              onClick={() => handleRestore(team.id)}
                              style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: 'var(--grey-500)', border: '1px solid var(--grey-200)' }}
                            >
                              ↩ Restaurar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTeams.length === 0 && waitlistedTeams.length === 0 && !isAddingHere && tournament.status !== 'draft' && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic' }}>Aún no hay inscriptos en esta categoría.</div>
            )}
          </div>
        );
      })}

      {/* Open Registration CTA */}
      {tournament.status === 'draft' && (
        <div style={{ ...card, background: 'rgba(214,255,0,0.04)', borderColor: 'rgba(214,255,0,0.3)', marginTop: 24 }}>
          <div style={secTitle}>Abrir Inscripción</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>
                  {openPrice === 0 ? 'GRATIS' : `$${openPrice}`}
                </div>
                {hasDiscount && (
                  <span style={{ fontSize: 15, color: 'var(--grey-400)', textDecoration: 'line-through' }}>${openBasePrice}</span>
                )}
                {hasDiscount && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--neon)', color: 'var(--black)', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {openPromoBadge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-400)', lineHeight: 1.6, maxWidth: 480 }}>Al pagar, se activará el registro público. Los participantes podrán inscribirse escaneando el código QR.</div>
            </div>
            <button onClick={handleOpenRegistration} disabled={opening} style={{ padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: opening ? 'wait' : 'pointer', opacity: opening ? 0.6 : 1, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
              {opening ? 'Redirigiendo…' : openPrice === 0 ? 'Abrir Inscripción — Gratis' : `Abrir Inscripción — $${openPrice}`}
            </button>
          </div>

          {/* Promo code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {appliedCode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--black)', color: 'var(--neon)', padding: '4px 10px' }}>{appliedCode}</span>
                <button onClick={clearPromoCode} style={{ background: 'none', border: 'none', color: 'var(--grey-400)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Quitar</button>
              </div>
            ) : (
              <>
                <input
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="¿Tenés un código?"
                  style={{ padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'monospace', outline: 'none', width: 180 }}
                />
                <button onClick={applyPromoCode} disabled={validatingPromo || !promoInput.trim()} style={{ padding: '9px 16px', background: '#fff', border: '1px solid var(--grey-300)', cursor: validatingPromo ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {validatingPromo ? '…' : 'Aplicar'}
                </button>
              </>
            )}
            {promoFeedback && (
              <span style={{ fontSize: 12, fontWeight: 600, color: promoFeedback.ok ? 'var(--turf-green)' : '#b91c1c' }}>{promoFeedback.msg}</span>
            )}
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--grey-100)', fontSize: 12, color: 'var(--grey-400)' }}>
            ℹ️ El torneo está en borrador. Una vez abierto, se generará un QR único para cada categoría que podrás compartir con los participantes.
          </div>
        </div>
      )}

      {/* Rejection modal */}
      {rejectModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setRejectModal(null); setRejectReason(''); } }}
        >
          <div style={{ background: '#fff', padding: '28px 32px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>
              Rechazar inscripción
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey-500)', marginBottom: 6 }}>{rejectModal.teamName}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 20 }}>Categoría: {rejectModal.catName}</div>

            {/* Radio: who to reject — only shown when there are 2 players */}
            {rejectModal.hasPartner && (
              <div style={{ marginBottom: 18 }}>
                <span style={lbl}>¿A quién rechazar?</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    { value: 'team' as const, label: 'Rechazar el equipo completo', desc: `${rejectModal.p1Name} y ${rejectModal.p2Name} quedan fuera.` },
                    { value: 'partner' as const, label: `Rechazar solo al compañero/a (${rejectModal.p2Name})`, desc: `${rejectModal.p1Name} permanece inscrito/a y puede buscar un nuevo compañero/a.` },
                  ] as const).map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `1px solid ${rejectTarget === opt.value ? 'var(--black)' : 'var(--grey-200)'}`, background: rejectTarget === opt.value ? 'rgba(0,0,0,0.03)' : '#fff', cursor: 'pointer' }}>
                      <input type="radio" name="rejectTarget" value={opt.value} checked={rejectTarget === opt.value} onChange={() => setRejectTarget(opt.value)} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label style={lbl}>Motivo (opcional)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ej: No cumple los requisitos de la categoría…"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--grey-200)', resize: 'vertical', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}
            />
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 22 }}>
              {rejectTarget === 'partner'
                ? `${rejectModal.p2Name ?? 'El compañero/a'} recibirá un email de rechazo${rejectReason.trim() ? ' con el motivo indicado' : ''}. ${rejectModal.p1Name} será notificado/a para buscar un nuevo compañero/a.`
                : `El equipo recibirá un email de notificación${rejectReason.trim() ? ' con el motivo indicado' : ''}.`}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-500)', textTransform: 'uppercase' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting}
                style={{ padding: '9px 22px', background: '#b91c1c', color: '#fff', border: 'none', cursor: rejecting ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: rejecting ? 0.6 : 1 }}
              >
                {rejecting ? 'Rechazando…' : rejectTarget === 'partner' ? 'Rechazar Compañero/a' : 'Rechazar Equipo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TeamRow sub-component ─────────────────────────────────────────────────────

function TeamRow({
  team, canManage, onConfirm, onReject,
}: {
  team: PersonalizadoTeam;
  canManage: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const hasInvitePending = team.player1Id && team.player2Email && !team.player2Id;

  return (
    <div style={{ padding: '9px 12px', border: '1px solid var(--grey-100)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, flexWrap: 'wrap', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div>
          <span style={{ fontWeight: 600 }}>{team.player1Name}</span>
          {team.player2Name && <span style={{ color: 'var(--grey-400)' }}> / {team.player2Name}</span>}
        </div>
        {hasInvitePending && (
          <div style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ✉ Esperando que {team.player2Name ?? 'compañero/a'} acepte la invitación
          </div>
        )}
        {(team.player1Id || team.player2Id) && (
          <div style={{ fontSize: 10, color: 'var(--grey-300)', fontFamily: 'monospace' }}>
            {team.player1Id ? '●' : '○'} P1 en app{team.player2Id ? '  ● P2 en app' : (hasInvitePending ? '  ○ P2 invitado' : '')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px',
          background: team.status === 'confirmed' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
          color: team.status === 'confirmed' ? '#15803d' : 'var(--grey-500)',
        }}>
          {team.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
        </span>
        {canManage && team.status === 'pending' && (
          <>
            <button onClick={onConfirm} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)' }}>✓ Confirmar</button>
            <button onClick={onReject} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)' }}>✕ Rechazar</button>
          </>
        )}
      </div>
    </div>
  );
}
