'use client';

import React, { useState, useEffect } from 'react';
import { getSAGames, saveSAGames, getSAGamesFromSupabase, upsertSAGameToSupabase, deleteGameFromSupabase, type SAGame } from '@/lib/superadmin-data';
import {
  getScoreCorrections,
  updateScoreCorrectionStatus,
  fetchCorrectionsFromSupabase,
  mergeCorrectionsFromSupabase,
  type ScoreCorrectionRequest,
} from '@/lib/score-correction-store';

function uid() { return Math.random().toString(36).slice(2, 10); }

const PAGE_SIZE = 15;

function Modal({ children, onClose, maxWidth = 520 }: { children: React.ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '32px 36px', width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--grey-200)',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  color: 'var(--black)',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: SAGame['status'] }) {
  const cfg = {
    ongoing:   { label: 'En curso',   bg: '#dcfce7', color: '#166534' },
    completed: { label: 'Finalizado', bg: '#f0f0f0', color: '#555' },
    cancelled: { label: 'Cancelado',  bg: '#fee2e2', color: '#991b1b' },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function CorrStatusBadge({ status }: { status: ScoreCorrectionRequest['status'] }) {
  const cfg = {
    pending:  { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e' },
    approved: { label: 'Aprobado',  bg: '#dcfce7', color: '#166534' },
    rejected: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b' },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = String(row[h] ?? '').replace(/"/g, '""');
      return val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function GameForm({ initial, onSave, onCancel, mode }: {
  initial: Partial<SAGame>;
  onSave: (g: SAGame) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<Partial<SAGame>>({
    name: '',
    date: today,
    players: 8,
    rounds: 4,
    format: 'Americano',
    scoreConfig: 'games',
    status: 'ongoing',
    ...initial,
  });

  function set(k: keyof SAGame, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: form.id ?? uid(),
      name: form.name ?? '',
      date: form.date ?? today,
      players: form.players ?? 8,
      rounds: form.rounds ?? 0,
      format: form.format ?? 'Americano',
      scoreConfig: form.scoreConfig ?? 'games',
      status: form.status ?? 'ongoing',
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 20 }}>
        {mode === 'create' ? 'Nuevo Juego Rapido' : 'Editar Juego'}
      </h2>

      <Field label="Nombre del Juego">
        <input style={inputStyle} required value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Juego Americano Noche..." />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Fecha">
          <input style={inputStyle} type="date" value={form.date ?? today} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Jugadores">
          <input style={inputStyle} type="number" min={2} max={64} value={form.players ?? 8} onChange={e => set('players', Number(e.target.value))} />
        </Field>
        <Field label="Rondas jugadas">
          <input style={inputStyle} type="number" min={0} max={99} value={form.rounds ?? 0} onChange={e => set('rounds', Number(e.target.value))} />
        </Field>
        <Field label="Estado">
          <select style={inputStyle} value={form.status ?? 'ongoing'} onChange={e => set('status', e.target.value as SAGame['status'])}>
            <option value="ongoing">En curso</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </Field>
        <Field label="Formato">
          <select style={inputStyle} value={form.format ?? 'Americano'} onChange={e => set('format', e.target.value)}>
            <option value="Americano">Americano</option>
            <option value="Mexicano">Mexicano</option>
            <option value="Grupos">Grupos</option>
            <option value="Eliminacion directa">Eliminación directa</option>
            <option value="Round Robin">Round Robin</option>
          </select>
        </Field>
        <Field label="Modo de Score">
          <select style={inputStyle} value={form.scoreConfig ?? 'games'} onChange={e => set('scoreConfig', e.target.value)}>
            <option value="games">Games</option>
            <option value="puntos">Puntos</option>
            <option value="sets">Sets</option>
            <option value="tiempo">Tiempo</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
        <button type="submit" style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {mode === 'create' ? 'Crear Juego' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}

export default function GamesPage() {
  const [games, setGames] = useState<SAGame[]>([]);
  const [corrections, setCorrections] = useState<ScoreCorrectionRequest[]>([]);
  const [tab, setTab] = useState<'games' | 'corrections'>('games');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approveConfirm, setApproveConfirm] = useState<{ step: number; corrId: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ corrId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [selectedGame, setSelectedGame] = useState<SAGame | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editGame, setEditGame] = useState<SAGame | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ gameId: string } | null>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setGames(getSAGames());
    setCorrections(getScoreCorrections().filter(c => c.type === 'game'));

    function fetchFromSupabase() {
      getSAGamesFromSupabase().then(sbGames => {
        // null = fetch failed — keep showing local cache. [] is a legitimate
        // "zero games" result and must be trusted, not skipped.
        if (sbGames !== null) {
          setGames(sbGames);
          saveSAGames(sbGames);
        }
      });
      fetchCorrectionsFromSupabase().then(remote => {
        const gameCorrections = remote.filter(c => c.type === 'game');
        if (gameCorrections.length > 0) {
          mergeCorrectionsFromSupabase(gameCorrections);
          setCorrections(getScoreCorrections().filter(c => c.type === 'game'));
        }
      });
    }

    fetchFromSupabase();
    const interval = setInterval(fetchFromSupabase, 15000);
    return () => clearInterval(interval);
  }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function saveAndRefresh(updated: SAGame[]) {
    saveSAGames(updated);
    setGames(updated);
  }

  function handleSaveGame(g: SAGame) {
    const exists = games.find(x => x.id === g.id);
    const updated = exists ? games.map(x => x.id === g.id ? g : x) : [g, ...games];
    saveAndRefresh(updated);
    upsertSAGameToSupabase(g).catch(err => { console.error('[SA games] save failed:', err); toast('El juego se guardó localmente pero no en Supabase — reintentá', false); });
    if (selectedGame?.id === g.id) setSelectedGame(g);
    setShowCreateModal(false);
    setEditGame(null);
    toast(exists ? 'Juego actualizado' : 'Juego creado correctamente');
  }

  function handleDeleteGame(gameId: string) {
    const updated = games.filter(g => g.id !== gameId);
    saveAndRefresh(updated);
    deleteGameFromSupabase(gameId).catch(err => console.error('[SA games] delete failed:', err));
    if (selectedGame?.id === gameId) setSelectedGame(null);
    setDeleteConfirm(null);
    toast('Juego eliminado');
  }

  function handleStatusChange(gameId: string, status: SAGame['status']) {
    const updated = games.map(g => g.id === gameId ? { ...g, status } : g);
    saveAndRefresh(updated);
    const changed = updated.find(g => g.id === gameId);
    if (changed) upsertSAGameToSupabase(changed).catch(err => console.error('[SA games] status change failed:', err));
    if (selectedGame?.id === gameId) setSelectedGame(prev => prev ? { ...prev, status } : prev);
    toast(`Estado cambiado a: ${status === 'ongoing' ? 'En curso' : status === 'completed' ? 'Finalizado' : 'Cancelado'}`);
  }

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <span style={{ color: 'var(--grey-300)', marginLeft: 4, fontSize: 9 }}>↕</span>;
    return <span style={{ color: 'var(--turf-green)', marginLeft: 4, fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  const filtered = games.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.name.toLowerCase().includes(q) || g.format.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    else if (sortKey === 'date') { av = a.date; bv = b.date; }
    else if (sortKey === 'players') { av = a.players; bv = b.players; }
    else if (sortKey === 'rounds') { av = a.rounds; bv = b.rounds; }
    else if (sortKey === 'status') { av = a.status; bv = b.status; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pageGames = sorted.slice(pageStart, pageEnd);

  function renderPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: 'pointer', background: p === safePage ? '#0a0a0a' : '#fff', color: p === safePage ? '#fff' : 'var(--grey-600)', fontSize: 12, fontWeight: p === safePage ? 700 : 400 }}>{p}</button>
      ));
    }
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (safePage > 3) pages.push('...');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages.map((p, i) => p === '...'
      ? <span key={`e${i}`} style={{ padding: '4px 6px', fontSize: 12, color: 'var(--grey-400)' }}>…</span>
      : <button key={p} onClick={() => setPage(p as number)} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: 'pointer', background: p === safePage ? '#0a0a0a' : '#fff', color: p === safePage ? '#fff' : 'var(--grey-600)', fontSize: 12, fontWeight: p === safePage ? 700 : 400 }}>{p}</button>
    );
  }

  function handleApproveStep1(corrId: string) { setApproveConfirm({ step: 1, corrId }); }
  function handleApproveStep2() { if (!approveConfirm) return; setApproveConfirm({ ...approveConfirm, step: 2 }); }
  function handleApproveFinal() {
    if (!approveConfirm) return;
    updateScoreCorrectionStatus(approveConfirm.corrId, 'approved', { reviewedBy: 'Super Admin' });
    setCorrections(getScoreCorrections().filter(c => c.type === 'game'));
    setApproveConfirm(null);
    // NOTE: this only flips the correction's status — it does not yet patch the
    // game's stored score or recalculate affected players' ranking points.
    // That application step doesn't exist anywhere in the codebase yet.
    toast('Correccion marcada como aprobada');
  }

  function handleReject(corrId: string) {
    updateScoreCorrectionStatus(corrId, 'rejected', { reviewedBy: 'Super Admin' });
    setCorrections(getScoreCorrections().filter(c => c.type === 'game'));
    setRejectConfirm(null);
    toast('Correccion rechazada');
  }

  const corrById = Object.fromEntries(corrections.map(c => [c.id, c]));
  const approveTarget = approveConfirm ? corrById[approveConfirm.corrId] : null;
  const pendingCorrCount = corrections.filter(c => c.status === 'pending').length;
  const ongoingCount = games.filter(g => g.status === 'ongoing').length;
  const completedCount = games.filter(g => g.status === 'completed').length;

  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', fontFamily: 'var(--font-body)' };
  const deleteTarget = deleteConfirm ? games.find(g => g.id === deleteConfirm.gameId) : null;

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-body)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.ok ? '#0a0a0a' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: 6, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderLeft: `3px solid ${t.ok ? 'var(--turf-green)' : '#fca5a5'}` }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Gestion</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Juegos Rapidos</h1>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
          + Nuevo Juego
        </button>
      </div>

      {/* KPI chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: games.length, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'En curso', value: ongoingCount, color: '#166534', bg: '#dcfce7' },
          { label: 'Finalizados', value: completedCount, color: '#555', bg: '#f0f0f0' },
          { label: 'Correcciones pendientes', value: pendingCorrCount, color: '#854d0e', bg: '#fef9c3' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 6, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 24 }}>
        {([
          { key: 'games', label: `Lista de Juegos (${games.length})` },
          { key: 'corrections', label: `Correcciones (${pendingCorrCount} pendiente${pendingCorrCount !== 1 ? 's' : ''})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: tab === key ? 'var(--black)' : 'var(--grey-400)',
            borderBottom: tab === key ? '2px solid var(--turf-green)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'games' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <input placeholder="Buscar por nombre o formato..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 280, outline: 'none', fontFamily: 'var(--font-body)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 180, outline: 'none', fontFamily: 'var(--font-body)' }}>
              <option value="all">Todos los estados</option>
              <option value="ongoing">En curso</option>
              <option value="completed">Finalizados</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <button
              onClick={() => exportCSV(filtered.map(g => ({ Nombre: g.name, Fecha: g.date, Jugadores: g.players, Formato: g.format, ScoreMode: g.scoreConfig, Rondas: g.rounds, Estado: g.status })), 'juegos_rapidos.csv')}
              style={{ padding: '8px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--grey-600)', letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 'auto' }}
            >
              Exportar CSV
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                    <th onClick={() => handleSort('name')} style={thStyle}>Nombre <SortIcon col="name" /></th>
                    <th onClick={() => handleSort('date')} style={thStyle}>Fecha <SortIcon col="date" /></th>
                    <th onClick={() => handleSort('players')} style={{ ...thStyle, textAlign: 'center' }}>Jugadores <SortIcon col="players" /></th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Formato</th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Score Mode</th>
                    <th onClick={() => handleSort('rounds')} style={{ ...thStyle, textAlign: 'center' }}>Rondas <SortIcon col="rounds" /></th>
                    <th onClick={() => handleSort('status')} style={thStyle}>Estado <SortIcon col="status" /></th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageGames.map(g => (
                    <tr key={g.id}
                      style={{ borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}
                      onClick={() => setSelectedGame(g)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--black)' }}>{g.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{g.date}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{g.players}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{g.format}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, textTransform: 'capitalize' }}>{g.scoreConfig}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>{g.rounds}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={g.status} /></td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditGame(g)} style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>EDT</button>
                          <button onClick={() => setDeleteConfirm({ gameId: g.id })} style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>DEL</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageGames.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>No se encontraron juegos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {sorted.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: 'var(--grey-500)' }}>
              <span>Mostrando {pageStart + 1}–{pageEnd} de {sorted.length}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: safePage === 1 ? 'default' : 'pointer', background: '#fff', color: safePage === 1 ? 'var(--grey-300)' : 'var(--grey-600)', fontSize: 12 }}>Anterior</button>
                {renderPageNumbers()}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', borderRadius: 3, cursor: safePage === totalPages ? 'default' : 'pointer', background: '#fff', color: safePage === totalPages ? 'var(--grey-300)' : 'var(--grey-600)', fontSize: 12 }}>Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'corrections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {corrections.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6 }}>
              No hay solicitudes de corrección de score
            </div>
          )}
          {corrections.map(corr => (
            <div key={corr.id} style={{
              background: '#fff',
              border: `1px solid ${corr.status === 'pending' ? 'var(--grey-200)' : corr.status === 'approved' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 6,
              padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, fontFamily: 'var(--font-display)' }}>{corr.entityName}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
                    Ronda {corr.roundNum} — Cancha {corr.courtNum} — Solicitado por: <strong>{corr.requestedBy}</strong>
                  </div>
                </div>
                <CorrStatusBadge status={corr.status} />
              </div>

              <div style={{ display: 'flex', gap: 24, marginBottom: 14, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Score actual</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#dc2626' }}>{corr.currentScore}</div>
                </div>
                <div style={{ fontSize: 18, color: 'var(--grey-300)', fontWeight: 300 }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Score solicitado</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--turf-green)' }}>{corr.requestedScore}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--grey-600)', marginBottom: 14, fontStyle: 'italic', background: 'var(--grey-50)', padding: '10px 14px', borderRadius: 4 }}>
                &ldquo;{corr.reason}&rdquo;
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                  {new Date(corr.createdAt).toLocaleString('es-ES')}
                </div>
                {corr.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setRejectConfirm({ corrId: corr.id })} style={{ padding: '8px 18px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Rechazar
                    </button>
                    <button onClick={() => handleApproveStep1(corr.id)} style={{ padding: '8px 18px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Aprobar correccion
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedGame && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1009 }} onClick={() => setSelectedGame(null)} />
          <div
            style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', zIndex: 1010, overflowY: 'auto', padding: '32px 36px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Juego Rapido</div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{selectedGame.name}</h2>
              </div>
              <button onClick={() => setSelectedGame(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: '0 0 0 16px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <StatusBadge status={selectedGame.status} />
              <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--grey-500)' }}>{selectedGame.date}</span>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Jugadores', value: selectedGame.players },
                { label: 'Rondas Jugadas', value: selectedGame.rounds },
                { label: 'Formato', value: selectedGame.format },
                { label: 'Score Mode', value: selectedGame.scoreConfig },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--grey-50)', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Status quick change */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>Cambiar Estado</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['ongoing', 'completed', 'cancelled'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedGame.id, s)}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.04em',
                      background: selectedGame.status === s ? '#0a0a0a' : 'transparent',
                      color: selectedGame.status === s ? '#fff' : 'var(--grey-500)',
                      border: selectedGame.status === s ? '1px solid #0a0a0a' : '1px solid var(--grey-200)',
                    }}
                  >
                    {s === 'ongoing' ? 'En curso' : s === 'completed' ? 'Finalizado' : 'Cancelado'}
                  </button>
                ))}
              </div>
            </div>

            {/* Corrections for this game */}
            {(() => {
              const gameCorrs = corrections.filter(c => c.entityId === selectedGame.id || c.entityName.toLowerCase().includes(selectedGame.name.toLowerCase().slice(0, 10)));
              if (gameCorrs.length === 0) return null;
              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 12 }}>Solicitudes de Correccion ({gameCorrs.length})</div>
                  {gameCorrs.map(c => (
                    <div key={c.id} style={{ padding: '10px 14px', border: '1px solid var(--grey-200)', borderRadius: 4, marginBottom: 8, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Ronda {c.roundNum} — Cancha {c.courtNum}</span>
                        <CorrStatusBadge status={c.status} />
                      </div>
                      <div style={{ color: 'var(--grey-500)' }}>Por: {c.requestedBy}</div>
                      <div style={{ marginTop: 4 }}>
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>{c.currentScore}</span>
                        <span style={{ margin: '0 8px', color: 'var(--grey-400)' }}>→</span>
                        <span style={{ color: 'var(--turf-green)', fontWeight: 700 }}>{c.requestedScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => setEditGame(selectedGame)} style={{ padding: '10px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Editar Juego
              </button>
              <button onClick={() => { setDeleteConfirm({ gameId: selectedGame.id }); }}
                style={{ padding: '10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Eliminar Juego
              </button>
              <button onClick={() => setSelectedGame(null)} style={{ padding: '10px', background: 'var(--grey-50)', color: 'var(--grey-600)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <GameForm mode="create" initial={{}} onSave={handleSaveGame} onCancel={() => setShowCreateModal(false)} />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editGame && (
        <Modal onClose={() => setEditGame(null)}>
          <GameForm mode="edit" initial={editGame} onSave={handleSaveGame} onCancel={() => setEditGame(null)} />
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && deleteTarget && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Eliminar Juego</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas seguro de que deseas eliminar <strong>{deleteTarget.name}</strong>? Esta accion no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={() => handleDeleteGame(deleteTarget.id)} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Eliminar</button>
          </div>
        </Modal>
      )}

      {/* APPROVE STEP 1 */}
      {approveConfirm?.step === 1 && approveTarget && (
        <Modal onClose={() => setApproveConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Aprobar Correccion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 8 }}>
            Estas a punto de cambiar el score de <strong>{approveTarget.entityName}</strong>:
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', background: 'var(--grey-50)', borderRadius: 4, marginBottom: 20, fontSize: 14 }}>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{approveTarget.currentScore}</span>
            <span style={{ color: 'var(--grey-400)' }}>→</span>
            <span style={{ fontWeight: 700, color: 'var(--turf-green)' }}>{approveTarget.requestedScore}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setApproveConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleApproveStep2} style={{ padding: '9px 20px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Continuar</button>
          </div>
        </Modal>
      )}

      {/* APPROVE STEP 2 */}
      {approveConfirm?.step === 2 && approveTarget && (
        <Modal onClose={() => setApproveConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Confirmar Modificacion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            Esta accion modificara el score permanentemente. ¿Confirmas la correccion de <strong>{approveTarget.entityName}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setApproveConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleApproveFinal} style={{ padding: '9px 20px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Confirmar aprobación</button>
          </div>
        </Modal>
      )}

      {/* REJECT CONFIRM */}
      {rejectConfirm && (
        <Modal onClose={() => setRejectConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Rechazar Correccion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas el rechazo de esta solicitud? El score actual se mantendra.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setRejectConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={() => handleReject(rejectConfirm.corrId)} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Rechazar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
