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
import { getFriendsForPlayer, searchPlayers, type RegisteredPlayer } from '@/lib/player-store';
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

type PartnerTab = 'friends' | 'invite';
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
  }, [user]);

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

  function canSubmit(): boolean {
    if (!selectedCat || !user) return false;
    if (partnerTab === 'friends') return selectedFriend !== null;
    return inviteName.trim().length > 0 && inviteEmail.trim().length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !selectedCat || !user) return;
    setError(null);
    setSubmitting(true);

    const isInvite = partnerTab === 'invite' && !selectedFriend;
    const p2Id    = selectedFriend?.id;
    const p2Name  = selectedFriend?.name ?? (isInvite ? inviteName.trim() : undefined);
    const p2Email = selectedFriend?.email ?? (isInvite ? inviteEmail.trim() : undefined);

    const res = await registerTeam(code, {
      categoryId: selectedCat.id,
      player1Name: user.name,
      player1Email: user.email,
      player1Id: user.id,
      player2Name: p2Name,
      player2Email: p2Email,
      player2Id: p2Id,
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
      p1Name: user.name,
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
        <form onSubmit={handleSubmit}>
          {/* Player 1 — auto-filled from session */}
          <div style={card}>
            <span style={label}>Jugador 1 — Tú</span>
            <div style={{
              padding: '12px 14px', background: 'var(--grey-50, #fafafa)',
              border: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--black)',
                color: 'var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{user.email}</div>
              </div>
            </div>
          </div>

          {/* Partner selection */}
          <div style={card}>
            <span style={label}>Jugador 2 — Compañero/a</span>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 16 }}>
              {(['friends', 'invite'] as PartnerTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setPartnerTab(tab); setSelectedFriend(null); }}
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
                  {tab === 'friends' ? '👥 Mis Amistades' : '✉️ Invitar'}
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
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>
              {error}
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
