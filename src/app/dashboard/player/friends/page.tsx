'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSAPlayersFromSupabase } from '@/lib/superadmin-data';
import {
  fetchFriendData, sendFriendRequestSB, acceptFriendRequestSB,
  rejectFriendRequestSB, cancelFriendRequestSB, removeFriendSB,
  type FriendRequest, type FriendSummary,
} from '@/lib/friend-request-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getLevelInfo } from '@/lib/level-config';

type Tab = 'friends' | 'requests' | 'search' | 'sent';

// Lightweight player shape used across this page (from Supabase).
interface UIPlayer {
  id: string; shortId: string; name: string;
  sex?: 'M' | 'F'; city?: string; country?: string;
  level?: string; rankingPoints: number;
}

function toUIPlayer(p: {
  id: string; shortId: string; name: string; sex?: 'M' | 'F';
  city?: string; country?: string; level?: string; rankingPoints?: number;
}): UIPlayer {
  return {
    id: p.id, shortId: p.shortId, name: p.name, sex: p.sex,
    city: p.city, country: p.country, level: p.level, rankingPoints: p.rankingPoints ?? 0,
  };
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#1e3a8a', '#7c3aed', '#065f46', '#9a3412', '#1e40af', '#6b21a8'];
function avatarBg(id: string) {
  return AVATAR_COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}

function Avatar({ player, size = 48 }: { player: UIPlayer; size?: number }) {
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

function PlayerMeta({ p }: { p: UIPlayer }) {
  const lvl = p.level ? getLevelInfo(p.level as Parameters<typeof getLevelInfo>[0]) : null;
  return (
    <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>
      {[lvl ? `${lvl.level} ${lvl.group}` : null, p.city, p.country].filter(Boolean).join(' · ')}
    </div>
  );
}

export default function PlayerFriendsPage() {
  const { user: currentUser } = useCurrentUser();
  const [tab, setTab]   = useState<Tab>('friends');
  const [allPlayers,    setAllPlayers]    = useState<UIPlayer[]>([]);
  const [friends,       setFriends]       = useState<FriendSummary[]>([]);
  const [incoming,      setIncoming]      = useState<FriendRequest[]>([]);
  const [sent,          setSent]          = useState<FriendRequest[]>([]);
  const [friendSearch,  setFriendSearch]  = useState('');
  const [searchQ,       setSearchQ]       = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<FriendSummary | null>(null);

  const playerById = useCallback(
    (id: string): UIPlayer | undefined => allPlayers.find(p => p.id === id),
    [allPlayers],
  );

  const refresh = useCallback(async () => {
    const data = await fetchFriendData();
    if (data) {
      setIncoming(data.incoming);
      setSent(data.sent.filter(r => r.status === 'pending'));
      setFriends(data.friends);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    getSAPlayersFromSupabase().then(sb => {
      if (sb) setAllPlayers(sb.filter(p => p.status !== 'blocked').map(toUIPlayer));
    });
    refresh();
  }, [currentUser, refresh]);

  const friendIds = new Set(friends.map(f => f.playerId));
  const countries = [...new Set(allPlayers.map(p => p.country).filter(Boolean) as string[])].sort();

  // Search / suggestions among real Supabase players (excluding self + friends).
  const searchResults: UIPlayer[] = (() => {
    if (!currentUser) return [];
    const base = allPlayers.filter(p => p.id !== currentUser.id && !friendIds.has(p.id));
    if (!searchQ.trim() && !searchCountry) return base.slice(0, 12);
    const q = searchQ.trim().toLowerCase();
    return base.filter(p => {
      const matchQ = !q
        || p.name.toLowerCase().includes(q)
        || p.shortId.toLowerCase().includes(q)
        || p.shortId.replace('#', '').includes(q);
      const matchC = !searchCountry || p.country === searchCountry;
      return matchQ && matchC;
    });
  })();

  async function handleAccept(req: FriendRequest) { await acceptFriendRequestSB(req.id); refresh(); }
  async function handleReject(req: FriendRequest) { await rejectFriendRequestSB(req.id); refresh(); }
  async function handleCancel(req: FriendRequest) { await cancelFriendRequestSB(req.id); refresh(); }
  async function handleAdd(player: UIPlayer) {
    if (!currentUser) return;
    await sendFriendRequestSB(currentUser.id, currentUser.name, player.id, player.name);
    refresh();
  }
  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    await removeFriendSB(confirmDelete.requestId);
    setConfirmDelete(null);
    refresh();
  }

  const filteredFriends = friendSearch.trim()
    ? friends.filter(f => {
        const p = playerById(f.playerId);
        const q = friendSearch.toLowerCase();
        return f.playerName.toLowerCase().includes(q)
          || (p?.shortId ?? '').toLowerCase().includes(q)
          || (p?.city ?? '').toLowerCase().includes(q);
      })
    : friends;

  const pendingCount = incoming.length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'friends',  label: `Mis amigos (${friends.length})` },
    { id: 'requests', label: 'Solicitudes', count: pendingCount },
    { id: 'search',   label: 'Buscar jugadores' },
    { id: 'sent',     label: `Enviadas (${sent.length})` },
  ];

  // Resolve a FriendSummary to a full UIPlayer card (fallback to name only).
  function summaryToPlayer(f: FriendSummary): UIPlayer {
    return playerById(f.playerId) ?? { id: f.playerId, shortId: '', name: f.playerName, rankingPoints: 0 };
  }

  return (
    <div className="dash-page" style={{ padding: '40px 40px 80px' }}>
      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '40px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Eliminar amistad</div>
            <div style={{ fontSize: 14, color: 'var(--grey-500)', marginBottom: 28, lineHeight: 1.6 }}>
              ¿Seguro que querés eliminar a <strong>{confirmDelete.playerName}</strong> de tu lista de amigos? Se eliminará de ambos lados.
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
              {filteredFriends.map(f => {
                const p = summaryToPlayer(f);
                return (
                  <div key={f.requestId} className="friends-list-item" style={{ background: '#fff', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar player={p} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                        {p.shortId && <span className="chip" style={{ fontSize: 10 }}>{p.shortId}</span>}
                        {p.sex && <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.sex === 'M' ? '♂' : '♀'}</span>}
                      </div>
                      <PlayerMeta p={p} />
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 16 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{p.rankingPoints.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pts</div>
                    </div>
                    <button onClick={() => setConfirmDelete(f)}
                      style={{ padding: '7px 14px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                      Eliminar
                    </button>
                  </div>
                );
              })}
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
                const sender = playerById(req.fromId);
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
              placeholder="Buscar por nombre o ID (#00104)..."
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
                const sentReq = sent.find(r => r.toId === p.id && r.status === 'pending');
                const incomingReq = incoming.find(r => r.fromId === p.id);
                let actionEl: React.ReactNode;
                if (sentReq) {
                  actionEl = (
                    <button onClick={() => handleCancel(sentReq)}
                      style={{ padding: '7px 14px', border: '1px solid var(--grey-200)', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)' }}>
                      Cancelar solicitud
                    </button>
                  );
                } else if (incomingReq) {
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
                        {p.shortId && <span className="chip" style={{ fontSize: 10 }}>{p.shortId}</span>}
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
                const target = playerById(req.toId);
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
