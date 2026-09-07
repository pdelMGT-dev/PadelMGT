'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSAPlayers } from '@/lib/superadmin-data';
import { getSAClubs } from '@/lib/superadmin-data';
import type { SAPlayer, SAClub } from '@/lib/superadmin-data';
import { joinClub, leaveClub } from '@/lib/club-membership-store';
import type { ClubMembership } from '@/lib/club-membership-store';
import { addFriendship, removeFriendship } from '@/lib/player-store';
import { getSAFriendshipsFromSupabase, addSAFriendship, removeSAFriendship, addSAClubMembership, removeSAClubMembership } from '@/lib/superadmin-data';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'club' | 'friends' | 'family';
type AddMode = 'text' | 'csv' | 'table';

interface FamilyMemberRow {
  id: string;
  ownerId: string;
  ownerName: string;
  fullName: string;
  relationType: string;
  birthDate: string;
  invitationStatus: string;
}
interface FamilyLinkRow {
  id: string;
  fromName: string;
  toEmail: string;
  relation: string;
  status: string;
}

interface FriendshipRow {
  key: string;
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  since?: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280',
  background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};
const btn = (variant: 'primary' | 'danger' | 'ghost' = 'ghost'): React.CSSProperties => ({
  padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: variant === 'ghost' ? '1px solid #e5e7eb' : 'none',
  background: variant === 'primary' ? '#111' : variant === 'danger' ? '#dc2626' : '#fff',
  color: variant === 'ghost' ? '#374151' : '#fff',
  letterSpacing: '0.05em',
});
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const sel: React.CSSProperties = { ...inp, background: '#fff', cursor: 'pointer' };
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#6b7280', marginBottom: 6,
};
const card: React.CSSProperties = {
  border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden',
};

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map(s => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

// ── Searchable player picker (replaces giant native <select> lists) ────────────

function PlayerCombobox({
  players, value, onChange, placeholder = 'Buscar por nombre, email o ID…', excludeIds,
}: {
  players: SAPlayer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeIds?: Set<string>;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = players.find(p => p.id === value) ?? null;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter(p => !excludeIds?.has(p.id))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.shortId?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [players, query, excludeIds]);

  if (selected && !open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #d1d5db', padding: '8px 12px', background: '#f9fafb' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{selected.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{selected.email}</div>
        </div>
        <button onClick={() => { onChange(''); setQuery(''); setOpen(true); }} style={{ ...btn('ghost'), padding: '5px 12px', fontSize: 11, flexShrink: 0 }}>
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={inp}
      />
      {open && (query.trim() ? results.length > 0 : true) && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, maxHeight: 260, overflowY: 'auto', background: '#fff', border: '1px solid #d1d5db', borderTop: 'none', boxShadow: '0 6px 16px rgba(0,0,0,0.10)' }}>
          {results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>Sin resultados</div>
          ) : results.map(p => (
            <div
              key={p.id}
              onMouseDown={e => { e.preventDefault(); onChange(p.id); setQuery(''); setOpen(false); }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.email} · {p.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RelationsPage() {
  const [tab, setTab] = useState<Tab>('club');
  const [players, setPlayers] = useState<SAPlayer[]>([]);
  const [clubs, setClubs] = useState<SAClub[]>([]);

  // Club-Player state
  const [clubMemberships, setClubMemberships] = useState<ClubMembership[]>([]);
  const [clubSelected, setClubSelected] = useState<Set<string>>(new Set());
  const [clubFilterClub, setClubFilterClub] = useState('');
  const [clubFilterPlayer, setClubFilterPlayer] = useState('');

  // Friendship state
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [friendSelected, setFriendSelected] = useState<Set<string>>(new Set());
  const [friendFilterA, setFriendFilterA] = useState('');

  // Family state (read-only listing of family members + links)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>([]);
  const [familyLinks, setFamilyLinks] = useState<FamilyLinkRow[]>([]);
  const [familyFilter, setFamilyFilter] = useState('');
  const [familyView, setFamilyView] = useState<'members' | 'links'>('members');

  // Quick link panel (single pair — the common case)
  const [quickClubId, setQuickClubId] = useState('');
  const [quickPlayerId, setQuickPlayerId] = useState('');
  const [quickAId, setQuickAId] = useState('');
  const [quickBId, setQuickBId] = useState('');
  const [quickResult, setQuickResult] = useState<string | null>(null);

  // Bulk add panel
  const [showCreate, setShowCreate] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('text');
  const [addTarget, setAddTarget] = useState('');
  const [addTextInput, setAddTextInput] = useState('');
  const [addTableSearch, setAddTableSearch] = useState('');
  const [addTableSelected, setAddTableSelected] = useState<Set<string>>(new Set());
  const [addResult, setAddResult] = useState<{ created: number; skipped: number } | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const allPlayers = getSAPlayers();
    setPlayers(allPlayers);
    setClubs(getSAClubs().filter(c => c.status === 'active'));
    reloadAll(allPlayers);
  }, []);

  function reloadAll(allPlayers?: SAPlayer[]) {
    const ps = allPlayers ?? players;

    // Club memberships — local cache for instant paint, replaced by Supabase truth
    try {
      const raw = localStorage.getItem('padelmgt_club_memberships');
      setClubMemberships(raw ? JSON.parse(raw) as ClubMembership[] : []);
    } catch { setClubMemberships([]); }

    fetch('/api/sa/club-memberships', { credentials: 'include' })
      .then(res => res.ok ? res.json() as Promise<{ memberships: ClubMembership[] }> : null)
      .then(data => { if (data) setClubMemberships(data.memberships); })
      .catch(() => {});

    // Friendships — build pairs from the map
    try {
      const raw = localStorage.getItem('padelmgt_friendships') ?? '{}';
      const map = JSON.parse(raw) as Record<string, string[]>;
      const seen = new Set<string>();
      const rows: FriendshipRow[] = [];
      for (const [aId, friends] of Object.entries(map)) {
        for (const bId of friends) {
          const key = [aId, bId].sort().join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          const aName = ps.find(p => p.id === aId)?.name ?? aId;
          const bName = ps.find(p => p.id === bId)?.name ?? bId;
          rows.push({ key, playerAId: aId, playerAName: aName, playerBId: bId, playerBName: bName });
        }
      }
      setFriendships(rows);
    } catch { setFriendships([]); }

    // Cross-device truth from Supabase (overrides local cache once loaded)
    getSAFriendshipsFromSupabase().then(remote => {
      if (remote === null) return;
      const rows: FriendshipRow[] = remote.map(f => ({
        key: [f.aId, f.bId].sort().join('|'),
        playerAId: f.aId,
        playerAName: f.aName || ps.find(p => p.id === f.aId)?.name || f.aId,
        playerBId: f.bId,
        playerBName: f.bName || ps.find(p => p.id === f.bId)?.name || f.bId,
        since: f.since,
      }));
      setFriendships(rows);
    }).catch(() => {});

    // Family members + links — local cache for instant paint, replaced by
    // the SA-wide Supabase listing (the player-facing routes only return
    // the caller's own data, useless for this overview).
    try {
      const raw = localStorage.getItem('padelmgt_family_members') ?? '[]';
      const arr = JSON.parse(raw) as Array<Record<string, unknown>>;
      setFamilyMembers(arr.map(m => ({
        id: m.id as string,
        ownerId: m.ownerId as string,
        ownerName: ps.find(p => p.id === m.ownerId)?.name ?? (m.ownerId as string),
        fullName: m.fullName as string,
        relationType: m.relationType as string,
        birthDate: (m.birthDate as string) ?? '',
        invitationStatus: (m.invitationStatus as string) ?? 'none',
      })));
    } catch { setFamilyMembers([]); }

    try {
      const raw = localStorage.getItem('padelmgt_family_links') ?? '[]';
      const arr = JSON.parse(raw) as Array<Record<string, unknown>>;
      setFamilyLinks(arr.map(l => ({
        id: l.id as string,
        fromName: (l.fromPlayerName as string) ?? (l.fromPlayerId as string),
        toEmail: (l.toPlayerEmail as string) ?? '',
        relation: (l.relationFromTo as string) ?? '',
        status: (l.status as string) ?? 'pending',
      })));
    } catch { setFamilyLinks([]); }

    fetch('/api/sa/family', { credentials: 'include' })
      .then(res => res.ok ? res.json() as Promise<{
        members: Array<{ id: string; ownerId: string; fullName: string; relationType: string; birthDate: string; invitationStatus: string }>;
        links: Array<{ id: string; fromPlayerName: string; fromPlayerId: string; toPlayerEmail: string; relationFromTo: string; status: string }>;
      }> : null)
      .then(data => {
        if (!data) return;
        setFamilyMembers(data.members.map(m => ({
          id: m.id,
          ownerId: m.ownerId,
          ownerName: ps.find(p => p.id === m.ownerId)?.name ?? m.ownerId,
          fullName: m.fullName,
          relationType: m.relationType,
          birthDate: m.birthDate ?? '',
          invitationStatus: m.invitationStatus ?? 'none',
        })));
        setFamilyLinks(data.links.map(l => ({
          id: l.id,
          fromName: l.fromPlayerName ?? l.fromPlayerId,
          toEmail: l.toPlayerEmail ?? '',
          relation: l.relationFromTo ?? '',
          status: l.status ?? 'pending',
        })));
      })
      .catch(() => {});
  }

  // ── Bulk add logic ─────────────────────────────────────────────────────────

  function resolvePlayerIds(input: string): string[] {
    const tokens = parseCSV(input);
    return tokens.map(t => {
      const byId = players.find(p => p.id === t);
      if (byId) return byId.id;
      const byEmail = players.find(p => p.email.toLowerCase() === t.toLowerCase());
      return byEmail ? byEmail.id : null;
    }).filter(Boolean) as string[];
  }

  // Quick link: the common case, one pair at a time via searchable pickers.
  function handleQuickClubLink() {
    const club = clubs.find(c => c.id === quickClubId);
    const p = players.find(pl => pl.id === quickPlayerId);
    if (!club || !p) return;
    const existing = clubMemberships.some(m => m.playerId === quickPlayerId && m.clubId === quickClubId);
    if (existing) { setQuickResult(`${p.name} ya pertenece a ${club.name}.`); return; }
    joinClub(quickPlayerId, { id: club.id, name: club.name, city: club.city, country: club.country });
    addSAClubMembership(quickPlayerId, club.id, club.name, club.city, club.country).catch(err => {
      console.error('[relations] addSAClubMembership failed:', err);
      alert(`No se pudo sincronizar ${p.name} - ${club.name} con Supabase.`);
    });
    setQuickResult(`✓ ${p.name} unido a ${club.name}.`);
    setQuickClubId(''); setQuickPlayerId('');
    reloadAll();
  }

  function handleQuickFriend() {
    if (quickAId === quickBId) return;
    const a = players.find(p => p.id === quickAId);
    const b = players.find(p => p.id === quickBId);
    if (!a || !b) return;
    const already = friendships.some(f =>
      (f.playerAId === quickAId && f.playerBId === quickBId) ||
      (f.playerAId === quickBId && f.playerBId === quickAId)
    );
    if (already) { setQuickResult(`${a.name} y ${b.name} ya son amigos.`); return; }
    addFriendship(quickAId, quickBId);
    addSAFriendship(quickAId, a.name, quickBId, b.name).catch(err => {
      console.error('[relations] addSAFriendship failed:', err);
      alert(`No se pudo sincronizar ${a.name} - ${b.name} con Supabase.`);
    });
    setQuickResult(`✓ ${a.name} y ${b.name} ahora son amigos.`);
    setQuickAId(''); setQuickBId('');
    reloadAll();
  }

  function handleBulkAdd() {
    if (!addTarget) return;
    let ids: string[] = [];
    if (addMode === 'text') ids = resolvePlayerIds(addTextInput);
    else if (addMode === 'table') ids = [...addTableSelected];

    let created = 0;
    let skipped = 0;

    if (tab === 'club') {
      const club = clubs.find(c => c.id === addTarget);
      if (!club) return;
      for (const id of ids) {
        const p = players.find(pl => pl.id === id);
        if (!p) { skipped++; continue; }
        const existing = clubMemberships.some(m => m.playerId === id && m.clubId === club.id);
        if (existing) { skipped++; continue; }
        joinClub(id, { id: club.id, name: club.name, city: club.city, country: club.country });
        addSAClubMembership(id, club.id, club.name, club.city, club.country).catch(err => {
          console.error('[relations] addSAClubMembership failed:', err);
          alert(`No se pudo sincronizar ${p.name} - ${club.name} con Supabase.`);
        });
        created++;
      }
    } else if (tab === 'friends') {
      // addTarget is Jugador A; ids are the B side — one friendship per id.
      const aId = addTarget;
      const aName = players.find(p => p.id === aId)?.name ?? aId;
      if (ids.length === 0) { setAddResult({ created: 0, skipped: 0 }); return; }
      for (const bId of ids) {
        if (aId === bId) { skipped++; continue; }
        const already = friendships.some(f =>
          (f.playerAId === aId && f.playerBId === bId) ||
          (f.playerAId === bId && f.playerBId === aId)
        );
        if (already) { skipped++; continue; }
        const bName = players.find(p => p.id === bId)?.name ?? bId;
        addFriendship(aId, bId);
        addSAFriendship(aId, aName, bId, bName).catch(err => {
          console.error('[relations] addSAFriendship failed:', err);
          alert(`No se pudo sincronizar ${aName} - ${bName} con Supabase.`);
        });
        created++;
      }
    }

    setAddResult({ created, skipped });
    setAddTextInput('');
    setAddTableSelected(new Set());
    reloadAll();
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setAddTextInput(text);
      setAddMode('text');
    };
    reader.readAsText(file);
  }

  // ── Delete logic ───────────────────────────────────────────────────────────

  function handleDeleteSelected() {
    if (tab === 'club') {
      for (const key of clubSelected) {
        const [playerId, clubId] = key.split('|');
        leaveClub(playerId, clubId);
        removeSAClubMembership(playerId, clubId).catch(err => console.error('[relations] removeSAClubMembership failed:', err));
      }
      setClubSelected(new Set());
    } else if (tab === 'friends') {
      for (const key of friendSelected) {
        const [aId, bId] = key.split('|');
        removeFriendship(aId, bId);
        removeSAFriendship(aId, bId).catch(err => console.error('[relations] removeSAFriendship failed:', err));
      }
      setFriendSelected(new Set());
    }
    reloadAll();
  }

  function toggleRow(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  }

  function toggleAll(keys: string[], set: Set<string>, setter: (s: Set<string>) => void) {
    if (keys.every(k => set.has(k))) setter(new Set());
    else setter(new Set(keys));
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredClubMems = useMemo(() => {
    const q = clubFilterPlayer.toLowerCase();
    return clubMemberships.filter(m => {
      const matchClub = !clubFilterClub || m.clubId === clubFilterClub;
      const playerName = players.find(p => p.id === m.playerId)?.name ?? '';
      const matchPlayer = !q || m.playerId === clubFilterPlayer
        || m.clubName.toLowerCase().includes(q) || playerName.toLowerCase().includes(q);
      return matchClub && matchPlayer;
    });
  }, [clubMemberships, clubFilterClub, clubFilterPlayer, players]);

  const filteredFriendships = useMemo(() => {
    return friendships.filter(f => {
      if (!friendFilterA) return true;
      return f.playerAName.toLowerCase().includes(friendFilterA.toLowerCase()) ||
        f.playerBName.toLowerCase().includes(friendFilterA.toLowerCase());
    });
  }, [friendships, friendFilterA]);

  const tableFilteredPlayers = useMemo(() => {
    const q = addTableSearch.toLowerCase();
    return players
      .filter(p => tab !== 'friends' || p.id !== addTarget) // can't pair Jugador A with themselves
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.shortId?.toLowerCase().includes(q));
  }, [players, addTableSearch, tab, addTarget]);

  // ── Tab labels ─────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'club',       label: 'Club — Jugador',         count: clubMemberships.length },
    { key: 'friends',    label: 'Amistades',              count: friendships.length },
    { key: 'family',     label: 'Familia',                count: familyMembers.length + familyLinks.length },
  ];

  const filteredFamilyMembers = useMemo(() => {
    const q = familyFilter.toLowerCase();
    return familyMembers.filter(m => !q || m.fullName.toLowerCase().includes(q) || m.ownerName.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [familyMembers, familyFilter]);

  const filteredFamilyLinks = useMemo(() => {
    const q = familyFilter.toLowerCase();
    return familyLinks.filter(l => !q || l.fromName.toLowerCase().includes(q) || l.toEmail.toLowerCase().includes(q));
  }, [familyLinks, familyFilter]);

  // ── Active selection set and delete label ──────────────────────────────────

  const activeSelected =
    tab === 'club' ? clubSelected :
    friendSelected;

  const activeEntities = clubs.map(c => ({ id: c.id, name: c.name }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1300 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: 4 }}>
          Super Admin
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Relaciones</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>
          Gestión de relaciones entre entidades: membresías, amistades y vínculos masivos.
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 28 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key); setAddResult(null); setAddTarget(''); setAddTextInput(''); setAddTableSelected(new Set());
              setQuickClubId(''); setQuickPlayerId(''); setQuickAId(''); setQuickBId(''); setQuickResult(null);
            }}
            style={{
              padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#111' : '#6b7280',
              borderBottom: tab === t.key ? '2px solid #111' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {t.label}
            <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 10, background: tab === t.key ? '#111' : '#f3f4f6', color: tab === t.key ? '#fff' : '#6b7280', fontSize: 11, fontWeight: 600 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── QUICK LINK (the common case: one pair, fast) ────────────────────── */}
      {(tab === 'club' || tab === 'friends') && (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151', marginBottom: 16 }}>
            {tab === 'club' ? 'Vincular jugador a club' : 'Vincular dos jugadores'}
          </div>
          {tab === 'club' ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: 240 }}>
                <label style={lbl}>Club</label>
                <select value={quickClubId} onChange={e => { setQuickClubId(e.target.value); setQuickResult(null); }} style={sel}>
                  <option value="">— Seleccionar club —</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 260 }}>
                <label style={lbl}>Jugador</label>
                <PlayerCombobox players={players} value={quickPlayerId} onChange={id => { setQuickPlayerId(id); setQuickResult(null); }} />
              </div>
              <button
                onClick={handleQuickClubLink}
                disabled={!quickClubId || !quickPlayerId}
                style={{ ...btn('primary'), opacity: (!quickClubId || !quickPlayerId) ? 0.4 : 1, flexShrink: 0 }}
              >
                Unir a club
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                <label style={lbl}>Jugador A</label>
                <PlayerCombobox players={players} value={quickAId} onChange={id => { setQuickAId(id); setQuickResult(null); }} excludeIds={quickBId ? new Set([quickBId]) : undefined} />
              </div>
              <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                <label style={lbl}>Jugador B</label>
                <PlayerCombobox players={players} value={quickBId} onChange={id => { setQuickBId(id); setQuickResult(null); }} excludeIds={quickAId ? new Set([quickAId]) : undefined} />
              </div>
              <button
                onClick={handleQuickFriend}
                disabled={!quickAId || !quickBId}
                style={{ ...btn('primary'), opacity: (!quickAId || !quickBId) ? 0.4 : 1, flexShrink: 0 }}
              >
                Crear amistad
              </button>
            </div>
          )}
          {quickResult && (
            <div style={{ marginTop: 12, fontSize: 12, color: quickResult.startsWith('✓') ? '#059669' : '#b45309' }}>{quickResult}</div>
          )}
        </div>
      )}

      {/* ── BULK ADD PANEL (collapsible — the list below is the main view) ────── */}
      {tab !== 'family' && (
      <div style={{ ...card, borderColor: '#d1d5db' }}>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{
            width: '100%', padding: '16px 20px', background: '#f9fafb',
            borderBottom: showCreate ? '1px solid #e5e7eb' : 'none', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>
            ＋ Crear relaciones masivas
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{showCreate ? '▲ Ocultar' : '▼ Mostrar'}</span>
        </button>
        {showCreate && (
        <div style={{ padding: 20 }}>
          {/* Step 1: target entity */}
          <div style={{ marginBottom: 16, maxWidth: 360 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
              1. {tab === 'club' ? 'Club destino' : 'Jugador A'}
            </label>
            {tab === 'club' ? (
              <select value={addTarget} onChange={e => setAddTarget(e.target.value)} style={sel}>
                <option value="">— Seleccionar —</option>
                {activeEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            ) : (
              <PlayerCombobox players={players} value={addTarget} onChange={setAddTarget} placeholder="Buscar jugador A…" />
            )}
          </div>

          {/* Step 2: player selection mode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
              2. {tab === 'club' ? 'Jugadores a vincular' : 'Jugador(es) B'}
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([['text', 'Texto / Emails / IDs'], ['csv', 'CSV'], ['table', 'Tabla visual']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setAddMode(mode)} style={{ ...btn(addMode === mode ? 'primary' : 'ghost'), fontSize: 11 }}>
                  {label}
                </button>
              ))}
            </div>

            {addMode === 'text' && (
              <div>
                <textarea
                  value={addTextInput}
                  onChange={e => setAddTextInput(e.target.value)}
                  rows={4}
                  placeholder={'Pega IDs o emails separados por coma, punto y coma o salto de línea.\nEj: player-001, jugador@email.com\nplayer-005'}
                  style={{ ...inp, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {resolvePlayerIds(addTextInput).length} jugadores reconocidos
                </div>
              </div>
            )}

            {addMode === 'csv' && (
              <div>
                <input ref={csvRef} type="file" accept=".csv,.txt" onChange={handleCSVFile} style={{ display: 'none' }} />
                <button onClick={() => csvRef.current?.click()} style={{ ...btn('ghost'), marginBottom: 10 }}>
                  📄 Seleccionar archivo CSV
                </button>
                {addTextInput && (
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                    Archivo cargado — {resolvePlayerIds(addTextInput).length} jugadores reconocidos
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                  El CSV debe tener una columna con player_id o email (se auto-detecta).
                </div>
              </div>
            )}

            {addMode === 'table' && (
              <div>
                <input
                  type="text"
                  value={addTableSearch}
                  onChange={e => setAddTableSearch(e.target.value)}
                  placeholder="Buscar jugador por nombre, email o ID…"
                  style={{ ...inp, marginBottom: 8, maxWidth: 400 }}
                />
                <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e5e7eb' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>
                          <input type="checkbox"
                            checked={tableFilteredPlayers.length > 0 && tableFilteredPlayers.every(p => addTableSelected.has(p.id))}
                            onChange={() => {
                              const ids = tableFilteredPlayers.map(p => p.id);
                              const allSel = ids.every(id => addTableSelected.has(id));
                              const next = new Set(addTableSelected);
                              if (allSel) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id));
                              setAddTableSelected(next);
                            }}
                          />
                        </th>
                        <th style={th}>Nombre</th>
                        <th style={th}>Email</th>
                        <th style={th}>ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableFilteredPlayers.slice(0, 100).map(p => (
                        <tr key={p.id} style={{ background: addTableSelected.has(p.id) ? '#f0fdf4' : undefined }}>
                          <td style={td}><input type="checkbox" checked={addTableSelected.has(p.id)} onChange={() => {
                            const next = new Set(addTableSelected);
                            if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                            setAddTableSelected(next);
                          }} /></td>
                          <td style={td}>{p.name}</td>
                          <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.email}</span></td>
                          <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{p.id}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                  {addTableSelected.size} seleccionados
                </div>
              </div>
            )}
          </div>

          {/* Step 3: create button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handleBulkAdd}
              disabled={!addTarget || (addMode !== 'table' ? !addTextInput.trim() : addTableSelected.size === 0)}
              style={{ ...btn('primary'), opacity: (!addTarget || (addMode !== 'table' ? !addTextInput.trim() : addTableSelected.size === 0)) ? 0.4 : 1 }}
            >
              Crear relaciones
            </button>
            {addResult && (
              <span style={{ fontSize: 13, color: addResult.created > 0 ? '#059669' : '#6b7280' }}>
                {addResult.created > 0 ? `✓ ${addResult.created} relaciones creadas` : ''}
                {addResult.skipped > 0 ? ` · ${addResult.skipped} omitidas (ya existían o no se encontraron)` : ''}
              </span>
            )}
          </div>
        </div>
        )}
      </div>
      )}

      {/* ── RELATIONSHIPS TABLE ───────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151', margin: '4px 0 10px' }}>
        Listado de relaciones
      </div>
      <div style={card}>
        <div style={{ padding: '14px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {tab === 'club' && (
              <>
                <select value={clubFilterClub} onChange={e => setClubFilterClub(e.target.value)} style={{ ...sel, width: 'auto', minWidth: 180 }}>
                  <option value="">Todos los clubes</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={clubFilterPlayer} onChange={e => setClubFilterPlayer(e.target.value)} placeholder="Filtrar jugador…" style={{ ...inp, width: 200 }} />
              </>
            )}
            {tab === 'friends' && (
              <input value={friendFilterA} onChange={e => setFriendFilterA(e.target.value)} placeholder="Filtrar jugador…" style={{ ...inp, width: 240 }} />
            )}
            {tab === 'family' && (
              <>
                <div style={{ display: 'flex', gap: 0 }}>
                  {(['members', 'links'] as const).map(v => (
                    <button key={v} onClick={() => setFamilyView(v)} style={{ ...btn(familyView === v ? 'primary' : 'ghost'), fontSize: 12 }}>
                      {v === 'members' ? `Familiares (${familyMembers.length})` : `Vínculos (${familyLinks.length})`}
                    </button>
                  ))}
                </div>
                <input value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} placeholder="Filtrar…" style={{ ...inp, width: 220 }} />
              </>
            )}
          </div>
          {activeSelected.size > 0 && (
            <button onClick={handleDeleteSelected} style={{ ...btn('danger') }}>
              Eliminar {activeSelected.size} seleccionada{activeSelected.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          {/* Club-Player table */}
          {tab === 'club' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>
                    <input type="checkbox"
                      checked={filteredClubMems.length > 0 && filteredClubMems.every(m => clubSelected.has(`${m.playerId}|${m.clubId}`))}
                      onChange={() => toggleAll(filteredClubMems.map(m => `${m.playerId}|${m.clubId}`), clubSelected, setClubSelected)}
                    />
                  </th>
                  <th style={th}>Jugador ID</th>
                  <th style={th}>Club</th>
                  <th style={th}>Ciudad</th>
                  <th style={th}>País</th>
                  <th style={th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredClubMems.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin relaciones</td></tr>
                ) : filteredClubMems.map(m => {
                  const key = `${m.playerId}|${m.clubId}`;
                  const playerName = players.find(p => p.id === m.playerId)?.name ?? m.playerId;
                  return (
                    <tr key={key} style={{ background: clubSelected.has(key) ? '#fef2f2' : undefined }}>
                      <td style={td}><input type="checkbox" checked={clubSelected.has(key)} onChange={() => toggleRow(clubSelected, key, setClubSelected)} /></td>
                      <td style={td}><span style={{ fontWeight: 600 }}>{playerName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{m.playerId}</span></td>
                      <td style={td}>{m.clubName}</td>
                      <td style={td}>{m.clubCity}</td>
                      <td style={td}>{m.clubCountry}</td>
                      <td style={td}>{m.joinedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Friendships table */}
          {tab === 'friends' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>
                    <input type="checkbox"
                      checked={filteredFriendships.length > 0 && filteredFriendships.every(f => friendSelected.has(f.key))}
                      onChange={() => toggleAll(filteredFriendships.map(f => f.key), friendSelected, setFriendSelected)}
                    />
                  </th>
                  <th style={th}>Jugador A</th>
                  <th style={th}>Jugador B</th>
                  <th style={th}>Desde</th>
                </tr>
              </thead>
              <tbody>
                {filteredFriendships.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin amistades</td></tr>
                ) : filteredFriendships.map(f => (
                  <tr key={f.key} style={{ background: friendSelected.has(f.key) ? '#fef2f2' : undefined }}>
                    <td style={td}><input type="checkbox" checked={friendSelected.has(f.key)} onChange={() => toggleRow(friendSelected, f.key, setFriendSelected)} /></td>
                    <td style={td}><span style={{ fontWeight: 600 }}>{f.playerAName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{f.playerAId}</span></td>
                    <td style={td}><span style={{ fontWeight: 600 }}>{f.playerBName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{f.playerBId}</span></td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: 12 }}>{f.since ? new Date(f.since).toLocaleDateString('es-DO') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Family table */}
          {tab === 'family' && familyView === 'members' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Familiar</th>
                  <th style={th}>ID#</th>
                  <th style={th}>Responsable</th>
                  <th style={th}>Relación</th>
                  <th style={th}>Nacimiento</th>
                  <th style={th}>Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilyMembers.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin familiares registrados</td></tr>
                ) : filteredFamilyMembers.map(m => (
                  <tr key={m.id}>
                    <td style={td}><span style={{ fontWeight: 600 }}>{m.fullName}</span></td>
                    <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{m.id}</span></td>
                    <td style={td}><span style={{ fontWeight: 600 }}>{m.ownerName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{m.ownerId}</span></td>
                    <td style={td}>{m.relationType}</td>
                    <td style={td}>{m.birthDate || '—'}</td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: m.invitationStatus === 'accepted' ? '#dcfce7' : m.invitationStatus === 'invited' ? '#fef9c3' : '#f3f4f6', color: m.invitationStatus === 'accepted' ? '#15803d' : m.invitationStatus === 'invited' ? '#b45309' : '#6b7280' }}>
                        {m.invitationStatus === 'accepted' ? 'En plataforma' : m.invitationStatus === 'invited' ? 'Invitado' : 'Sin cuenta'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'family' && familyView === 'links' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>De</th>
                  <th style={th}>Para (email)</th>
                  <th style={th}>Relación</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilyLinks.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin vínculos entre cuentas</td></tr>
                ) : filteredFamilyLinks.map(l => (
                  <tr key={l.id}>
                    <td style={td}><span style={{ fontWeight: 600 }}>{l.fromName}</span></td>
                    <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.toEmail}</span></td>
                    <td style={td}>{l.relation}</td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: l.status === 'accepted' ? '#dcfce7' : l.status === 'rejected' ? '#fee2e2' : '#fef9c3', color: l.status === 'accepted' ? '#15803d' : l.status === 'rejected' ? '#b91c1c' : '#b45309' }}>
                        {l.status === 'accepted' ? 'Aceptado' : l.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Row count footer */}
        <div style={{ padding: '10px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af' }}>
          {tab === 'club' && `${filteredClubMems.length} relaciones`}
          {tab === 'friends' && `${filteredFriendships.length} amistades`}
          {tab === 'family' && (familyView === 'members' ? `${filteredFamilyMembers.length} familiares` : `${filteredFamilyLinks.length} vínculos`)}
        </div>
      </div>
    </div>
  );
}
