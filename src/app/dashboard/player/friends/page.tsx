'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAllPlayers,
  getFriendsForPlayer,
  addFriendship,
  searchPlayers,
  type RegisteredPlayer,
} from '@/lib/player-store';

type CurrentUser = { id: string; name: string };

// ── Friend-request store (localStorage) ────────────────────────────────────
const REQ_KEY = 'padelmgt_friend_requests';

type FriendRequest = { fromId: string; toId: string; status: 'pending' | 'rejected' };

function loadRequests(): FriendRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(REQ_KEY) ?? '[]');
  } catch { return []; }
}

function saveRequests(reqs: FriendRequest[]) {
  localStorage.setItem(REQ_KEY, JSON.stringify(reqs));
}

// Seed some incoming requests for player-001 if none exist yet
function seedRequestsIfNeeded(userId: string) {
  const existing = loadRequests();
  const hasSeeded = existing.some(r => r.toId === userId);
  if (hasSeeded) return;
  if (userId !== 'player-001') return;
  saveRequests([
    { fromId: 'player-009', toId: 'player-001', status: 'pending' },
    { fromId: 'player-010', toId: 'player-001', status: 'pending' },
  ]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#1e3a8a', '#7c3aed', '#065f46', '#9a3412', '#1e40af', '#6b21a8'];
function avatarColor(id: string) {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function PlayerFriendsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [friends, setFriends] = useState<RegisteredPlayer[]>([]);
  const [requests, setRequests] = useState<RegisteredPlayer[]>([]);
  const [rejected, setRejected] = useState<RegisteredPlayer[]>([]);
  const [tab, setTab] = useState<'friends' | 'requests' | 'search' | 'rejected'>('friends');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<RegisteredPlayer[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (!raw) return;
      const u = JSON.parse(raw) as CurrentUser;
      setCurrentUser(u);
      seedRequestsIfNeeded(u.id);
      refresh(u.id);
    } catch {}
  }, []);

  function refresh(userId: string) {
    const reqs = loadRequests();
    const allPlayers = getAllPlayers();

    const pendingFromOthers = reqs
      .filter(r => r.toId === userId && r.status === 'pending')
      .map(r => allPlayers.find(p => p.id === r.fromId))
      .filter(Boolean) as RegisteredPlayer[];

    const rejectedFromOthers = reqs
      .filter(r => r.toId === userId && r.status === 'rejected')
      .map(r => allPlayers.find(p => p.id === r.fromId))
      .filter(Boolean) as RegisteredPlayer[];

    setFriends(getFriendsForPlayer(userId));
    setRequests(pendingFromOthers);
    setRejected(rejectedFromOthers);
  }

  function handleAccept(person: RegisteredPlayer) {
    if (!currentUser) return;
    addFriendship(currentUser.id, person.id);
    const reqs = loadRequests().map(r =>
      r.fromId === person.id && r.toId === currentUser.id
        ? { ...r, status: 'pending' as const } // keep but we re-filter below
        : r
    ).filter(r => !(r.fromId === person.id && r.toId === currentUser.id));
    saveRequests(reqs);
    refresh(currentUser.id);
  }

  function handleReject(person: RegisteredPlayer) {
    if (!currentUser) return;
    const reqs = loadRequests().map(r =>
      r.fromId === person.id && r.toId === currentUser.id
        ? { ...r, status: 'rejected' as const }
        : r
    );
    saveRequests(reqs);
    refresh(currentUser.id);
  }

  function handleAcceptRejected(person: RegisteredPlayer) {
    if (!currentUser) return;
    addFriendship(currentUser.id, person.id);
    const reqs = loadRequests().filter(
      r => !(r.fromId === person.id && r.toId === currentUser.id)
    );
    saveRequests(reqs);
    refresh(currentUser.id);
  }

  function handleSendRequest(person: RegisteredPlayer) {
    if (!currentUser) return;
    // For demo: immediately add as friend (no approval flow from the other side)
    addFriendship(currentUser.id, person.id);
    setSentRequests(prev => new Set([...prev, person.id]));
    refresh(currentUser.id);
  }

  useEffect(() => {
    if (!currentUser) return;
    if (searchQ.trim().length < 2) { setSearchResults([]); return; }
    const friendIds = new Set(friends.map(f => f.id));
    const results = searchPlayers(searchQ).filter(
      p => p.id !== currentUser.id && !friendIds.has(p.id)
    );
    setSearchResults(results);
  }, [searchQ, friends, currentUser]);

  // Suggestions: registered players not already friends, excluding self
  const suggestions = currentUser
    ? getAllPlayers()
        .filter(p => p.id !== currentUser.id && !friends.some(f => f.id === p.id) && !requests.some(r => r.id === p.id))
        .slice(0, 6)
    : [];

  const displayFriends = searchQ && tab === 'friends'
    ? friends.filter(f => f.name.toLowerCase().includes(searchQ.toLowerCase()) || (f.city ?? '').toLowerCase().includes(searchQ.toLowerCase()))
    : friends;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Red de jugadores</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>AMISTADES</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Amigos',      value: friends.length },
          { label: 'Solicitudes', value: requests.length },
          { label: 'Sugerencias', value: suggestions.length },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('friends')} className={`pill-tab${tab === 'friends' ? ' active' : ''}`}>
            Mis amigos ({friends.length})
          </button>
          <button onClick={() => setTab('requests')} className={`pill-tab${tab === 'requests' ? ' active' : ''}`}>
            Solicitudes ({requests.length})
          </button>
          <button onClick={() => setTab('search')} className={`pill-tab${tab === 'search' ? ' active' : ''}`}>
            Buscar jugadores
          </button>
          {rejected.length > 0 && (
            <button onClick={() => setTab('rejected')} className={`pill-tab${tab === 'rejected' ? ' active' : ''}`}>
              Rechazados ({rejected.length})
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--grey-200)', padding: '10px 16px', minWidth: 240 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder={tab === 'search' ? 'Buscar por nombre o ID...' : 'Filtrar amigos...'}
            style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 13, outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* ── Mis amigos ── */}
      {tab === 'friends' && (
        <>
          {displayFriends.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              {searchQ ? 'Sin resultados para esa búsqueda.' : 'Todavía no tenés amigos. ¡Buscá jugadores para agregar!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {displayFriends.map(f => (
                <div key={f.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, background: avatarColor(f.id), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                    {initials(f.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
                      <span className="chip" style={{ fontSize: 10 }}>#{f.ranking}</span>
                      {f.city && <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>{f.city}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                      {f.level} · {f.country ?? ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{f.rankingPoints.toLocaleString()}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600 }}>puntos</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Solicitudes ── */}
      {tab === 'requests' && (
        <>
          {requests.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No tenés solicitudes pendientes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {requests.map(r => (
                <div key={r.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
                    {initials(r.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>#{r.ranking} · {r.city ?? ''} · {r.level}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }} onClick={() => handleAccept(r)}>Aceptar</button>
                    <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }} onClick={() => handleReject(r)}>Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Buscar jugadores ── */}
      {tab === 'search' && (
        <div>
          {searchQ.trim().length >= 2 ? (
            <>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>
                Resultados ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
                  No se encontraron jugadores con ese nombre o ID.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {searchResults.map(p => (
                    <PlayerSearchRow key={p.id} player={p} sent={sentRequests.has(p.id)} onAdd={handleSendRequest} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>
                Sugerencias para vos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                {suggestions.map(p => (
                  <PlayerSearchRow key={p.id} player={p} sent={sentRequests.has(p.id)} onAdd={handleSendRequest} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Rechazados ── */}
      {tab === 'rejected' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
          {rejected.map(r => (
            <div key={r.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 48, height: 48, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
                {initials(r.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>#{r.ranking} · {r.city ?? ''}</div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }} onClick={() => handleAcceptRejected(r)}>Aceptar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerSearchRow({ player, sent, onAdd }: { player: RegisteredPlayer; sent: boolean; onAdd: (p: RegisteredPlayer) => void }) {
  return (
    <div style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ width: 48, height: 48, background: 'var(--grey-50)', border: '2px solid var(--grey-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
        {player.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{player.name}</div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>#{player.ranking} · {player.city ?? ''} · {player.level}</div>
      </div>
      <div style={{ textAlign: 'right', marginRight: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{player.rankingPoints.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>puntos</div>
      </div>
      {sent ? (
        <span style={{ fontSize: 12, color: 'var(--turf-green)', fontWeight: 700 }}>✓ Agregado</span>
      ) : (
        <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }} onClick={() => onAdd(player)}>
          Agregar
        </button>
      )}
    </div>
  );
}
