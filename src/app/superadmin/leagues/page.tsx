'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SALeague {
  id: string;
  code: string;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
  isOpen: boolean;
  isPublic: boolean;
  createdAt: string;
  memberCount: number;
  seasonCount: number;
  activeSeasonName: string | null;
  pendingRequests: number;
}

interface SALeagueMember { playerId: string; playerName: string; role: string; joinedAt: string }
interface SALeagueSeason { name: string; startDate: string; endDate: string; status: string }
interface SALeagueRequest { playerName: string; playerEmail: string; status: string; createdAt: string }

const th: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)',
  borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--grey-100)', verticalAlign: 'middle' };

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.split('T')[0] : d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SALeaguesPage() {
  const [leagues, setLeagues] = useState<SALeague[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SALeague | null>(null);
  const [detailMembers, setDetailMembers] = useState<SALeagueMember[]>([]);
  const [detailSeasons, setDetailSeasons] = useState<SALeagueSeason[]>([]);
  const [detailRequests, setDetailRequests] = useState<SALeagueRequest[]>([]);

  useEffect(() => {
    let alive = true;

    async function fetchAll() {
      if (!supabase) { setLoaded(true); return; }
      const [{ data: lRows, error: lErr }, { data: mRows }, { data: sRows }, { data: rRows }] = await Promise.all([
        supabase.from('player_leagues').select('*').order('created_at', { ascending: false }),
        supabase.from('league_members').select('league_id'),
        supabase.from('league_seasons').select('league_id, name, status'),
        supabase.from('league_join_requests').select('league_id, status'),
      ]);
      if (!alive) return;
      // A failed primary query must not be treated as "no leagues" — keep
      // showing whatever was last loaded instead of clobbering it with an
      // empty list.
      if (lErr) {
        console.error('[SA leagues] fetch failed:', lErr.message);
        setLoaded(true);
        return;
      }

      const memberCount = new Map<string, number>();
      for (const m of (mRows ?? []) as { league_id: string }[]) {
        memberCount.set(m.league_id, (memberCount.get(m.league_id) ?? 0) + 1);
      }
      const seasonCount = new Map<string, number>();
      const activeSeason = new Map<string, string>();
      for (const s of (sRows ?? []) as { league_id: string; name: string; status: string }[]) {
        seasonCount.set(s.league_id, (seasonCount.get(s.league_id) ?? 0) + 1);
        if (s.status === 'active') activeSeason.set(s.league_id, s.name);
      }
      const pendingCount = new Map<string, number>();
      for (const r of (rRows ?? []) as { league_id: string; status: string }[]) {
        if (r.status === 'pending') pendingCount.set(r.league_id, (pendingCount.get(r.league_id) ?? 0) + 1);
      }

      setLeagues(((lRows ?? []) as Record<string, unknown>[]).map(l => ({
        id: l.id as string,
        code: (l.code as string) ?? '',
        name: (l.name as string) ?? '',
        description: (l.description as string) ?? '',
        createdBy: (l.created_by as string) ?? '',
        createdByName: (l.created_by_name as string) ?? '',
        isOpen: !!l.is_open,
        isPublic: l.is_public !== false,
        createdAt: (l.created_at as string) ?? '',
        memberCount: memberCount.get(l.id as string) ?? 0,
        seasonCount: seasonCount.get(l.id as string) ?? 0,
        activeSeasonName: activeSeason.get(l.id as string) ?? null,
        pendingRequests: pendingCount.get(l.id as string) ?? 0,
      })));
      setLoaded(true);
    }

    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  async function openDetail(league: SALeague) {
    setSelected(league);
    setDetailMembers([]); setDetailSeasons([]); setDetailRequests([]);
    if (!supabase) return;
    const [{ data: mRows }, { data: sRows }, { data: rRows }] = await Promise.all([
      supabase.from('league_members').select('*').eq('league_id', league.id).order('joined_at', { ascending: true }),
      supabase.from('league_seasons').select('*').eq('league_id', league.id).order('created_at', { ascending: true }),
      supabase.from('league_join_requests').select('*').eq('league_id', league.id).order('created_at', { ascending: false }),
    ]);
    setDetailMembers(((mRows ?? []) as Record<string, unknown>[]).map(m => ({
      playerId: (m.player_id as string) ?? '',
      playerName: (m.player_name as string) ?? '',
      role: (m.role as string) ?? 'member',
      joinedAt: (m.joined_at as string) ?? '',
    })));
    setDetailSeasons(((sRows ?? []) as Record<string, unknown>[]).map(s => ({
      name: (s.name as string) ?? '',
      startDate: (s.start_date as string) ?? '',
      endDate: (s.end_date as string) ?? '',
      status: (s.status as string) ?? 'upcoming',
    })));
    setDetailRequests(((rRows ?? []) as Record<string, unknown>[]).map(r => ({
      playerName: (r.player_name as string) ?? '',
      playerEmail: (r.player_email as string) ?? '',
      status: (r.status as string) ?? 'pending',
      createdAt: (r.created_at as string) ?? '',
    })));
  }

  const filtered = leagues.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
      || l.createdByName.toLowerCase().includes(q) || l.createdBy.toLowerCase().includes(q);
  });

  const statusOf = (l: SALeague) => l.activeSeasonName ? 'Activa' : l.seasonCount > 0 ? 'Completada' : 'Por iniciar';
  const statusColor = (l: SALeague) => l.activeSeasonName
    ? { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' }
    : l.seasonCount > 0 ? { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' } : { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' };

  return (
    <div style={{ padding: '32px clamp(16px, 4vw, 40px)', maxWidth: 1400, fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 6 }}>
          Competencias de jugadores
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
          Ligas
        </h1>
      </div>

      {/* Stats + search */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>
          <strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 20 }}>{leagues.length}</strong> liga{leagues.length !== 1 ? 's' : ''} en total
          {' · '}
          <strong style={{ color: 'var(--black)' }}>{leagues.filter(l => l.activeSeasonName).length}</strong> activa{leagues.filter(l => l.activeSeasonName).length !== 1 ? 's' : ''}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código o creador…"
          style={{ marginLeft: 'auto', padding: '9px 14px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, outline: 'none', minWidth: 260 }}
        />
      </div>

      {/* Table */}
      {!loaded ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ border: '1px dashed var(--grey-300)', background: 'var(--grey-50)', padding: 48, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, borderRadius: 6 }}>
          {leagues.length === 0 ? 'Todavía no hay ligas creadas en la plataforma.' : 'Sin resultados para esa búsqueda.'}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--grey-200)', borderRadius: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 20 }}>Liga</th>
                <th style={th}>Código</th>
                <th style={th}>Creador</th>
                <th style={{ ...th, textAlign: 'center' }}>Miembros</th>
                <th style={{ ...th, textAlign: 'center' }}>Temporadas</th>
                <th style={th}>Temporada activa</th>
                <th style={{ ...th, textAlign: 'center' }}>Solicitudes</th>
                <th style={th}>Estado</th>
                <th style={th}>Creada</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const c = statusColor(l);
                return (
                  <tr key={l.id} onClick={() => openDetail(l)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--grey-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...td, paddingLeft: 20, fontWeight: 600 }}>
                      {l.name}
                      {l.description && <div style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 400, marginTop: 2, maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.description}</div>}
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{l.code || '—'}</td>
                    <td style={td}>
                      {l.createdByName || '—'}
                      <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{l.createdBy}</div>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{l.memberCount}</td>
                    <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{l.seasonCount}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.activeSeasonName ?? <span style={{ color: 'var(--grey-300)' }}>—</span>}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {l.pendingRequests > 0
                        ? <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{l.pendingRequests}</span>
                        : <span style={{ color: 'var(--grey-300)' }}>0</span>}
                    </td>
                    <td style={td}>
                      <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                        {statusOf(l)}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--grey-500)' }}>{fmtDate(l.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 100vw)', background: '#fff', height: '100vh', overflowY: 'auto', padding: '28px 28px 48px', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--grey-400)', padding: 4 }}>×</button>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--grey-500)', marginBottom: 4 }}>{selected.code}</div>
            {selected.description && <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: '8px 0 0' }}>{selected.description}</p>}

            <div style={{ display: 'flex', gap: 20, margin: '20px 0', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Creador</div><div style={{ fontSize: 13, fontWeight: 600 }}>{selected.createdByName || selected.createdBy || '—'}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Creada</div><div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(selected.createdAt)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Visibilidad</div><div style={{ fontSize: 13, fontWeight: 600 }}>{selected.isPublic ? 'Pública' : 'Privada'}{selected.isOpen ? ' · Inscripción abierta' : ''}</div></div>
            </div>

            {/* Members */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', margin: '20px 0 10px' }}>
              Miembros ({detailMembers.length})
            </div>
            {detailMembers.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Sin miembros registrados.</div>
            ) : detailMembers.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.playerName || m.playerId}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{m.playerId} · desde {fmtDate(m.joinedAt)}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px',
                  background: m.playerId === selected.createdBy ? 'var(--court-blue)' : m.role === 'admin' ? 'rgba(37,99,235,0.12)' : 'rgba(107,114,128,0.14)',
                  color: m.playerId === selected.createdBy ? '#fff' : m.role === 'admin' ? '#2563eb' : '#4b5563',
                }}>
                  {m.playerId === selected.createdBy ? 'Creador' : m.role === 'admin' ? 'Coadmin' : 'Jugador'}
                </span>
              </div>
            ))}

            {/* Seasons */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', margin: '24px 0 10px' }}>
              Temporadas ({detailSeasons.length})
            </div>
            {detailSeasons.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Sin temporadas.</div>
            ) : detailSeasons.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{s.startDate || '—'} → {s.endDate || '—'}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px',
                  background: s.status === 'active' ? 'rgba(34,197,94,0.12)' : s.status === 'completed' ? 'rgba(107,114,128,0.12)' : 'rgba(234,179,8,0.12)',
                  color: s.status === 'active' ? '#16a34a' : s.status === 'completed' ? '#6b7280' : '#ca8a04',
                }}>
                  {s.status === 'active' ? 'Activa' : s.status === 'completed' ? 'Completada' : 'Por iniciar'}
                </span>
              </div>
            ))}

            {/* Join requests */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', margin: '24px 0 10px' }}>
              Solicitudes ({detailRequests.length})
            </div>
            {detailRequests.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Sin solicitudes.</div>
            ) : detailRequests.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.playerName || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{r.playerEmail || ''} · {fmtDate(r.createdAt)}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px',
                  background: r.status === 'pending' ? '#fef3c7' : r.status === 'approved' ? 'rgba(34,197,94,0.12)' : '#fee2e2',
                  color: r.status === 'pending' ? '#92400e' : r.status === 'approved' ? '#16a34a' : '#dc2626',
                }}>
                  {r.status === 'pending' ? 'Pendiente' : r.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
