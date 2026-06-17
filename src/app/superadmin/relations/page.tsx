'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSAPlayers } from '@/lib/superadmin-data';
import { getSAClubs } from '@/lib/superadmin-data';
import type { SAPlayer, SAClub } from '@/lib/superadmin-data';
import { joinClub, leaveClub } from '@/lib/club-membership-store';
import type { ClubMembership } from '@/lib/club-membership-store';
import { joinLeague, leaveLeague, getAllLeagueMemberships } from '@/lib/league-membership-store';
import type { LeagueMembership } from '@/lib/league-membership-store';
import { joinFederation, leaveFederation, getAllFederationMemberships } from '@/lib/federation-membership-store';
import type { FederationMembership } from '@/lib/federation-membership-store';
import { addFriendship, removeFriendship } from '@/lib/player-store';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'club' | 'friends' | 'league' | 'federation' | 'family';
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
}

// Static league / federation entities (extend later)
const MOCK_LEAGUES = [
  { id: 'league-001', name: 'Liga Premier LATAM' },
  { id: 'league-002', name: 'Liga Regional Sur' },
  { id: 'league-003', name: 'Liga Nacional Argentina' },
];

const MOCK_FEDERATIONS = [
  { id: 'fed-001', name: 'Federación Argentina' },
  { id: 'fed-002', name: 'Federación España' },
  { id: 'fed-003', name: 'Federación Chile' },
];

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

  // League state
  const [leagueMemberships, setLeagueMemberships] = useState<LeagueMembership[]>([]);
  const [leagueSelected, setLeagueSelected] = useState<Set<string>>(new Set());
  const [leagueFilterLeague, setLeagueFilterLeague] = useState('');

  // Federation state
  const [fedMemberships, setFedMemberships] = useState<FederationMembership[]>([]);
  const [fedSelected, setFedSelected] = useState<Set<string>>(new Set());
  const [fedFilterFed, setFedFilterFed] = useState('');

  // Family state (read-only listing of family members + links)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>([]);
  const [familyLinks, setFamilyLinks] = useState<FamilyLinkRow[]>([]);
  const [familyFilter, setFamilyFilter] = useState('');
  const [familyView, setFamilyView] = useState<'members' | 'links'>('members');

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

    // Club memberships — read localStorage directly (no getAllMemberships export)
    try {
      const raw = localStorage.getItem('padelmgt_club_memberships');
      setClubMemberships(raw ? JSON.parse(raw) as ClubMembership[] : []);
    } catch { setClubMemberships([]); }

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

    setLeagueMemberships(getAllLeagueMemberships());
    setFedMemberships(getAllFederationMemberships());

    // Family members + links — read localStorage directly (SA read-only listing)
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
        created++;
      }
    } else if (tab === 'league') {
      const league = MOCK_LEAGUES.find(l => l.id === addTarget);
      if (!league) return;
      for (const id of ids) {
        const p = players.find(pl => pl.id === id);
        if (!p) { skipped++; continue; }
        const existing = leagueMemberships.some(m => m.playerId === id && m.leagueId === league.id);
        if (existing) { skipped++; continue; }
        joinLeague({ id: p.id, name: p.name, email: p.email }, league);
        created++;
      }
    } else if (tab === 'federation') {
      const fed = MOCK_FEDERATIONS.find(f => f.id === addTarget);
      if (!fed) return;
      for (const id of ids) {
        const p = players.find(pl => pl.id === id);
        if (!p) { skipped++; continue; }
        const existing = fedMemberships.some(m => m.playerId === id && m.federationId === fed.id);
        if (existing) { skipped++; continue; }
        joinFederation({ id: p.id, name: p.name, email: p.email }, fed);
        created++;
      }
    } else if (tab === 'friends') {
      // ids contains two player IDs; create friendship between each pair
      if (ids.length < 2) { setAddResult({ created: 0, skipped: ids.length }); return; }
      const [aId, ...rest] = ids;
      for (const bId of rest) {
        if (aId === bId) { skipped++; continue; }
        const already = friendships.some(f =>
          (f.playerAId === aId && f.playerBId === bId) ||
          (f.playerAId === bId && f.playerBId === aId)
        );
        if (already) { skipped++; continue; }
        addFriendship(aId, bId);
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
      }
      setClubSelected(new Set());
    } else if (tab === 'friends') {
      for (const key of friendSelected) {
        const [aId, bId] = key.split('|');
        removeFriendship(aId, bId);
      }
      setFriendSelected(new Set());
    } else if (tab === 'league') {
      for (const key of leagueSelected) {
        const [playerId, leagueId] = key.split('|');
        leaveLeague(playerId, leagueId);
      }
      setLeagueSelected(new Set());
    } else if (tab === 'federation') {
      for (const key of fedSelected) {
        const [playerId, fedId] = key.split('|');
        leaveFederation(playerId, fedId);
      }
      setFedSelected(new Set());
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
    return clubMemberships.filter(m => {
      const matchClub = !clubFilterClub || m.clubId === clubFilterClub;
      const matchPlayer = !clubFilterPlayer || m.playerId === clubFilterPlayer || m.clubName.toLowerCase().includes(clubFilterPlayer.toLowerCase());
      return matchClub && matchPlayer;
    });
  }, [clubMemberships, clubFilterClub, clubFilterPlayer]);

  const filteredFriendships = useMemo(() => {
    return friendships.filter(f => {
      if (!friendFilterA) return true;
      return f.playerAName.toLowerCase().includes(friendFilterA.toLowerCase()) ||
        f.playerBName.toLowerCase().includes(friendFilterA.toLowerCase());
    });
  }, [friendships, friendFilterA]);

  const filteredLeagueMems = useMemo(() => {
    return leagueMemberships.filter(m => !leagueFilterLeague || m.leagueId === leagueFilterLeague);
  }, [leagueMemberships, leagueFilterLeague]);

  const filteredFedMems = useMemo(() => {
    return fedMemberships.filter(m => !fedFilterFed || m.federationId === fedFilterFed);
  }, [fedMemberships, fedFilterFed]);

  const tableFilteredPlayers = useMemo(() => {
    const q = addTableSearch.toLowerCase();
    return players.filter(p => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.shortId?.toLowerCase().includes(q));
  }, [players, addTableSearch]);

  // ── Tab labels ─────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'club',       label: 'Club — Jugador',         count: clubMemberships.length },
    { key: 'friends',    label: 'Amistades',              count: friendships.length },
    { key: 'league',     label: 'Liga — Jugador',         count: leagueMemberships.length },
    { key: 'federation', label: 'Federación — Jugador',   count: fedMemberships.length },
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
    tab === 'friends' ? friendSelected :
    tab === 'league' ? leagueSelected :
    fedSelected;

  const activeEntityLabel =
    tab === 'club' ? 'Club' :
    tab === 'friends' ? 'Jugador destino' :
    tab === 'league' ? 'Liga' : 'Federación';

  const activeEntities =
    tab === 'club' ? clubs.map(c => ({ id: c.id, name: c.name })) :
    tab === 'friends' ? players.map(p => ({ id: p.id, name: `${p.name} (${p.email})` })) :
    tab === 'league' ? MOCK_LEAGUES :
    MOCK_FEDERATIONS;

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
            onClick={() => { setTab(t.key); setAddResult(null); setAddTarget(''); setAddTextInput(''); setAddTableSelected(new Set()); }}
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
              1. {activeEntityLabel} destino
            </label>
            <select value={addTarget} onChange={e => setAddTarget(e.target.value)} style={{ ...sel, maxWidth: 360 }}>
              <option value="">— Seleccionar —</option>
              {activeEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* Step 2: player selection mode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
              2. Jugadores a vincular
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
            {tab === 'league' && (
              <select value={leagueFilterLeague} onChange={e => setLeagueFilterLeague(e.target.value)} style={{ ...sel, width: 'auto', minWidth: 220 }}>
                <option value="">Todas las ligas</option>
                {MOCK_LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            {tab === 'federation' && (
              <select value={fedFilterFed} onChange={e => setFedFilterFed(e.target.value)} style={{ ...sel, width: 'auto', minWidth: 220 }}>
                <option value="">Todas las federaciones</option>
                {MOCK_FEDERATIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
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
                </tr>
              </thead>
              <tbody>
                {filteredFriendships.length === 0 ? (
                  <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin amistades</td></tr>
                ) : filteredFriendships.map(f => (
                  <tr key={f.key} style={{ background: friendSelected.has(f.key) ? '#fef2f2' : undefined }}>
                    <td style={td}><input type="checkbox" checked={friendSelected.has(f.key)} onChange={() => toggleRow(friendSelected, f.key, setFriendSelected)} /></td>
                    <td style={td}><span style={{ fontWeight: 600 }}>{f.playerAName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{f.playerAId}</span></td>
                    <td style={td}><span style={{ fontWeight: 600 }}>{f.playerBName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{f.playerBId}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* League-Player table */}
          {tab === 'league' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>
                    <input type="checkbox"
                      checked={filteredLeagueMems.length > 0 && filteredLeagueMems.every(m => leagueSelected.has(`${m.playerId}|${m.leagueId}`))}
                      onChange={() => toggleAll(filteredLeagueMems.map(m => `${m.playerId}|${m.leagueId}`), leagueSelected, setLeagueSelected)}
                    />
                  </th>
                  <th style={th}>Jugador</th>
                  <th style={th}>Email</th>
                  <th style={th}>Liga</th>
                  <th style={th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeagueMems.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin relaciones</td></tr>
                ) : filteredLeagueMems.map(m => {
                  const key = `${m.playerId}|${m.leagueId}`;
                  return (
                    <tr key={key} style={{ background: leagueSelected.has(key) ? '#fef2f2' : undefined }}>
                      <td style={td}><input type="checkbox" checked={leagueSelected.has(key)} onChange={() => toggleRow(leagueSelected, key, setLeagueSelected)} /></td>
                      <td style={td}><span style={{ fontWeight: 600 }}>{m.playerName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{m.playerId}</span></td>
                      <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.playerEmail}</span></td>
                      <td style={td}>{m.leagueName}</td>
                      <td style={td}>{m.joinedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Federation-Player table */}
          {tab === 'federation' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>
                    <input type="checkbox"
                      checked={filteredFedMems.length > 0 && filteredFedMems.every(m => fedSelected.has(`${m.playerId}|${m.federationId}`))}
                      onChange={() => toggleAll(filteredFedMems.map(m => `${m.playerId}|${m.federationId}`), fedSelected, setFedSelected)}
                    />
                  </th>
                  <th style={th}>Jugador</th>
                  <th style={th}>Email</th>
                  <th style={th}>Federación</th>
                  <th style={th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredFedMems.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Sin relaciones</td></tr>
                ) : filteredFedMems.map(m => {
                  const key = `${m.playerId}|${m.federationId}`;
                  return (
                    <tr key={key} style={{ background: fedSelected.has(key) ? '#fef2f2' : undefined }}>
                      <td style={td}><input type="checkbox" checked={fedSelected.has(key)} onChange={() => toggleRow(fedSelected, key, setFedSelected)} /></td>
                      <td style={td}><span style={{ fontWeight: 600 }}>{m.playerName}</span><br /><span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{m.playerId}</span></td>
                      <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.playerEmail}</span></td>
                      <td style={td}>{m.federationName}</td>
                      <td style={td}>{m.joinedAt}</td>
                    </tr>
                  );
                })}
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
          {tab === 'league' && `${filteredLeagueMems.length} relaciones`}
          {tab === 'federation' && `${filteredFedMems.length} relaciones`}
          {tab === 'family' && (familyView === 'members' ? `${filteredFamilyMembers.length} familiares` : `${filteredFamilyLinks.length} vínculos`)}
        </div>
      </div>
    </div>
  );
}
