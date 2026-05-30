'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAllPlayers, getFriendsForPlayer, removeFriendship,
  searchPlayers, getPlayerCountries, type RegisteredPlayer,
} from '@/lib/player-store';
import {
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest,
  getPendingRequestsFor, getSentRequests, getRequestBetween,
  type FriendRequest,
} from '@/lib/friend-request-store';

type CurrentUser = { id: string; name: string };
type Tab = 'friends' | 'requests' | 'search' | 'sent';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#1e3a8a', '#7c3aed', '#065f46', '#9a3412', '#1e40af', '#6b21a8'];
function avatarBg(id: string) {
  return AVATAR_COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ player, size = 48 }: { player: RegisteredPlayer; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarBg(player.id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.35, fontWeight: 600, color: '#fff',
    }}>
      {initials(player.name)}
    </div>
  );
}

function PlayerMeta({ p }: { p: RegisteredPlayer }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>
      {[p.level ? LEVEL_LABEL[p.level] : null, p.city, p.country].filter(Boolean).join(' · ')}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerFriendsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tab, setTab]   = useState<Tab>('friends');
  const [friends,       setFriends]       = useState<RegisteredPlayer[]>([]);
  const [incoming,      setIncoming]      = useState<FriendRequest[]>([]);
  const [sent,          setSent]          = useState<FriendRequest[]>([]);
  const [friendSearch,  setFriendSearch]  = useState('');
  const [searchQ,       setSearchQ]       = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [searchResults, setSearchResults] = useState<RegisteredPlayer[]>([]);
  const [countries,     setCountries]     = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<RegisteredPlayer | null>(null);
  const [reqVersion,    setReqVersion]    = useState(0);

  const refresh = useCallback((userId: string) => {
    setFriends(getFriendsForPlayer(userId));
    setIncoming(getPendingRequestsFor(userId));
    setSent(getSentRequests(userId).filter(r => r.status === 'pending'));
    setReqVersion(v => v + 1);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (!raw) return;
      const u = JSON.parse(raw) as CurrentUser;
      setCurrentUser(u);
      setCountries(getPlayerCountries());
      refresh(u.id);
    } catch {}
  }, [refresh]);

  // Live search
  useEffect(() => {
    if (!currentUser) return;
    const friendIds = new Set(friends.map(f => f.id));
    if (!searchQ.trim() && !searchCountry) {
      // Suggestions: players not already friends, not self
      const suggestions = getAllPlayers()
        .filter(p => p.id !== currentUser.id && !friendIds.has(p.id))
        .slice(0, 8);
      setSearchResults(suggestions);
      return;
    }
    const results = searchPlayers(searchQ, searchCountry ? { country: searchCountry } : undefined)
      .filter(p => p.id !== currentUser.id && !friendIds.has(p.id));
    setSearchResults(results);
  }, [searchQ, searchCountry, friends, currentUser, reqVersion]);

  function handleAccept(req: FriendRequest) {
    acceptFriendRequest(req.id);
    if (currentUser) refresh(currentUser.id);
  }

  function handleReject(req: FriendRequest) {
    rejectFriendRequest(req.id);
    if (currentUser) refresh(currentUser.id);
  }

  function handleCancel(req: FriendRequest) {
    cancelFriendRequest(req.id);
    if (currentUser) refresh(currentUser.id);
  }

  function handleAdd(player: RegisteredPlayer) {
    if (!currentUser) return;
    sendFriendRequest(currentUser.id, currentUser.name, player.id, player.name);
    if (currentUser) refresh(currentUser.id);
  }

  function handleConfirmDelete(player: RegisteredPlayer) {
    setConfirmDelete(player);
  }

  function handleDeleteConfirmed() {
    if (!currentUser || !confirmDelete) return;
    removeFriendship(currentUser.id, confirmDelete.id);
    setConfirmDelete(null);
    refresh(currentUser.id);
  }

  const filteredFriends = friendSearch.trim()
    ? friends.filter(f =>
        f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.shortId.toLowerCase().includes(friendSearch.toLowerCase()) ||
        (f.city ?? '').toLowerCase().includes(friendSearch.toLowerCase())
      )
    : friends;

  const pendingCount = incoming.length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'friends',  label: `Mis amigos (${friends.length})` },
    { id: 'requests', label: 'Solicitudes', count: pendingCount },
    { id: 'search',   label: 'Buscar jugadores' },
    { id: 'sent',     label: `Enviadas (${sent.length})` },
  ];

  return (
    <div className="dash-page" style={{ padding: '40px 40px 80px' }}>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '40px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Eliminar amistad</div>
            <div style={{ fontSize: 14, color: 'var(--grey-500)', marginBottom: 28, lineHeight: 1.6 }}>
              ¿Seguro que querés eliminar a <strong>{confirmDelete.name}</strong> de tu lista de amigos? Se eliminará de ambos lados.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDeleteConfirmed}
                style={{ flex: 1, padding: '12px', background: '#ee0005', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Eliminar
              </button>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Red de jugadores</div>
        <h1 className="dash-h1" style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>AMISTADES</h1>
      </div>

      {/* Stats */}
      <div className="friends-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Amigos',      value: friends.length },
          { label: 'Solicitudes', value: pendingCount },
          { label: 'Enviadas',    value: sent.length },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.label === 'Solicitudes' && s.value > 0 ? '#ee0005' : 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pill-tab${tab === t.id ? ' active' : ''}`}
            style={{ position: 'relative' }}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Mis amigos ── */}
      {tab === 'friends' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)}
              placeholder="Filtrar por nombre, ID o ciudad..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          </div>
          {filteredFriends.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              {friendSearch ? 'Sin resultados.' : 'Todavía no tenés amigos. Usá "Buscar jugadores" para agregar.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {filteredFriends.map(f => (
                <div key={f.id} className="friends-list-item" style={{ background: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar player={f} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
                      <span className="chip" style={{ fontSize: 10 }}>{f.shortId}</span>
                      {f.sex && <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{f.sex === 'M' ? '♂' : '♀'}</span>}
                    </div>
                    <PlayerMeta p={f} />
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 16 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{f.rankingPoints.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pts</div>
                  </div>
                  <button onClick={() => handleConfirmDelete(f)}
                    style={{ padding: '7px 14px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Solicitudes recibidas ── */}
      {tab === 'requests' && (
        <>
          {incoming.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No tenés solicitudes pendientes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {incoming.map(req => {
                const sender = getAllPlayers().find(p => p.id === req.fromId);
                return (
                  <div key={req.id} style={{ background: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    {sender ? <Avatar player={sender} /> : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--grey-100)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{req.fromName}</div>
                      {sender && <PlayerMeta p={sender} />}
                      <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 4 }}>
                        {new Date(req.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleAccept(req)}
                        className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Aceptar</button>
                      <button onClick={() => handleReject(req)}
                        className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Rechazar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Buscar jugadores ── */}
      {tab === 'search' && (
        <>
          <div className="friends-search-row" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar por nombre, ID (#00104) o email..."
              style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' }} />
            <select value={searchCountry} onChange={e => setSearchCountry(e.target.value)}
              style={{ padding: '10px 32px 10px 12px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff', outline: 'none', minWidth: 160,
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}>
              <option value="">Todos los países</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 12 }}>
            {searchQ.trim() || searchCountry ? `Resultados (${searchResults.length})` : 'Sugerencias para vos'}
          </div>

          {searchResults.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No se encontraron jugadores.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {searchResults.map(p => {
                if (!currentUser) return null;
                const existingReq = getRequestBetween(currentUser.id, p.id);
                const isFriend = friends.some(f => f.id === p.id);
                let actionEl: React.ReactNode;
                if (isFriend) {
                  actionEl = <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--turf-green)' }}>✓ Amigo</span>;
                } else if (existingReq?.fromId === currentUser.id && existingReq?.status === 'pending') {
                  actionEl = (
                    <button onClick={() => { cancelFriendRequest(existingReq.id); refresh(currentUser.id); }}
                      style={{ padding: '7px 14px', border: '1px solid var(--grey-200)', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)' }}>
                      Cancelar solicitud
                    </button>
                  );
                } else if (existingReq?.toId === currentUser.id && existingReq?.status === 'pending') {
                  actionEl = <span style={{ fontSize: 12, fontWeight: 700, color: '#f5a623' }}>⏳ Te envió solicitud</span>;
                } else {
                  actionEl = (
                    <button onClick={() => handleAdd(p)}
                      className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
                      + Agregar
                    </button>
                  );
                }
                return (
                  <div key={p.id} style={{ background: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar player={p} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                        <span className="chip" style={{ fontSize: 10 }}>{p.shortId}</span>
                        {p.sex && <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.sex === 'M' ? '♂' : '♀'}</span>}
                      </div>
                      <PlayerMeta p={p} />
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 16 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{p.rankingPoints.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pts</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>{actionEl}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Solicitudes enviadas ── */}
      {tab === 'sent' && (
        <>
          {sent.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No tenés solicitudes enviadas pendientes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {sent.map(req => {
                const target = getAllPlayers().find(p => p.id === req.toId);
                return (
                  <div key={req.id} style={{ background: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    {target ? <Avatar player={target} /> : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--grey-100)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{req.toName}</div>
                      {target && <PlayerMeta p={target} />}
                      <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 4 }}>
                        Enviada el {new Date(req.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} · Pendiente
                      </div>
                    </div>
                    <button onClick={() => handleCancel(req)}
                      style={{ padding: '7px 14px', border: '1px solid var(--grey-200)', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)', flexShrink: 0 }}>
                      Cancelar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
