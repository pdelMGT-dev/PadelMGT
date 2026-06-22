'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  getPersonalizado,
  loadPersonalizadoById,
  savePersonalizado,
  removePersonalizado,
  changeTeamStatus,
  setTeamReview,
  resolveTeamReview,
  moveTeamToCategory,
  replaceTeamPartner,
  clearTeamPartner,
  registerTeam,
  enrolledCount,
  waitlistCount,
  canManagePersonalizado,
  saveControlPanel,
  teamsPerGroupFromCount,
  DEFAULT_CONTROL_CONFIG,
  removeTeam,
  analyzeTournament,
  generateGroupSchedule,
  generateBracketSkeleton,
  scheduleAllBrackets,
  type PersonalizadoTournament,
  type PersonalizadoTeam,
  type ControlPanelConfig,
} from '@/lib/personalizado-store';
import { TournamentTabs } from './TournamentTabs';
import { Settings, CalendarDays, Download } from 'lucide-react';
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
  cancelled: 'CANCELADO',
};
const STATUS_COLORS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'rgba(0,0,0,0.12)', registration_open: 'rgba(214,255,0,0.15)',
  configured: 'rgba(59,130,246,0.15)', live: 'rgba(34,197,94,0.15)', finished: 'rgba(156,163,175,0.15)',
  cancelled: 'rgba(220,38,38,0.08)',
};
const STATUS_TEXT_COLORS: Record<PersonalizadoTournament['status'], string> = {
  draft: 'var(--grey-500)', registration_open: '#6b7a00',
  configured: '#1d4ed8', live: '#15803d', finished: 'var(--grey-400)',
  cancelled: '#b91c1c',
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

  // ── Review modal ──────────────────────────────────────────────────────────────
  const [reviewModal, setReviewModal] = useState<{ teamId: string; catId: string; catName: string; p1Name: string; p2Name?: string } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<'player1' | 'player2' | 'both'>('player1');
  const [reviewing, setReviewing] = useState(false);

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  // dropTargetId: catId string = hovering over category, 'UNASSIGNED' = hovering over pool, null = not hovering
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // ── Replace partner (Buscar compañero) ───────────────────────────────────────
  const [replaceModal, setReplaceModal] = useState<{ teamId: string; reviewPlayer: 'player1' | 'player2'; teamName: string } | null>(null);
  const [newPartnerQuery, setNewPartnerQuery] = useState('');
  const [newPartnerResults, setNewPartnerResults] = useState<RegisteredPlayer[]>([]);
  const [selectedNewPartner, setSelectedNewPartner] = useState<RegisteredPlayer | null>(null);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    if (newPartnerQuery.trim().length < 2) { setNewPartnerResults([]); return; }
    const t = setTimeout(() => setNewPartnerResults(searchPlayers(newPartnerQuery.trim()).slice(0, 6)), 200);
    return () => clearTimeout(t);
  }, [newPartnerQuery]);

  // ── Group formation (per-category stage) ──────────────────────────────────────
  const [groupDragTeamId, setGroupDragTeamId] = useState<string | null>(null);
  const [groupDropTarget, setGroupDropTarget] = useState<string | null>(null);
  const [savingGroups, setSavingGroups] = useState(false);

  // ── Collapsed rejected sections per category ─────────────────────────────────
  const [showRejected, setShowRejected] = useState<Record<string, boolean>>({});

  // ── Collapsible category windows (accordion) ─────────────────────────────────
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const toggleCat = (catId: string) => setCollapsedCats(prev => ({ ...prev, [catId]: !prev[catId] }));

  // ── Manual team addition ─────────────────────────────────────────────────────
  const [addTeamCatId, setAddTeamCatId] = useState<string | null>(null);
  const [p1Query, setP1Query] = useState('');
  const [p1Results, setP1Results] = useState<RegisteredPlayer[]>([]);
  const [selectedP1, setSelectedP1] = useState<RegisteredPlayer | null>(null);
  const [p2Query, setP2Query] = useState('');
  const [p2Results, setP2Results] = useState<RegisteredPlayer[]>([]);
  const [selectedP2, setSelectedP2] = useState<RegisteredPlayer | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);

  // ── Seed de prueba (ELIMINAR ANTES DEL LANZAMIENTO) ──────────────────────────
  const [seedCatId, setSeedCatId] = useState<string | null>(null);
  const [seedCount, setSeedCount] = useState(4);
  const [seeding, setSeeding] = useState(false);

  // ── Cancel / reactivate / delete ─────────────────────────────────────────────
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Remove unassigned team + Tabs toggle + calendar generation ───────────────
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [showTabs, setShowTabs] = useState(false);
  const [generatingCal, setGeneratingCal] = useState(false);

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
  // isCreator: true when the logged-in user is the creator. If creatorId is empty (legacy
  // tournaments created before creator tracking), we treat the manager as the creator so
  // they can still cancel/delete their own tournament.
  const isCreator = !!tournament && !!currentUser && (
    tournament.creatorId === currentUser.id || (!tournament.creatorId && canManagePersonalizado(tournament, currentUser.id))
  );

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

  function openReviewModal(team: PersonalizadoTeam, catId: string, catName: string) {
    setReviewModal({ teamId: team.id, catId, catName, p1Name: team.player1Name, p2Name: team.player2Name });
    setReviewTarget(team.player2Name ? 'player1' : 'both');
  }

  async function handleConfirmReview() {
    if (!reviewModal) return;
    setReviewing(true);
    const result = await setTeamReview(id, reviewModal.teamId, reviewTarget);
    setReviewing(false);
    if (!result.ok) { showToast(result.error ?? 'No se pudo poner en revisión', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    setReviewModal(null);
    if (reviewTarget === 'both') {
      showToast('Equipo movido a "Sin categoría" — ambos jugadores en revisión', 'success');
    } else {
      const who = reviewTarget === 'player1' ? reviewModal.p1Name : (reviewModal.p2Name ?? 'J2');
      showToast(`${who} puesto/a en revisión — el equipo queda marcado`, 'success');
    }
  }

  async function handleResolveReview(team: PersonalizadoTeam, restoreCatId?: string) {
    const result = await resolveTeamReview(id, team.id, restoreCatId ?? (team.categoryId || undefined));
    if (!result.ok) { showToast(result.error ?? 'No se pudo resolver', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    showToast('Revisión resuelta — equipo confirmado', 'success');
  }

  async function handleDrop(targetCatId: string | null) {
    if (!draggedTeamId || !tournament) { setDraggedTeamId(null); setDropTargetId(null); return; }
    const team = tournament.teams.find(t => t.id === draggedTeamId);
    if (!team) { setDraggedTeamId(null); setDropTargetId(null); return; }

    const currentCatId = team.categoryId || null;
    if (currentCatId === targetCatId) { setDraggedTeamId(null); setDropTargetId(null); return; }

    if (targetCatId) {
      const cat = tournament.categories.find(c => c.id === targetCatId);
      if (cat) {
        const alreadyEnrolled = enrolledCount(tournament, targetCatId);
        const willFit = team.status === 'partial_review' || team.status === 'confirmed' || team.status === 'unassigned';
        if (willFit && alreadyEnrolled >= cat.maxTeams) {
          showToast(`La categoría "${cat.name}" está completa (${cat.maxTeams}/${cat.maxTeams})`, 'error');
          setDraggedTeamId(null); setDropTargetId(null);
          return;
        }
      }
    }

    const result = await moveTeamToCategory(tournament.id, draggedTeamId, targetCatId, team.status);
    setDraggedTeamId(null);
    setDropTargetId(null);
    if (!result.ok) { showToast(result.error ?? 'Error al mover equipo', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    const catName = targetCatId
      ? tournament.categories.find(c => c.id === targetCatId)?.name ?? targetCatId
      : 'Sin categoría';
    showToast(`Equipo movido a "${catName}"`, 'success');
  }

  async function handleReplacePartner() {
    if (!replaceModal || !selectedNewPartner) return;
    setReplacing(true);
    const result = await replaceTeamPartner(id, replaceModal.teamId, replaceModal.reviewPlayer, {
      name: selectedNewPartner.name,
      email: selectedNewPartner.email,
      id: selectedNewPartner.id,
    });
    setReplacing(false);
    if (!result.ok) { showToast(result.error ?? 'No se pudo reemplazar', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    setReplaceModal(null);
    setNewPartnerQuery('');
    setNewPartnerResults([]);
    setSelectedNewPartner(null);
    showToast(`Nuevo compañero/a asignado: ${selectedNewPartner.name}`, 'success');
  }

  // ── Group formation helpers ─────────────────────────────────────────────────
  const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function currentConfig(): ControlPanelConfig {
    return { ...DEFAULT_CONTROL_CONFIG, ...(tournament?.config ?? {}) };
  }
  function groupCountFor(catId: string, maxTeams: number): number {
    const g = (tournament?.config?.groups ?? []).find(x => x.categoryId === catId);
    if (g?.groupCount && g.groupCount > 0) return g.groupCount;
    return Math.max(1, Math.round(maxTeams / 4));
  }
  function groupIdsForCat(catId: string, count: number): string[] {
    return Array.from({ length: count }, (_, i) => `${catId}-G${i + 1}`);
  }
  function stageOf(catId: string): 'inscripcion' | 'grupos' {
    return tournament?.config?.categoryStages?.[catId] ?? 'inscripcion';
  }

  // Persist config (+ optional team group assignments) via the control-panel save route.
  async function persistGroupState(newConfig: ControlPanelConfig, newTeams?: PersonalizadoTeam[]) {
    if (!tournament) return;
    setSavingGroups(true);
    // optimistic local update
    setTournament(prev => prev ? { ...prev, config: newConfig, ...(newTeams ? { teams: newTeams } : {}) } : prev);
    const groupAssignments: Record<string, string | null> | undefined = newTeams
      ? Object.fromEntries(newTeams.map(t => [t.id, t.groupId ?? null]))
      : undefined;
    const res = await saveControlPanel({
      id: tournament.id,
      categories: tournament.categories,
      config: newConfig,
      groupAssignments,
      requesterId: currentUser?.id,
    });
    setSavingGroups(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo guardar', 'error'); return; }
    if (res.teams) setTournament(prev => prev ? { ...prev, teams: res.teams!, config: newConfig } : prev);
  }

  async function setCategoryStage(catId: string, stage: 'inscripcion' | 'grupos') {
    const cfg = currentConfig();
    const newConfig: ControlPanelConfig = { ...cfg, categoryStages: { ...(cfg.categoryStages ?? {}), [catId]: stage } };
    await persistGroupState(newConfig);
    showToast(stage === 'grupos' ? 'Categoría en Formación de Grupos' : 'Categoría reabierta a Inscripción', 'success');
  }

  function randomAssignGroups(catId: string) {
    if (!tournament) return;
    const cat = tournament.categories.find(c => c.id === catId);
    if (!cat) return;
    const count = groupCountFor(catId, cat.maxTeams);
    const groups = groupIdsForCat(catId, count);
    const catTeams = tournament.teams.filter(t => t.categoryId === catId && (t.status === 'pending' || t.status === 'confirmed' || t.status === 'partial_review'));
    const shuffled = [...catTeams].sort(() => Math.random() - 0.5);
    const assignMap = new Map<string, string>();
    shuffled.forEach((t, i) => assignMap.set(t.id, groups[i % groups.length]));
    const newTeams = tournament.teams.map(t => assignMap.has(t.id) ? { ...t, groupId: assignMap.get(t.id) } : t);
    void persistGroupState(currentConfig(), newTeams);
  }

  function clearGroups(catId: string) {
    if (!tournament) return;
    const newTeams = tournament.teams.map(t => t.categoryId === catId ? { ...t, groupId: undefined } : t);
    void persistGroupState(currentConfig(), newTeams);
  }

  function moveTeamToGroup(teamId: string, groupId: string | null) {
    if (!tournament) return;
    const newTeams = tournament.teams.map(t => t.id === teamId ? { ...t, groupId: groupId ?? undefined } : t);
    void persistGroupState(currentConfig(), newTeams);
  }

  function adjustGroupCount(catId: string, delta: number) {
    if (!tournament) return;
    const cat = tournament.categories.find(c => c.id === catId);
    if (!cat) return;
    const cfg = currentConfig();
    const cur = groupCountFor(catId, cat.maxTeams);
    const next = Math.max(1, Math.min(cat.maxTeams, cur + delta));
    if (next === cur) return;
    const tpg = teamsPerGroupFromCount(cat.maxTeams, next);
    const groups = [...(cfg.groups ?? [])];
    const idx = groups.findIndex(g => g.categoryId === catId);
    if (idx >= 0) groups[idx] = { ...groups[idx], groupCount: next, teamsPerGroup: tpg };
    else groups.push({ categoryId: catId, groupCount: next, teamsPerGroup: tpg, qualifyPerGroup: 2 });
    // Drop assignments that point to now-removed groups.
    const valid = new Set(groupIdsForCat(catId, next));
    const newTeams = tournament.teams.map(t => (t.categoryId === catId && t.groupId && !valid.has(t.groupId)) ? { ...t, groupId: undefined } : t);
    void persistGroupState({ ...cfg, groups }, newTeams);
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

  // ── SOLO PRUEBA: eliminar antes del lanzamiento ────────────────────────────
  async function handleSeedTeams(catId: string) {
    if (!tournament || !currentUser) return;
    setSeeding(true);
    const cat = tournament.categories.find(c => c.id === catId);
    if (!cat) { setSeeding(false); return; }
    const slots = Math.min(seedCount, cat.maxTeams - enrolledCount(tournament, catId));
    if (slots <= 0) { setSeeding(false); return; }

    try {
      const res = await fetch('/api/personalizado/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournament.id, categoryId: catId, count: slots, requesterId: currentUser.id }),
      });
      const data = await res.json() as { ok?: boolean; added?: number; error?: string };
      if (!res.ok) { showToast(data.error ?? 'Error al generar equipos', 'error'); setSeeding(false); return; }
      const updated = await loadPersonalizadoById(id);
      setTournament(updated);
      showToast(`${data.added ?? slots} equipos de prueba generados y confirmados`, 'success');
    } catch {
      showToast('Error de red', 'error');
    }
    setSeedCatId(null);
    setSeedCount(4);
    setSeeding(false);
  }

  async function handleCancelTournament() {
    if (!tournament || !currentUser) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/personalizado/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tournament.id, requesterId: currentUser.id }),
      });
      const data = await res.json() as { ok?: boolean; previousStatus?: string; error?: string };
      if (!res.ok) { showToast(data.error ?? 'No se pudo cancelar', 'error'); setCancelling(false); return; }
      savePersonalizado({ ...tournament, status: 'cancelled', previousStatus: tournament.status });
      const updated = await loadPersonalizadoById(id);
      setTournament(updated);
      setCancelModal(false);
      showToast('Torneo cancelado. Los datos e inscripciones se conservaron.', 'success');
    } catch {
      showToast('Error de red', 'error');
    }
    setCancelling(false);
  }

  async function handleReactivateTournament() {
    if (!tournament || !currentUser) return;
    setReactivating(true);
    try {
      const res = await fetch('/api/personalizado/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tournament.id, requesterId: currentUser.id }),
      });
      const data = await res.json() as { ok?: boolean; restoredStatus?: string; error?: string };
      if (!res.ok) { showToast(data.error ?? 'No se pudo reactivar', 'error'); setReactivating(false); return; }
      const restored = (data.restoredStatus ?? tournament.previousStatus ?? 'registration_open') as PersonalizadoTournament['status'];
      savePersonalizado({ ...tournament, status: restored, previousStatus: undefined });
      const updated = await loadPersonalizadoById(id);
      setTournament(updated);
      showToast(`Torneo reactivado — volvió a estado "${STATUS_LABELS[restored]}"`, 'success');
    } catch {
      showToast('Error de red', 'error');
    }
    setReactivating(false);
  }

  async function handleDeleteTournament() {
    if (!tournament || !currentUser) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/personalizado/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tournament.id, requesterId: currentUser.id }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { showToast(data.error ?? 'No se pudo eliminar', 'error'); setDeleting(false); return; }
      removePersonalizado(tournament.id);
      router.push('/dashboard/player/tournaments');
    } catch {
      showToast('Error de red', 'error');
      setDeleting(false);
    }
  }

  async function handleRemoveTeam(teamId: string) {
    if (!tournament) return;
    setRemovingTeamId(teamId);
    const result = await removeTeam(tournament.id, teamId, currentUser?.id);
    setRemovingTeamId(null);
    if (!result.ok) { showToast(result.error ?? 'No se pudo eliminar el registro', 'error'); return; }
    const updated = await loadPersonalizadoById(id);
    setTournament(updated);
    showToast('Registro eliminado permanentemente', 'success');
  }

  // Generate the whole-tournament calendar: group-stage schedule (classification) for all
  // categories + the elimination bracket per category, in one pass. Bumps registration_open →
  // configured so the calendar/standings/bracket tabs become available.
  async function handleGenerateCalendar() {
    if (!tournament) return;
    setGeneratingCal(true);
    const cfg = currentConfig();
    const matches = generateGroupSchedule(tournament);
    if (matches.length === 0) {
      showToast('No hay equipos asignados a grupos. Completá la formación de grupos en todas las categorías.', 'error');
      setGeneratingCal(false);
      return;
    }
    // Bracket starts as a structural skeleton (position placeholders, no teams). Teams are
    // released into round-0 slots only as each group's classification is confirmed.
    const allBracketUnscheduled = tournament.categories.flatMap(cat => generateBracketSkeleton(tournament, cat.id));
    const tempTournament = { ...tournament, config: { ...cfg, matches } };
    const bracketMatches = scheduleAllBrackets(tempTournament, allBracketUnscheduled);
    const newConfig: ControlPanelConfig = { ...cfg, matches, bracketMatches, confirmedGroups: [] };
    const newStatus = tournament.status === 'registration_open' ? 'configured' : tournament.status;
    setTournament(prev => prev ? { ...prev, config: newConfig, status: newStatus } : prev);
    const res = await saveControlPanel({
      id: tournament.id, categories: tournament.categories, config: newConfig,
      status: newStatus, requesterId: currentUser?.id,
    });
    setGeneratingCal(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo generar el calendario', 'error'); return; }
    if (res.teams) setTournament(prev => prev ? { ...prev, teams: res.teams!, config: newConfig, status: newStatus } : prev);
    setShowTabs(true);
    setTimeout(() => document.getElementById('tournament-tabs-anchor')?.scrollIntoView({ behavior: 'smooth' }), 60);
    showToast(`Calendario generado: ${matches.length} partidos de clasificación + ${bracketMatches.length} de eliminatoria`, 'success');
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
            <button onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fff', color: 'var(--black)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <Download size={14} /> Exportar inscritos (CSV)
            </button>
          )}
          {/* Panel de Control — always available to the organizer (incl. Live, to extend dates/courts) */}
          {tournament.status !== 'cancelled' && (
            <Link href={`/dashboard/player/tournaments/personalizado/${tournament.id}/control`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <Settings size={14} /> Panel de Control
            </Link>
          )}
          {(tournament.status === 'configured' || tournament.status === 'live') && (
            <button
              onClick={() => { setShowTabs(prev => !prev); if (!showTabs) setTimeout(() => document.getElementById('tournament-tabs-anchor')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: showTabs ? 'var(--black)' : '#fff', color: showTabs ? 'var(--neon)' : 'var(--black)', border: showTabs ? 'none' : '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              <CalendarDays size={14} /> {showTabs ? 'Ocultar Calendario' : 'Ver Calendario Completo'}
            </button>
          )}
        </div>
      </div>

      {/* Equipos sin categoría (unassigned pool) — also a drop target */}
      {(tournament.teams.filter(t => t.status === 'unassigned').length > 0 || draggedTeamId) && (
        <div
          style={{ ...card, border: `1px dashed ${dropTargetId === 'UNASSIGNED' ? 'rgba(234,179,8,0.9)' : 'rgba(234,179,8,0.5)'}`, background: dropTargetId === 'UNASSIGNED' ? 'rgba(254,249,195,0.5)' : 'rgba(234,179,8,0.04)', marginBottom: 16, transition: 'background 0.15s' }}
          onDragOver={(e) => { e.preventDefault(); setDropTargetId('UNASSIGNED'); }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={(e) => { e.preventDefault(); void handleDrop(null); }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#92400e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠ Sin categoría
            {draggedTeamId && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--grey-400)', letterSpacing: '0.06em' }}>— SOLTAR AQUÍ PARA QUITAR DE CATEGORÍA</span>}
          </div>
          {tournament.teams.filter(t => t.status === 'unassigned').map(team => (
            <div
              key={team.id}
              draggable
              onDragStart={(e) => { setDraggedTeamId(team.id); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => { setDraggedTeamId(null); setDropTargetId(null); }}
              style={{ padding: '10px 12px', border: `1px solid ${draggedTeamId === team.id ? 'var(--black)' : 'rgba(234,179,8,0.3)'}`, background: '#fff', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, flexWrap: 'wrap', gap: 6, cursor: 'grab', opacity: draggedTeamId === team.id ? 0.5 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--grey-300)', fontSize: 16 }}>⠿</span>
                <div>
                  <span style={{ fontWeight: 600 }}>{team.player1Name}</span>
                  {team.player2Name && <span style={{ color: 'var(--grey-400)' }}> / {team.player2Name}</span>}
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#92400e', marginTop: 3 }}>
                    SIN CATEGORÍA
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {tournament.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleResolveReview(team, cat.id)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer', background: 'var(--black)', color: 'var(--neon)', border: 'none', whiteSpace: 'nowrap' }}
                  >
                    → {cat.name}
                  </button>
                ))}
                <button
                  onClick={() => void handleRemoveTeam(team.id)}
                  disabled={removingTeamId === team.id}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: removingTeamId === team.id ? 'wait' : 'pointer', background: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.3)', whiteSpace: 'nowrap', opacity: removingTeamId === team.id ? 0.6 : 1 }}
                >
                  {removingTeamId === team.id ? '…' : '✕ Eliminar Registro'}
                </button>
              </div>
            </div>
          ))}
          {tournament.teams.filter(t => t.status === 'unassigned').length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              Arrastrá un equipo aquí para quitarlo de su categoría
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {tournament.categories.map((cat) => {
        const allCatTeams     = tournament.teams.filter(t => t.categoryId === cat.id);
        const activeTeams     = allCatTeams.filter(t => t.status !== 'waitlisted' && t.status !== 'rejected' && t.status !== 'unassigned');
        const waitlistedTeams = allCatTeams.filter(t => t.status === 'waitlisted');
        const rejectedTeams   = allCatTeams.filter(t => t.status === 'rejected');
        const waiting         = waitlistCount(tournament, cat.id);
        const isAddingHere    = addTeamCatId === cat.id;
        const enrolled        = enrolledCount(tournament, cat.id);
        const isFull          = enrolled >= cat.maxTeams;
        const progress        = cat.maxTeams > 0 ? Math.min(100, Math.round((enrolled / cat.maxTeams) * 100)) : 0;
        const collapsed       = !!collapsedCats[cat.id];
        const stage           = stageOf(cat.id);
        const inGroups        = stage === 'grupos';

        const isDragTarget = dropTargetId === cat.id;

        return (
          <div
            key={cat.id}
            style={{ ...card, outline: isDragTarget ? '2px dashed var(--neon)' : 'none', transition: 'outline 0.1s' }}
            onDragOver={(e) => { e.preventDefault(); setDropTargetId(cat.id); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null); }}
            onDrop={(e) => { e.preventDefault(); void handleDrop(cat.id); }}
          >
            {/* Category header — clickable to collapse/expand */}
            <div
              onClick={() => toggleCat(cat.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 3, transition: 'transform 0.15s', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>▾</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {cat.name}
                    {inGroups && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', background: 'var(--black)', color: 'var(--neon)' }}>
                        ⚙ Formación de Grupos
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{GENDER_LABELS[cat.gender]} · Parejas</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isFull ? 'var(--turf-green, #15803d)' : 'var(--black)', textAlign: 'right' }}>
                  {enrolled} / {cat.maxTeams} inscritos{waiting > 0 ? ` · ${waiting} en espera` : ''}
                  {inGroups && <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#854d0e', marginTop: 2 }}>Inscripción cerrada</span>}
                </div>
                {/* Group-formation toggle */}
                {tournament.status === 'registration_open' && !inGroups && isFull && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCollapsedCats(prev => ({ ...prev, [cat.id]: false })); void setCategoryStage(cat.id, 'grupos'); }}
                    disabled={savingGroups}
                    style={{ padding: '6px 14px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: savingGroups ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  >
                    ▶ Formar grupos
                  </button>
                )}
                {tournament.status === 'registration_open' && inGroups && (
                  <button
                    onClick={(e) => { e.stopPropagation(); void setCategoryStage(cat.id, 'inscripcion'); }}
                    disabled={savingGroups}
                    style={{ padding: '6px 14px', background: '#fff', color: 'var(--grey-600)', border: '1px solid var(--grey-300)', cursor: savingGroups ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  >
                    ← Reabrir inscripción
                  </button>
                )}
                {tournament.status === 'registration_open' && !inGroups && !isAddingHere && (
                  <button
                    onClick={(e) => { e.stopPropagation(); resetAddForm(); setAddTeamCatId(cat.id); setCollapsedCats(prev => ({ ...prev, [cat.id]: false })); }}
                    style={{ padding: '6px 14px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  >
                    + Agregar equipo
                  </button>
                )}
                {/* SOLO PRUEBA — eliminar antes del lanzamiento */}
                {!inGroups && (tournament.status === 'registration_open' || tournament.status === 'configured') && seedCatId !== cat.id && enrolled < cat.maxTeams && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSeedCatId(cat.id); setSeedCount(Math.min(4, cat.maxTeams - enrolled)); setCollapsedCats(prev => ({ ...prev, [cat.id]: false })); }}
                    style={{ padding: '6px 14px', background: 'rgba(234,179,8,0.1)', color: '#854d0e', border: '1px dashed #ca8a04', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  >
                    🎲 Seed prueba
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--grey-100)', borderRadius: 3, overflow: 'hidden', marginBottom: collapsed ? 0 : 14 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: isFull ? 'var(--turf-green, #15803d)' : 'var(--neon, #d6ff00)', borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>

            {!collapsed && inGroups && (
              <GroupFormation
                cat={cat}
                groupCount={groupCountFor(cat.id, cat.maxTeams)}
                groupIds={groupIdsForCat(cat.id, groupCountFor(cat.id, cat.maxTeams))}
                groupLetters={GROUP_LETTERS}
                teams={tournament.teams.filter(t => t.categoryId === cat.id && (t.status === 'pending' || t.status === 'confirmed' || t.status === 'partial_review'))}
                teamsPerGroup={teamsPerGroupFromCount(cat.maxTeams, groupCountFor(cat.id, cat.maxTeams))}
                saving={savingGroups}
                dragTeamId={groupDragTeamId}
                dropTarget={groupDropTarget}
                onDragStart={(id) => setGroupDragTeamId(id)}
                onDragEnd={() => { setGroupDragTeamId(null); setGroupDropTarget(null); }}
                onSetDropTarget={setGroupDropTarget}
                onDropTeam={(gid) => { if (groupDragTeamId) moveTeamToGroup(groupDragTeamId, gid); setGroupDragTeamId(null); setGroupDropTarget(null); }}
                onRandom={() => randomAssignGroups(cat.id)}
                onClear={() => clearGroups(cat.id)}
                onAdjustGroupCount={(d) => adjustGroupCount(cat.id, d)}
              />
            )}

            {!collapsed && !inGroups && (<>

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

            {/* SOLO PRUEBA — seed form — eliminar antes del lanzamiento */}
            {seedCatId === cat.id && (
              <div style={{ padding: '14px 16px', background: 'rgba(234,179,8,0.06)', border: '1px dashed #ca8a04', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#854d0e', marginBottom: 12 }}>
                  🎲 Seed de Prueba — ELIMINAR ANTES DEL LANZAMIENTO
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-600)' }}>Equipos a generar:</span>
                    <input
                      type="number" min={1} max={cat.maxTeams - enrolledCount(tournament, cat.id)}
                      value={seedCount}
                      onChange={e => setSeedCount(Math.max(1, Math.min(Number(e.target.value), cat.maxTeams - enrolledCount(tournament, cat.id))))}
                      style={{ width: 56, padding: '6px 8px', fontSize: 13, border: '1px solid var(--grey-200)', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                      (máx disponibles: {cat.maxTeams - enrolledCount(tournament, cat.id)})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSeedTeams(cat.id)}
                      disabled={seeding || seedCount < 1}
                      style={{ padding: '7px 16px', background: seeding ? 'var(--grey-300)' : '#854d0e', color: '#fff', border: 'none', cursor: seeding ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                    >
                      {seeding ? 'Generando…' : `Generar ${seedCount} equipos`}
                    </button>
                    <button
                      onClick={() => setSeedCatId(null)}
                      style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                  Nombres generados: &ldquo;[Prueba] {cat.name} 1A / 1B&rdquo;, &ldquo;[Prueba] {cat.name} 2A / 2B&rdquo;, etc. Auto-confirmados.
                </div>
              </div>
            )}

            {/* Active teams */}
            {activeTeams.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
                  Inscriptos
                  {draggedTeamId && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--neon)', marginLeft: 8, background: 'var(--black)', padding: '1px 6px' }}>DROP AQUÍ</span>}
                </div>
                {activeTeams.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    canManage={tournament.status === 'registration_open'}
                    isDragging={draggedTeamId === team.id}
                    onDragStart={() => setDraggedTeamId(team.id)}
                    onDragEnd={() => { setDraggedTeamId(null); setDropTargetId(null); }}
                    onConfirm={() => handleConfirm(team.id)}
                    onReject={() => openRejectModal(team, cat.name)}
                    onReview={() => openReviewModal(team, cat.id, cat.name)}
                    onResolveReview={() => handleResolveReview(team)}
                    onReplacePartner={() => {
                      const teamName = team.player2Name ? `${team.player1Name} / ${team.player2Name}` : team.player1Name;
                      setReplaceModal({ teamId: team.id, reviewPlayer: team.reviewPlayer ?? 'player2', teamName });
                      setSelectedNewPartner(null); setNewPartnerQuery(''); setNewPartnerResults([]);
                    }}
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
            </>)}
          </div>
        );
      })}

      {/* Tournament analysis + global "Generar Calendario" */}
      {tournament.categories.length > 0 && tournament.status !== 'draft' && tournament.status !== 'cancelled' && (() => {
        const a = analyzeTournament(tournament, currentConfig());
        const hasCalendar = (tournament.config?.matches?.length ?? 0) > 0;
        return (
          <div style={{ ...card, marginTop: 24, borderColor: a.allGroupsReady ? 'rgba(214,255,0,0.6)' : 'var(--grey-200)' }}>
            <div style={secTitle}>Análisis del Torneo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                ['Duración estimada', `${a.days} día${a.days > 1 ? 's' : ''}`, `${a.startDate} → ${a.endDate}`],
                ['Canchas · franjas', `${a.courts} × ${a.slotsPerDay}`, `${a.matchesPerDay} juegos/día · ${a.matchDurationMin} min`],
                ['Juegos clasificación', `${a.groupMatches}`, 'fase de grupos'],
                ['Juegos eliminatoria', `${a.bracketMatches}`, 'fase de eliminación'],
                ['Total de juegos', `${a.totalMatches}`, `capacidad: ${a.capacityMatches}`],
              ].map(([label, value, sub], i) => (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--grey-50, #fafafa)', border: '1px solid var(--grey-100)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--black)', lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Per-category breakdown */}
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                <thead>
                  <tr>
                    {['Categoría', 'Grupos', 'Equipos', 'Clasif.', 'Eliminat.', 'Total'].map((h, i) => (
                      <th key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)', padding: '6px 10px', textAlign: i === 0 ? 'left' : 'right', borderBottom: '1px solid var(--grey-100)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.perCategory.map(c => (
                    <tr key={c.categoryId}>
                      <td style={{ fontSize: 12, fontWeight: 600, padding: '6px 10px', borderBottom: '1px solid var(--grey-50, #f5f5f5)' }}>{c.categoryName}</td>
                      <td style={{ fontSize: 12, padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--grey-50, #f5f5f5)' }}>{c.groups}</td>
                      <td style={{ fontSize: 12, padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--grey-50, #f5f5f5)' }}>{c.teams}</td>
                      <td style={{ fontSize: 12, padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--grey-50, #f5f5f5)' }}>{c.groupMatches}</td>
                      <td style={{ fontSize: 12, padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--grey-50, #f5f5f5)' }}>{c.bracketMatches}</td>
                      <td style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--grey-50, #f5f5f5)' }}>{c.totalMatches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!a.feasible && (
              <div style={{ padding: '10px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.4)', fontSize: 12, color: '#854d0e', marginBottom: 16 }}>
                ⚠ Los {a.totalMatches} juegos no entran en los {a.capacityMatches} espacios disponibles. Agregá canchas, extendé el horario o sumá días en el Panel de Control.
              </div>
            )}

            {canManagePersonalizado(tournament, currentUser?.id) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleGenerateCalendar}
                  disabled={generatingCal || !a.allGroupsReady}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 26px', background: a.allGroupsReady ? 'var(--black)' : 'var(--grey-200)', color: a.allGroupsReady ? 'var(--neon)' : 'var(--grey-400)', border: 'none', cursor: generatingCal ? 'wait' : a.allGroupsReady ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  <CalendarDays size={16} />
                  {generatingCal ? 'Generando…' : hasCalendar ? 'Regenerar Calendario del Torneo' : 'Generar Calendario del Torneo'}
                </button>
                {!a.allGroupsReady && (
                  <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>Completá la formación de grupos en todas las categorías para habilitar la generación.</span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tournament Tabs (Calendario · Clasificación · Bracket) */}
      {showTabs && (tournament.status === 'configured' || tournament.status === 'live') && (
        <div id="tournament-tabs-anchor" style={{ marginTop: 32 }}>
          <TournamentTabs
            tournament={tournament}
            canManage={!!canManagePersonalizado(tournament, currentUser?.id)}
            canEditResults={isCreator}
            onUpdate={setTournament}
          />
        </div>
      )}

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

      {/* Danger zone — cancel / reactivate / delete (creator only) */}
      {isCreator && ['draft','registration_open','configured','cancelled'].includes(tournament.status) && (
        <div style={{ ...card, borderColor: 'rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.02)', marginTop: 24 }}>
          <div style={{ ...secTitle, color: '#b91c1c', borderBottomColor: 'rgba(220,38,38,0.15)' }}>Zona de Peligro</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {tournament.status !== 'cancelled' && (
              <button
                onClick={() => setCancelModal(true)}
                style={{ padding: '9px 18px', background: '#fff', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.4)', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
              >
                ⏸ Cancelar torneo
              </button>
            )}
            {tournament.status === 'cancelled' && (
              <button
                onClick={handleReactivateTournament}
                disabled={reactivating}
                style={{ padding: '9px 18px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: reactivating ? 'wait' : 'pointer', opacity: reactivating ? 0.6 : 1, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
              >
                {reactivating ? 'Reactivando…' : '▶ Reactivar torneo'}
              </button>
            )}
            <button
              onClick={() => { setDeleteConfirmText(''); setDeleteModal(true); }}
              style={{ padding: '9px 18px', background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              🗑 Eliminar torneo
            </button>
          </div>
          {tournament.status === 'cancelled' && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#b91c1c', background: 'rgba(220,38,38,0.06)', padding: '10px 14px', border: '1px solid rgba(220,38,38,0.15)' }}>
              Este torneo está cancelado. Las inscripciones se conservaron. Podés reactivarlo para otra fecha o sede, o eliminarlo definitivamente.
            </div>
          )}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setCancelModal(false); }}
        >
          <div style={{ background: '#fff', padding: '28px 32px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
              ¿Cancelar el torneo?
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.6, marginBottom: 20 }}>
              El torneo pasará a estado <strong>Cancelado</strong>. Las inscripciones y todos los datos se conservarán.
              Podrás reactivarlo en cualquier momento para otra fecha o sede.
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#b91c1c', marginBottom: 22 }}>
              Si los participantes ya pagaron su inscripción, el reintegro debe tramitarse manualmente en Stripe.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelModal(false)}
                style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-500)', textTransform: 'uppercase' }}
              >
                Volver
              </button>
              <button
                onClick={handleCancelTournament}
                disabled={cancelling}
                style={{ padding: '9px 22px', background: '#b91c1c', color: '#fff', border: 'none', cursor: cancelling ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: cancelling ? 0.6 : 1 }}
              >
                {cancelling ? 'Cancelando…' : 'Sí, cancelar torneo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteModal(false); }}
        >
          <div style={{ background: '#fff', padding: '28px 32px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8, color: '#b91c1c' }}>
              ¿Eliminar el torneo?
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.6, marginBottom: 12 }}>
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán el torneo y todos los datos asociados: inscripciones, equipos, partidos y configuración.
            </div>
            {tournament.status !== 'draft' && (
              <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
                ⚠️ Si los participantes ya pagaron, el reintegro debe tramitarse manualmente en Stripe antes de eliminar el torneo.
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...lbl, marginBottom: 6 }}>
                Escribí el nombre del torneo para confirmar: <strong>{tournament.name}</strong>
              </label>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={tournament.name}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '2px solid rgba(220,38,38,0.4)', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModal(false)}
                style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-500)', textTransform: 'uppercase' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTournament}
                disabled={deleting || deleteConfirmText !== tournament.name}
                style={{ padding: '9px 22px', background: deleteConfirmText === tournament.name ? '#b91c1c' : 'var(--grey-300)', color: '#fff', border: 'none', cursor: (deleting || deleteConfirmText !== tournament.name) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setReviewModal(null); }}
        >
          <div style={{ background: '#fff', padding: '28px 32px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>
              Poner en revisión
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey-500)', marginBottom: 4 }}>
              {reviewModal.p1Name}{reviewModal.p2Name ? ` / ${reviewModal.p2Name}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 20 }}>
              Categoría: {reviewModal.catName}
            </div>

            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10, display: 'block' }}>
              ¿Cuál jugador/a está en revisión?
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {([
                { value: 'player1' as const, label: reviewModal.p1Name, desc: 'J1 en revisión. J2 puede buscar nuevo compañero/a.' },
                ...(reviewModal.p2Name ? [{ value: 'player2' as const, label: reviewModal.p2Name, desc: 'J2 en revisión. J1 puede buscar nuevo compañero/a.' }] : []),
                { value: 'both' as const, label: 'Ambos jugadores', desc: 'El equipo sale de la categoría y queda sin asignar.' },
              ] as const).map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `1px solid ${reviewTarget === opt.value ? 'var(--black)' : 'var(--grey-200)'}`, background: reviewTarget === opt.value ? 'rgba(0,0,0,0.03)' : '#fff', cursor: 'pointer' }}>
                  <input type="radio" name="reviewTarget" value={opt.value} checked={reviewTarget === opt.value} onChange={() => setReviewTarget(opt.value)} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReviewModal(null)}
                style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-500)', textTransform: 'uppercase' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReview}
                disabled={reviewing}
                style={{ padding: '9px 22px', background: 'rgba(234,179,8,0.9)', color: '#fff', border: 'none', cursor: reviewing ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: reviewing ? 0.6 : 1 }}
              >
                {reviewing ? 'Procesando…' : 'Poner en revisión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace partner modal (Buscar compañero) */}
      {replaceModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setReplaceModal(null); setSelectedNewPartner(null); } }}
        >
          <div style={{ background: '#fff', padding: '28px 32px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>
              Asignar nuevo compañero/a
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 20 }}>
              Reemplazando {replaceModal.reviewPlayer === 'player1' ? 'Jugador 1' : 'Jugador 2'} en: <strong>{replaceModal.teamName}</strong>
            </div>
            <PlayerSearchBox
              label={replaceModal.reviewPlayer === 'player1' ? 'Nuevo Jugador 1' : 'Nuevo Jugador 2'}
              value={newPartnerQuery}
              onChange={setNewPartnerQuery}
              results={newPartnerResults}
              selected={selectedNewPartner}
              onSelect={p => { setSelectedNewPartner(p); setNewPartnerResults([]); }}
              onClear={() => { setSelectedNewPartner(null); setNewPartnerQuery(''); }}
            />
            <div style={{ fontSize: 11, color: 'var(--grey-400)', marginBottom: 20 }}>
              El equipo volverá a estado <strong>Confirmado</strong> con el nuevo jugador/a.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setReplaceModal(null); setSelectedNewPartner(null); }}
                style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-500)', textTransform: 'uppercase' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReplacePartner}
                disabled={!selectedNewPartner || replacing}
                style={{ padding: '9px 22px', background: !selectedNewPartner ? 'var(--grey-300)' : 'var(--black)', color: !selectedNewPartner ? 'var(--grey-500)' : 'var(--neon)', border: 'none', cursor: (!selectedNewPartner || replacing) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: replacing ? 0.6 : 1 }}
              >
                {replacing ? 'Asignando…' : 'Asignar compañero/a'}
              </button>
            </div>
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

// ── GroupFormation sub-component ──────────────────────────────────────────────

function GroupFormation({
  cat, groupCount, groupIds, groupLetters, teams, teamsPerGroup, saving,
  dragTeamId, dropTarget, onDragStart, onDragEnd, onSetDropTarget, onDropTeam,
  onRandom, onClear, onAdjustGroupCount,
}: {
  cat: { id: string; name: string; maxTeams: number };
  groupCount: number;
  groupIds: string[];
  groupLetters: string;
  teams: PersonalizadoTeam[];
  teamsPerGroup: number;
  saving: boolean;
  dragTeamId: string | null;
  dropTarget: string | null;
  onDragStart: (teamId: string) => void;
  onDragEnd: () => void;
  onSetDropTarget: (target: string | null) => void;
  onDropTeam: (groupId: string | null) => void;
  onRandom: () => void;
  onClear: () => void;
  onAdjustGroupCount: (delta: number) => void;
}) {
  const poolId = `POOL-${cat.id}`;
  const unassigned = teams.filter(t => !t.groupId || !groupIds.includes(t.groupId));
  const allAssigned = unassigned.length === 0 && teams.length > 0;

  const chip = (t: PersonalizadoTeam) => (
    <div
      key={t.id}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(t.id); }}
      onDragEnd={onDragEnd}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginBottom: 4, border: '1px solid var(--grey-100)', background: dragTeamId === t.id ? 'var(--grey-50)' : '#fff', cursor: 'grab', fontSize: 11, opacity: dragTeamId === t.id ? 0.4 : 1 }}
    >
      <span style={{ color: 'var(--grey-300)', fontSize: 14 }}>⠿</span>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--black)' }}>{t.player1Name}</div>
        {t.player2Name && <div style={{ color: 'var(--grey-400)' }}>{t.player2Name}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 4 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Grupos:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => onAdjustGroupCount(-1)} disabled={saving || groupCount <= 1} style={{ width: 26, height: 26, border: '1px solid var(--grey-200)', background: '#fff', cursor: (saving || groupCount <= 1) ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, lineHeight: 1, color: 'var(--grey-600)' }}>−</button>
            <span style={{ minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{groupCount}</span>
            <button onClick={() => onAdjustGroupCount(1)} disabled={saving || groupCount >= cat.maxTeams} style={{ width: 26, height: 26, border: '1px solid var(--grey-200)', background: '#fff', cursor: (saving || groupCount >= cat.maxTeams) ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, lineHeight: 1, color: 'var(--grey-600)' }}>+</button>
          </div>
          <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>~{teamsPerGroup} equipos por grupo</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRandom} disabled={saving} style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: saving ? 'wait' : 'pointer' }}>🎲 Sortear al azar</button>
          <button onClick={onClear} disabled={saving} style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#fff', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', cursor: saving ? 'wait' : 'pointer' }}>✕ Limpiar</button>
        </div>
      </div>

      {/* Columns: pool (resizable) + groups (flex, left-aligned) */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Pool — resizable by dragging the right edge */}
        <div
          onDragOver={(e) => { e.preventDefault(); onSetDropTarget(poolId); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onSetDropTarget(null); }}
          onDrop={(e) => { e.preventDefault(); onDropTeam(null); }}
          style={{ resize: 'horizontal', overflow: 'hidden', width: 240, minWidth: 180, maxWidth: 420, flexShrink: 0, minHeight: 90, padding: 8, border: `1px dashed ${dropTarget === poolId ? 'rgba(214,255,0,0.9)' : 'var(--grey-200)'}`, background: dropTarget === poolId ? 'rgba(214,255,0,0.06)' : 'var(--grey-50, #fafafa)' }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Sin grupo ({unassigned.length})</div>
          {unassigned.map(chip)}
          {allAssigned && <div style={{ fontSize: 10, color: 'var(--turf-green, #15803d)', fontStyle: 'italic' }}>✓ Todos asignados</div>}
        </div>

        {/* Groups — fixed width, wrap left-to-right */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' }}>
          {groupIds.map((gid, i) => {
            const gTeams = teams.filter(t => t.groupId === gid);
            const isTarget = dropTarget === gid;
            return (
              <div
                key={gid}
                onDragOver={(e) => { e.preventDefault(); onSetDropTarget(gid); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onSetDropTarget(null); }}
                onDrop={(e) => { e.preventDefault(); onDropTeam(gid); }}
                style={{ width: 160, flexShrink: 0, minHeight: 90, padding: 8, border: `1px solid ${isTarget ? 'var(--black)' : 'var(--grey-100)'}`, background: isTarget ? 'rgba(214,255,0,0.06)' : '#fff' }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 8 }}>
                  Grupo {groupLetters[i % groupLetters.length]} <span style={{ color: 'var(--grey-400)', fontWeight: 400 }}>({gTeams.length})</span>
                </div>
                {gTeams.map(chip)}
                {gTeams.length === 0 && <div style={{ fontSize: 10, color: 'var(--grey-300)', fontStyle: 'italic' }}>Vacío</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* All-assigned indicator — the calendar is generated globally from the tournament header */}
      {allAssigned && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#15803d' }}>
          ✓ Todos los equipos de {cat.name} están asignados a un grupo
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 12 }}>
        Arrastrá los equipos entre grupos o usá &ldquo;Sortear al azar&rdquo;. Los cambios se guardan automáticamente.
      </div>
    </div>
  );
}

// ── TeamRow sub-component ─────────────────────────────────────────────────────

function TeamRow({
  team, canManage, isDragging, onDragStart, onDragEnd, onConfirm, onReject, onReview, onResolveReview, onReplacePartner,
}: {
  team: PersonalizadoTeam;
  canManage: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onReview: () => void;
  onResolveReview: () => void;
  onReplacePartner?: () => void;
}) {
  const hasInvitePending = team.player1Id && team.player2Email && !team.player2Id;
  const isReview = team.status === 'partial_review';
  const reviewedPlayer = team.reviewPlayer;

  const borderColor = isReview ? 'rgba(234,179,8,0.4)' : 'var(--grey-100)';
  const bgColor = isReview ? 'rgba(254,249,195,0.3)' : '#fff';

  return (
    <div
      draggable={canManage}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={onDragEnd}
      style={{ padding: '9px 12px', border: `1px solid ${borderColor}`, background: bgColor, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13, flexWrap: 'wrap', gap: 6, opacity: isDragging ? 0.4 : 1, cursor: canManage ? 'grab' : 'default' }}
    >
      {canManage && <span style={{ color: 'var(--grey-300)', fontSize: 16, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>⠿</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {/* Player 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{team.player1Name}</span>
          {isReview && reviewedPlayer === 'player1' && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 5px', background: 'rgba(234,179,8,0.2)', color: '#92400e', border: '1px solid rgba(234,179,8,0.4)' }}>EN REVISIÓN</span>
          )}
          {isReview && reviewedPlayer === 'player2' && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 5px', background: 'rgba(59,130,246,0.1)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.3)' }}>BUSCAR COMPAÑERO</span>
          )}
        </div>
        {/* Player 2 */}
        {team.player2Name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--grey-500)', fontSize: 12 }}>{team.player2Name}</span>
            {isReview && reviewedPlayer === 'player2' && (
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 5px', background: 'rgba(234,179,8,0.2)', color: '#92400e', border: '1px solid rgba(234,179,8,0.4)' }}>EN REVISIÓN</span>
            )}
            {isReview && reviewedPlayer === 'player1' && (
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 5px', background: 'rgba(59,130,246,0.1)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.3)' }}>BUSCAR COMPAÑERO</span>
            )}
          </div>
        )}
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
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Status badge */}
        {!isReview && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px',
            background: team.status === 'confirmed' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
            color: team.status === 'confirmed' ? '#15803d' : 'var(--grey-500)',
          }}>
            {team.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
          </span>
        )}
        {isReview && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(234,179,8,0.15)', color: '#92400e' }}>
            En revisión
          </span>
        )}
        {/* Action buttons */}
        {canManage && team.status === 'pending' && (
          <>
            <button onClick={onConfirm} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)' }}>✓ Confirmar</button>
            <button onClick={onReject} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)' }}>✕ Rechazar</button>
          </>
        )}
        {canManage && team.status === 'confirmed' && (
          <button onClick={onReview} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(234,179,8,0.1)', color: '#92400e', border: '1px solid rgba(234,179,8,0.35)' }}>⚑ Revisar</button>
        )}
        {canManage && isReview && (
          <>
            <button onClick={onResolveReview} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)' }}>✓ Resolver</button>
            {onReplacePartner && (
              <button onClick={onReplacePartner} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', background: 'rgba(59,130,246,0.1)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.3)' }}>👤 Reemplazar</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
