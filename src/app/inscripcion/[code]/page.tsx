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
  sendPartnerInvitationEmail,
} from '@/lib/email';
import { getFriendsForPlayer, fetchFriendsFromSupabase, searchPlayers, type RegisteredPlayer } from '@/lib/player-store';
import { getFamilyMembers, RELATION_LABELS, type FamilyMember } from '@/lib/family-store';
import { isEligibleForMaxAge, ageOnJan1 } from '@/lib/minor-categories-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import BrandLogo from '@/components/BrandLogo';

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
const inputStyle: React.CSSProperties = {
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
      <Link href="/">
        <BrandLogo height={32} />
      </Link>
    </div>
  );
}

type PartnerTab = 'friends' | 'invite' | 'family';
type WhoPlays = 'me' | 'family';
type DoneState = {
  catName: string;
  p1Name: string;
  p2Name?: string;
  waitlisted: boolean;
  invited: boolean; // true = partner hasn't accepted yet
};

export default function InscripcionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user } = useCurrentUser();
  const [authLoaded, setAuthLoaded] = useState(false);
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Partner state
  const [partnerTab, setPartnerTab] = useState<PartnerTab>('friends');
  const [friendSearch, setFriendSearch] = useState('');
  const [friends, setFriends] = useState<RegisteredPlayer[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<RegisteredPlayer | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Family-member state (only used when the organizer enabled it)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [whoPlays, setWhoPlays] = useState<WhoPlays>('me');
  const [player1FamilyId, setPlayer1FamilyId] = useState<string>('');   // family member playing as player1
  const [selectedFamilyPartner, setSelectedFamilyPartner] = useState<FamilyMember | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);

  // Mark auth as loaded once user resolves from localStorage
  useEffect(() => {
    const t = setTimeout(() => setAuthLoaded(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user !== null) setAuthLoaded(true);
  }, [user]);

  useEffect(() => {
    let active = true;
    loadPersonalizadoByCode(code).then(t => {
      if (!active) return;
      setTournament(t);
      setLoading(false);
    });
    return () => { active = false; };
  }, [code]);

  // Load friends when user is available
  useEffect(() => {
    if (!user) return;
    setFriends(getFriendsForPlayer(user.id));
    fetchFriendsFromSupabase(user.id).then(remote => {
      if (remote !== null) setFriends(remote);
    }).catch(() => {});
  }, [user]);

  // Load the guardian's family members when user is available
  useEffect(() => {
    if (!user) { setFamilyMembers([]); return; }
    setFamilyMembers(getFamilyMembers(user.id));
  }, [user]);

  const acceptsFamily = tournament?.config?.acceptsFamilyMembers === true;

  const filteredFriends = friendSearch.trim()
    ? friends.filter(f =>
        f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.email.toLowerCase().includes(friendSearch.toLowerCase())
      )
    : friends;

  // Also show non-friends from search when query is long enough
  const [searchResults, setSearchResults] = useState<RegisteredPlayer[]>([]);
  useEffect(() => {
    if (friendSearch.trim().length < 2) { setSearchResults([]); return; }
    const results = searchPlayers(friendSearch.trim());
    // Exclude self and already-friends
    const friendIds = new Set(friends.map(f => f.id));
    setSearchResults(results.filter(p => p.id !== user?.id && !friendIds.has(p.id)).slice(0, 5));
  }, [friendSearch, friends, user]);

  const selectedCat: PersonalizadoCategory | undefined =
    tournament?.categories.find(c => c.id === selectedCatId);

  const player1Member: FamilyMember | undefined =
    acceptsFamily && whoPlays === 'family'
      ? familyMembers.find(m => m.id === player1FamilyId)
      : undefined;

  // Child tournament: validate family-member participants' ages against the category's maxAge
  // (official Jan-1 rule). Members can play UP into older categories, never down.
  const isChildTournament = tournament?.config?.isChildTournament === true;
  function ageIssue(): string | null {
    if (!isChildTournament || !selectedCat || selectedCat.maxAge === undefined || !tournament) return null;
    const date = tournament.date;
    const tYear = new Date(date).getFullYear();
    const offenders: string[] = [];
    const partnerMember = partnerTab === 'family' ? selectedFamilyPartner : null;
    for (const m of [player1Member, partnerMember]) {
      if (m && m.birthDate && !isEligibleForMaxAge(m.birthDate, date, selectedCat.maxAge)) {
        offenders.push(`${m.fullName} cumple ${ageOnJan1(m.birthDate, date)} el 1 de enero de ${tYear}`);
      }
    }
    if (offenders.length === 0) return null;
    return `La categoría ${selectedCat.name} es para menores de ${selectedCat.maxAge} años (al 1 de enero de ${tYear}). ${offenders.join('; ')}.`;
  }
  const ageError = ageIssue();

  function canSubmit(): boolean {
    if (!selectedCat || !user) return false;
    if (ageError) return false;
    // Player 1: must pick a family member when "Un familiar" is selected
    if (acceptsFamily && whoPlays === 'family' && !player1Member) return false;
    // Player 2 (partner)
    if (partnerTab === 'friends') return selectedFriend !== null;
    if (partnerTab === 'family') {
      if (!selectedFamilyPartner) return false;
      // Can't pick the same family member as both player1 and player2
      if (player1Member && selectedFamilyPartner.id === player1Member.id) return false;
      return true;
    }
    return inviteName.trim().length > 0 && inviteEmail.trim().length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !selectedCat || !user) return;
    if (ageError) { setError(ageError); return; }
    setError(null);
    setSubmitting(true);

    const isFamilyPartner = partnerTab === 'family' && !!selectedFamilyPartner;
    const isInvite = partnerTab === 'invite' && !selectedFriend && !isFamilyPartner;

    // Player 1: the guardian, or a family member they registered
    const p1Name  = player1Member ? player1Member.fullName : user.name;
    const p1Email = player1Member ? undefined : user.email;
    const p1Id    = player1Member ? player1Member.id : user.id;

    // Player 2: friend / family member / email invite
    const p2Id    = selectedFriend?.id ?? (isFamilyPartner ? selectedFamilyPartner!.id : undefined);
    const p2Name  = selectedFriend?.name
      ?? (isFamilyPartner ? selectedFamilyPartner!.fullName : (isInvite ? inviteName.trim() : undefined));
    const p2Email = selectedFriend?.email
      ?? (isFamilyPartner ? undefined : (isInvite ? inviteEmail.trim() : undefined));

    const partnerMember = isFamilyPartner ? selectedFamilyPartner! : null;
    const res = await registerTeam(code, {
      categoryId: selectedCat.id,
      player1Name: p1Name,
      player1Email: p1Email,
      player1Id: p1Id,
      player2Name: p2Name,
      player2Email: p2Email,
      player2Id: p2Id,
      player1BirthDate: player1Member?.birthDate,
      player2BirthDate: partnerMember?.birthDate,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error ?? 'No se pudo completar la inscripción');
      setTournament(await loadPersonalizadoByCode(code));
      return;
    }

    const waitlisted = !!res.waitlisted;

    if (!waitlisted) {
      if (isInvite && p2Email) {
        void sendPartnerInvitationEmail({
          to: p2Email, toName: p2Name ?? inviteName,
          fromName: user.name,
          tournamentName: tournament.name, categoryName: selectedCat.name,
          dashboardUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/player/tournaments`,
        });
      } else {
        void sendPersonalizadoRegistrationEmail({
          to: user.email, toName: user.name,
          tournamentName: tournament.name, categoryName: selectedCat.name,
          date: tournament.date, locationName: tournament.locationName,
        });
      }
    } else {
      void sendPersonalizadoWaitlistedEmail({
        to: user.email, toName: user.name,
        tournamentName: tournament.name, categoryName: selectedCat.name,
      });
    }

    setDone({
      catName: selectedCat.name,
      p1Name,
      p2Name,
      waitlisted,
      invited: isInvite && !waitlisted,
    });
    setTournament(await loadPersonalizadoByCode(code));
  }

  // ── Loading / not-found / closed states ──────────────────────────────────────

  if (!authLoaded || loading) {
    return (
      <div style={page}><div style={shell}>
        <BrandHeader />
        <div style={{ ...card, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>
      </div></div>
    );
  }

  // Login wall
  if (!user) {
    const redirectUrl = `/inscripcion/${code}`;
    return (
      <div style={page}><div style={shell}>
        <BrandHeader />
        {tournament && (
          <div style={{ ...card, marginBottom: 16 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px' }}>
              {tournament.name}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {tournament.date && <span>📅 {tournament.date}{tournament.time ? ` · ${tournament.time}` : ''}</span>}
              {tournament.locationName && <span>📍 {tournament.locationName}</span>}
            </div>
          </div>
        )}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--black)', marginBottom: 10 }}>
            Inicia sesión para inscribirte
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6, marginBottom: 24 }}>
            Necesitas una cuenta PadelMGT para inscribirte en este torneo y que tu compañero/a pueda encontrarte fácilmente.
          </div>
          <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`} style={{
            display: 'inline-block', padding: '14px 32px', background: 'var(--black)', color: 'var(--neon)',
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em', textDecoration: 'none',
          }}>
            Iniciar Sesión →
          </Link>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--grey-400)' }}>
            ¿No tienes cuenta?{' '}
            <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`} style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'underline' }}>
              Regístrate gratis
            </Link>
          </div>
        </div>
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
            background: done.waitlisted ? 'rgba(245,158,11,0.14)' : done.invited ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.12)',
            color: done.waitlisted ? '#b45309' : done.invited ? '#1d4ed8' : '#15803d',
            fontSize: 28, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            {done.waitlisted ? '⏳' : done.invited ? '✉️' : '✓'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>
            {done.waitlisted
              ? 'Estás en lista de espera'
              : done.invited
              ? '¡Invitación enviada!'
              : '¡Inscripción confirmada!'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6, marginBottom: 20 }}>
            {done.waitlisted
              ? 'La categoría está llena. Te avisaremos por correo si se libera un lugar.'
              : done.invited
              ? `Tu lugar está reservado. ${done.p2Name ?? 'Tu compañero/a'} recibirá una invitación y deberá aceptarla desde su Dashboard.`
              : 'El organizador confirmará tu lugar.'}
          </div>
          <div style={{ textAlign: 'left', border: '1px solid var(--grey-100)', padding: '14px 16px', background: 'var(--grey-50, #fafafa)' }}>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>Torneo</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 10 }}>{tournament.name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>Categoría</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 10 }}>{done.catName}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>Jugador 1</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: done.p2Name ? 10 : 0 }}>{done.p1Name}</div>
            {done.p2Name && (
              <>
                <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4, marginTop: 4 }}>
                  {done.invited ? 'Invitado/a (pendiente)' : 'Jugador 2'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: done.invited ? '#1d4ed8' : 'var(--black)' }}>{done.p2Name}</div>
              </>
            )}
          </div>
          <Link href="/dashboard/player/tournaments" style={{
            display: 'inline-block', marginTop: 20, padding: '12px 28px',
            background: 'var(--black)', color: 'var(--neon)',
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em', textDecoration: 'none',
          }}>
            Ir a Mis Torneos
          </Link>
        </div>
      </div></div>
    );
  }

  // ── In-app notification: check if current user has a team in review ──────────
  const myReviewTeam = user
    ? tournament.teams.find(t =>
        (t.player1Id === user.id || t.player2Id === user.id) &&
        (t.status === 'partial_review' || t.status === 'unassigned')
      )
    : undefined;
  const myReviewCatName = myReviewTeam?.categoryId
    ? tournament.categories.find(c => c.id === myReviewTeam.categoryId)?.name
    : undefined;
  const iAmReviewedPlayer = myReviewTeam?.status === 'partial_review'
    ? (myReviewTeam.reviewPlayer === 'player1' ? myReviewTeam.player1Id === user?.id : myReviewTeam.player2Id === user?.id)
    : false;

  // ── Registration form ─────────────────────────────────────────────────────────

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

      {/* In-app review notification */}
      {myReviewTeam && (
        <div style={{ padding: '16px 20px', marginBottom: 16, border: `1px solid ${myReviewTeam.status === 'unassigned' ? 'rgba(234,179,8,0.5)' : iAmReviewedPlayer ? 'rgba(234,179,8,0.5)' : 'rgba(59,130,246,0.4)'}`, background: `${myReviewTeam.status === 'unassigned' ? 'rgba(254,249,195,0.5)' : iAmReviewedPlayer ? 'rgba(254,249,195,0.5)' : 'rgba(239,246,255,0.8)'}` }}>
          {myReviewTeam.status === 'unassigned' ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 6 }}>
                ⚠ Tu equipo está siendo revisado por el organizador
              </div>
              <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                Tu equipo fue temporalmente removido de la categoría{myReviewCatName ? ` <strong>${myReviewCatName}</strong>` : ''}. El organizador está revisando los datos. Te notificaremos cuando tu categoría sea asignada.
              </div>
            </>
          ) : iAmReviewedPlayer ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 6 }}>
                ⚠ Tu inscripción está en revisión
              </div>
              <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                El organizador está verificando tu participación en <strong>{myReviewCatName ?? 'la categoría'}</strong>. Por el momento tu lugar está reservado. Te informaremos cuando se resuelva.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', marginBottom: 6 }}>
                ℹ Tu compañero/a está en revisión — podés buscar un reemplazo
              </div>
              <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
                Tu compañero/a <strong>{myReviewTeam.reviewPlayer === 'player2' ? myReviewTeam.player2Name : myReviewTeam.player1Name}</strong> está siendo revisado/a por el organizador en <strong>{myReviewCatName ?? 'la categoría'}</strong>. Podés inscribirte de nuevo con un nuevo compañero/a si lo deseas.
              </div>
            </>
          )}
        </div>
      )}

      {/* Category selector */}
      <div style={card}>
        <span style={label}>Elige tu categoría</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tournament.categories.map((cat) => {
            const count = enrolledCount(tournament, cat.id);
            const waiting = waitlistCount(tournament, cat.id);
            const full = count >= cat.maxTeams;
            const closed = tournament.config?.categoryStages?.[cat.id] === 'grupos';
            const selected = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                disabled={closed}
                onClick={() => { if (closed) return; setSelectedCatId(cat.id); setError(null); }}
                style={{
                  textAlign: 'left', padding: '14px 16px', cursor: closed ? 'not-allowed' : 'pointer',
                  background: closed ? 'var(--grey-50, #fafafa)' : selected ? 'rgba(214,255,0,0.10)' : '#fff',
                  border: selected && !closed ? '2px solid var(--black)' : '1px solid var(--grey-200)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  opacity: closed ? 0.65 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {cat.name}
                    {isChildTournament && cat.maxAge !== undefined && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px',
                        background: 'rgba(34,197,94,0.12)', color: '#15803d',
                      }}>MENORES DE {cat.maxAge}</span>
                    )}
                    {closed ? (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px',
                        background: 'rgba(0,0,0,0.06)', color: 'var(--grey-500)',
                      }}>INSCRIPCIÓN CERRADA</span>
                    ) : full && (
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
                  {closed ? (
                    <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 3 }}>
                      Esta categoría ya está formando los grupos. No admite nuevas inscripciones.
                    </div>
                  ) : full && (
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
        <form onSubmit={handleSubmit}>
          {/* ¿Quién juega? — only when the organizer accepts family members */}
          {acceptsFamily && (
            <div style={card}>
              <span style={label}>¿Quién juega?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {([{ v: 'me', l: 'Yo' }, { v: 'family', l: 'Un familiar' }] as const).map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => { setWhoPlays(o.v); setPlayer1FamilyId(''); }}
                    style={{
                      flex: 1, padding: '10px 16px', cursor: 'pointer',
                      border: `2px solid ${whoPlays === o.v ? 'var(--black)' : 'var(--grey-200)'}`,
                      background: whoPlays === o.v ? 'var(--black)' : '#fff',
                      color: whoPlays === o.v ? '#fff' : 'var(--black)',
                      fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              {whoPlays === 'family' && (
                <div style={{ marginTop: 14 }}>
                  {familyMembers.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
                      No tienes familiares registrados. Añádelos en tu perfil → Familia.
                    </div>
                  ) : (
                    <>
                      <label style={label}>Familiar que juega</label>
                      <select
                        value={player1FamilyId}
                        onChange={e => setPlayer1FamilyId(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Elige un familiar…</option>
                        {familyMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} — {RELATION_LABELS[m.relationType]} ({m.id})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Player 1 — the guardian, or the selected family member */}
          <div style={card}>
            <span style={label}>{player1Member ? 'Jugador 1 — Familiar' : 'Jugador 1 — Tú'}</span>
            <div style={{
              padding: '12px 14px', background: 'var(--grey-50, #fafafa)',
              border: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--black)',
                color: 'var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {(player1Member ? player1Member.fullName : user.name).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>{player1Member ? player1Member.fullName : user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                  {player1Member ? `${RELATION_LABELS[player1Member.relationType]} · ${player1Member.id}` : user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Partner selection */}
          <div style={card}>
            <span style={label}>Jugador 2 — Compañero/a</span>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 16 }}>
              {((acceptsFamily ? ['friends', 'invite', 'family'] : ['friends', 'invite']) as PartnerTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setPartnerTab(tab); setSelectedFriend(null); setSelectedFamilyPartner(null); }}
                  style={{
                    padding: '8px 18px', border: 'none', cursor: 'pointer',
                    background: 'transparent',
                    borderBottom: partnerTab === tab ? '2px solid var(--black)' : '2px solid transparent',
                    fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: partnerTab === tab ? 'var(--black)' : 'var(--grey-400)',
                    marginBottom: -1,
                  }}
                >
                  {tab === 'friends' ? '👥 Mis Amistades' : tab === 'invite' ? '✉️ Invitar' : '👨‍👩‍👧 Familiar'}
                </button>
              ))}
            </div>

            {partnerTab === 'friends' && (
              <div>
                <input
                  placeholder="Buscar por nombre o email…"
                  value={friendSearch}
                  onChange={e => { setFriendSearch(e.target.value); setSelectedFriend(null); }}
                  style={{ ...inputStyle, marginBottom: 12 }}
                />
                {selectedFriend && (
                  <div style={{
                    padding: '10px 14px', background: 'rgba(214,255,0,0.10)',
                    border: '2px solid var(--black)', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>{selectedFriend.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{selectedFriend.email}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedFriend(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-400)' }}>✕</button>
                  </div>
                )}
                {!selectedFriend && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {filteredFriends.length === 0 && searchResults.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--grey-400)', textAlign: 'center', padding: '20px 0' }}>
                        {friends.length === 0
                          ? 'No tienes amistades registradas. Usa "Invitar" para invitar por email.'
                          : 'No se encontraron amistades. Busca en la app o usa "Invitar".'}
                      </div>
                    )}
                    {filteredFriends.map(f => (
                      <PlayerRow key={f.id} player={f} onSelect={setSelectedFriend} />
                    ))}
                    {searchResults.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', padding: '6px 0 2px' }}>
                          Otros jugadores
                        </div>
                        {searchResults.map(f => (
                          <PlayerRow key={f.id} player={f} onSelect={setSelectedFriend} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {partnerTab === 'invite' && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 14, lineHeight: 1.5 }}>
                  Tu lugar queda reservado. Tu compañero/a recibirá un correo y deberá aceptar la invitación desde su Dashboard.
                </div>
                <label style={label}>Nombre del compañero/a *</label>
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Nombre completo"
                  required={partnerTab === 'invite'}
                  style={inputStyle}
                />
                <label style={label}>Email *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required={partnerTab === 'invite'}
                  style={inputStyle}
                />
              </div>
            )}

            {partnerTab === 'family' && (
              <div>
                {familyMembers.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--grey-400)', textAlign: 'center', padding: '20px 0' }}>
                    No tienes familiares registrados. Añádelos en tu perfil → Familia.
                  </div>
                ) : (
                  <>
                    <label style={label}>Familiar como compañero/a</label>
                    <select
                      value={selectedFamilyPartner?.id ?? ''}
                      onChange={e => setSelectedFamilyPartner(familyMembers.find(m => m.id === e.target.value) ?? null)}
                      style={inputStyle}
                    >
                      <option value="">Elige un familiar…</option>
                      {familyMembers.map(m => (
                        <option key={m.id} value={m.id} disabled={player1Member?.id === m.id}>
                          {m.fullName} — {RELATION_LABELS[m.relationType]} ({m.id})
                        </option>
                      ))}
                    </select>
                    {selectedFamilyPartner && player1Member?.id === selectedFamilyPartner.id && (
                      <div style={{ fontSize: 12, color: '#b91c1c' }}>
                        No puedes elegir al mismo familiar como jugador 1 y jugador 2.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>
              {error}
            </div>
          )}

          {ageError && !error && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#92400e', marginBottom: 14, lineHeight: 1.5 }}>
              {ageError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !canSubmit()}
            style={{ ...primaryBtn, opacity: (submitting || !canSubmit()) ? 0.5 : 1, cursor: (submitting || !canSubmit()) ? 'not-allowed' : 'pointer' }}
          >
            {submitting
              ? 'Inscribiendo…'
              : partnerTab === 'invite' && !selectedFriend
              ? 'Inscribirme y enviar invitación'
              : 'Inscribirme'}
          </button>
        </form>
      )}
    </div></div>
  );
}

function PlayerRow({ player, onSelect }: { player: RegisteredPlayer; onSelect: (p: RegisteredPlayer) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-50, #fafafa)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-100)',
        color: 'var(--grey-500)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {player.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{player.name}</div>
        <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{player.email}</div>
      </div>
    </button>
  );
}
