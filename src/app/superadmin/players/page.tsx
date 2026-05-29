'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getSAPlayers,
  getSAClubs,
  saveSAPlayers,
  getPlayerCustomFields,
  savePlayerCustomFields,
  getPlayerRelationships,
  savePlayerRelationships,
  getSAPlayersFromSupabase,
  upsertSAPlayerToSupabase,
  deleteSAPlayerFromSupabase,
  type SAPlayer,
  type PlayerRelationship,
} from '@/lib/superadmin-data';

// ── helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

const PAGE_SIZE = 20;

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

function getInitialsColor(name: string): string {
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function StatusBadge({ status }: { status: SAPlayer['status'] }) {
  const cfg = {
    active:    { label: 'Activo',     bg: '#dcfce7', color: '#166534' },
    blocked:   { label: 'Bloqueado',  bg: '#fee2e2', color: '#991b1b' },
    suspended: { label: 'Suspendido', bg: '#fef9c3', color: '#854d0e' },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: SAPlayer['role'] }) {
  const cfg = {
    player:           { label: 'Jugador',     bg: '#f0f0f0', color: '#444' },
    club_admin:       { label: 'Admin Club',  bg: '#ede9fe', color: '#5b21b6' },
    federation_admin: { label: 'Admin Fed',   bg: '#e0f2fe', color: '#0369a1' },
  }[role];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function LevelBadge({ level }: { level?: SAPlayer['level'] }) {
  if (!level) return <span style={{ color: 'var(--grey-300)', fontSize: 12 }}>—</span>;
  const cfg = {
    beginner:     { label: 'Principiante', bg: '#f0f0f0', color: '#555' },
    intermediate: { label: 'Intermedio',   bg: '#dbeafe', color: '#1d4ed8' },
    advanced:     { label: 'Avanzado',     bg: '#fef3c7', color: '#92400e' },
  }[level];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

// ── modal backdrop ────────────────────────────────────────────────────────────
function Modal({ children, onClose, maxWidth = 560 }: { children: React.ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 8, padding: '32px 36px',
        width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── form field ────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
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

// ── section header ────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }}>
      {label}
    </div>
  );
}

// ── info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--grey-100)', fontSize: 13 }}>
      <span style={{ color: 'var(--grey-500)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

// ── copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={handleCopy} style={{ marginLeft: 6, padding: '1px 7px', fontSize: 10, border: '1px solid var(--grey-200)', borderRadius: 3, cursor: 'pointer', background: copied ? '#dcfce7' : '#f9fafb', color: copied ? '#166534' : 'var(--grey-500)', fontWeight: 600, lineHeight: 1.6 }}>
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

// ── player form (create / edit) ───────────────────────────────────────────────
function PlayerForm({
  initial,
  customFields,
  onSave,
  onCancel,
  mode,
}: {
  initial: Partial<SAPlayer>;
  customFields: string[];
  onSave: (p: SAPlayer) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}) {
  const [form, setForm] = useState<Partial<SAPlayer>>({
    name: '', email: '', phone: '', city: '', country: 'ES',
    ranking: 0, rankingPoints: 0, role: 'player', status: 'active', club: '',
    sex: undefined, level: undefined, profileCompleted: true,
    photoUrl: '', customFields: {}, ...initial,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  function set(k: keyof SAPlayer, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function setCustom(field: string, v: string) {
    setForm(f => ({ ...f, customFields: { ...(f.customFields ?? {}), [field]: v } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString().split('T')[0];
    const password = newPassword.trim() ? newPassword.trim() : (form.password ?? undefined);
    onSave({
      id: form.id ?? uid(),
      shortId: form.shortId ?? `#${uid().slice(0, 5).toUpperCase()}`,
      name: form.name ?? '',
      email: form.email ?? '',
      password,
      phone: form.phone ?? '',
      sex: form.sex ?? undefined,
      city: form.city ?? '',
      country: form.country ?? 'ES',
      level: form.level ?? undefined,
      ranking: form.ranking ?? 0,
      rankingPoints: form.rankingPoints ?? 0,
      role: form.role ?? 'player',
      status: form.status ?? 'active',
      club: form.club ?? undefined,
      profileCompleted: form.profileCompleted ?? true,
      joinedAt: form.joinedAt ?? now,
      lastActive: form.lastActive ?? now,
      photoUrl: form.photoUrl ?? undefined,
      customFields: form.customFields ?? {},
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 20 }}>
        {mode === 'create' ? 'Nuevo Jugador' : 'Editar Jugador'}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Nombre completo">
          <input style={inputStyle} required value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" required value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Telefono">
          <input style={inputStyle} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
        </Field>
        <Field label="Sexo">
          <select style={inputStyle} value={form.sex ?? ''} onChange={e => set('sex', e.target.value === '' ? undefined : e.target.value as SAPlayer['sex'])}>
            <option value="">No especificar</option>
            <option value="M">Masculino (M)</option>
            <option value="F">Femenino (F)</option>
          </select>
        </Field>
        <Field label="Nivel de juego">
          <select style={inputStyle} value={form.level ?? ''} onChange={e => set('level', e.target.value === '' ? undefined : e.target.value as SAPlayer['level'])}>
            <option value="">Sin nivel</option>
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzado</option>
          </select>
        </Field>
        <Field label="Ciudad">
          <input style={inputStyle} value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Pais">
          <input style={inputStyle} value={form.country ?? ''} onChange={e => set('country', e.target.value)} />
        </Field>
        <Field label="Club">
          <select style={{ ...inputStyle, appearance: 'auto' }} value={form.club ?? ''} onChange={e => set('club', e.target.value)}>
            <option value="">— Sin club —</option>
            {getSAClubs().map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Posicion Ranking">
          <input style={inputStyle} type="number" min={0} value={form.ranking ?? 0} onChange={e => set('ranking', Number(e.target.value))} />
        </Field>
        <Field label="Puntos de Ranking">
          <input style={inputStyle} type="number" min={0} value={form.rankingPoints ?? 0} onChange={e => set('rankingPoints', Number(e.target.value))} />
        </Field>
        <Field label="Rol">
          <select style={inputStyle} value={form.role ?? 'player'} onChange={e => set('role', e.target.value as SAPlayer['role'])}>
            <option value="player">Jugador</option>
            <option value="club_admin">Admin Club</option>
            <option value="federation_admin">Admin Federacion</option>
          </select>
        </Field>
        <Field label="Estado">
          <select style={inputStyle} value={form.status ?? 'active'} onChange={e => set('status', e.target.value as SAPlayer['status'])}>
            <option value="active">Activo</option>
            <option value="blocked">Bloqueado</option>
            <option value="suspended">Suspendido</option>
          </select>
        </Field>
        <Field label="URL de foto">
          <input style={inputStyle} value={form.photoUrl ?? ''} onChange={e => set('photoUrl', e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Perfil completado">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
            <input type="checkbox" checked={form.profileCompleted ?? true} onChange={e => set('profileCompleted', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ fontSize: 13 }}>{form.profileCompleted ? 'Completo' : 'Incompleto'}</span>
          </div>
        </Field>
      </div>

      {/* Password section */}
      <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
          {mode === 'create' ? 'Contrasena' : 'Establecer nueva contrasena'}
        </div>
        {mode === 'edit' && form.password && (
          <Field label="Contrasena actual">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                readOnly
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#f9fafb', fontSize: 12, color: 'var(--grey-600)', fontWeight: 600, flexShrink: 0 }}>
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </Field>
        )}
        <div style={{ marginTop: 10 }}>
          <Field label={mode === 'create' ? 'Contrasena' : 'Nueva contrasena'}>
            <input
              style={inputStyle}
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
            Campos personalizados
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {customFields.map(f => (
              <Field key={f} label={f}>
                <input
                  style={inputStyle}
                  value={form.customFields?.[f] ?? ''}
                  onChange={e => setCustom(f, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}>
          Cancelar
        </button>
        <button type="submit" style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {mode === 'create' ? 'Crear Jugador' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function PlayersPage() {
  const [players, setPlayers] = useState<SAPlayer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'suspended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState<SAPlayer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; playerId: string } | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<{ step: number; playerId: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [showRelationshipModal, setShowRelationshipModal] = useState<{ playerId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  // CSV import state
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvFile, setCsvFile] = useState<string | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Custom field input
  const [newFieldName, setNewFieldName] = useState('');
  // Relationship state
  const [relSearch, setRelSearch] = useState('');
  const [relType, setRelType] = useState<PlayerRelationship['type']>('friend');
  // Detail drawer
  const [selectedPlayer, setSelectedPlayer] = useState<SAPlayer | null>(null);
  // Inline reset password in drawer
  const [showResetPwField, setShowResetPwField] = useState(false);
  const [resetPwValue, setResetPwValue] = useState('');
  const [showDrawerPassword, setShowDrawerPassword] = useState(false);
  // Sorting
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // Pagination
  const [page, setPage] = useState(1);
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ step: number } | null>(null);

  useEffect(() => {
    setPlayers(getSAPlayers());
    setCustomFields(getPlayerCustomFields());

    function fetchFromSupabase() {
      getSAPlayersFromSupabase().then(sbPlayers => {
        if (sbPlayers && sbPlayers.length > 0) {
          // Merge: Supabase is authoritative, but keep localStorage-only players
          // (seed players not yet uploaded) so no data is lost between sources.
          const local = getSAPlayers();
          const sbIds = new Set(sbPlayers.map(p => p.id));
          const sbEmails = new Set(sbPlayers.map(p => p.email.toLowerCase()));
          const localOnly = local.filter(
            p => !sbIds.has(p.id) && !sbEmails.has(p.email.toLowerCase()),
          );
          const merged = [...sbPlayers, ...localOnly];
          setPlayers(merged);
          saveSAPlayers(merged);
        }
      });
    }

    fetchFromSupabase();
    const interval = setInterval(fetchFromSupabase, 5000);
    return () => clearInterval(interval);
  }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function saveAndRefresh(updated: SAPlayer[]) {
    saveSAPlayers(updated);
    setPlayers(updated);
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

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    else if (sortKey === 'ranking') { av = a.ranking; bv = b.ranking; }
    else if (sortKey === 'rankingPoints') { av = a.rankingPoints; bv = b.rankingPoints; }
    else if (sortKey === 'joinedAt') { av = a.joinedAt; bv = b.joinedAt; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pagePlayers = sorted.slice(pageStart, pageEnd);

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

  // ── delete ─────────────────────────────────────────────────────────────────
  function handleDeleteStep1(playerId: string) { setDeleteConfirm({ step: 1, playerId }); }
  function handleDeleteStep2() {
    if (!deleteConfirm) return;
    setDeleteConfirm({ ...deleteConfirm, step: 2 });
  }
  function handleDeleteFinal() {
    if (!deleteConfirm) return;
    const updated = players.filter(p => p.id !== deleteConfirm.playerId);
    saveAndRefresh(updated);
    deleteSAPlayerFromSupabase(deleteConfirm.playerId);
    setDeleteConfirm(null);
    if (selectedPlayer?.id === deleteConfirm.playerId) setSelectedPlayer(null);
    toast('Jugador eliminado correctamente');
  }

  // ── block ──────────────────────────────────────────────────────────────────
  function handleBlockStep1(playerId: string) { setBlockConfirm({ step: 1, playerId }); }
  function handleBlockStep2() {
    if (!blockConfirm) return;
    setBlockConfirm({ ...blockConfirm, step: 2 });
  }
  function handleBlockFinal() {
    if (!blockConfirm) return;
    const updated = players.map(p => p.id === blockConfirm.playerId ? { ...p, status: 'blocked' as const } : p);
    saveAndRefresh(updated);
    if (selectedPlayer?.id === blockConfirm.playerId) setSelectedPlayer(prev => prev ? { ...prev, status: 'blocked' as const } : prev);
    setBlockConfirm(null);
    toast('Jugador bloqueado');
  }

  function handleUnblockPlayer(playerId: string) {
    const updated = players.map(p => p.id === playerId ? { ...p, status: 'active' as const } : p);
    saveAndRefresh(updated);
    if (selectedPlayer?.id === playerId) setSelectedPlayer(prev => prev ? { ...prev, status: 'active' as const } : prev);
    toast('Jugador desbloqueado');
  }

  // ── save player ────────────────────────────────────────────────────────────
  function handleSavePlayer(p: SAPlayer) {
    const exists = players.find(x => x.id === p.id);
    const updated = exists ? players.map(x => x.id === p.id ? p : x) : [p, ...players];
    saveAndRefresh(updated);
    upsertSAPlayerToSupabase(p);
    setShowCreateModal(false);
    setEditPlayer(null);
    if (selectedPlayer?.id === p.id) setSelectedPlayer(p);
    toast(exists ? 'Jugador actualizado' : 'Jugador creado correctamente');
  }

  // ── reset password inline ──────────────────────────────────────────────────
  function handleResetPasswordInline() {
    if (!selectedPlayer || !resetPwValue.trim()) return;
    const updated = players.map(p => p.id === selectedPlayer.id ? { ...p, password: resetPwValue.trim() } : p);
    saveAndRefresh(updated);
    setSelectedPlayer(prev => prev ? { ...prev, password: resetPwValue.trim() } : prev);
    setResetPwValue('');
    setShowResetPwField(false);
    toast('Contrasena actualizada');
  }

  // ── bulk ───────────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (pagePlayers.every(p => selectedIds.has(p.id))) {
      setSelectedIds(prev => { const next = new Set(prev); pagePlayers.forEach(p => next.delete(p.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); pagePlayers.forEach(p => next.add(p.id)); return next; });
    }
  }

  function handleBulkBlock() {
    const updated = players.map(p => selectedIds.has(p.id) ? { ...p, status: 'blocked' as const } : p);
    saveAndRefresh(updated);
    toast(`${selectedIds.size} jugadores bloqueados`);
    setSelectedIds(new Set());
  }

  function handleBulkDeleteStep1() { setBulkDeleteConfirm({ step: 1 }); }
  function handleBulkDeleteStep2() { setBulkDeleteConfirm({ step: 2 }); }
  function handleBulkDeleteFinal() {
    const ids = new Set(selectedIds);
    const updated = players.filter(p => !ids.has(p.id));
    ids.forEach(id => deleteSAPlayerFromSupabase(id));
    saveAndRefresh(updated);
    setBulkDeleteConfirm(null);
    setSelectedIds(new Set());
    toast(`${ids.size} jugadores eliminados`);
  }

  // ── CSV import ─────────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setCsvFile('xlsx');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n').filter(Boolean);
      const sep = lines[0].includes(';') ? ';' : ',';
      const rows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
      setCsvRows(rows);
      setCsvFile('csv');
      const headers = rows[0] ?? [];
      const map: Record<string, string> = {};
      const fieldMap: Record<string, string[]> = {
        name: ['nombre', 'name', 'jugador'],
        email: ['email', 'correo'],
        phone: ['telefono', 'phone', 'tel'],
        city: ['ciudad', 'city'],
        country: ['pais', 'country'],
        ranking: ['ranking', 'puntos', 'points'],
        club: ['club'],
      };
      headers.forEach((h, i) => {
        const hl = h.toLowerCase();
        for (const [field, keys] of Object.entries(fieldMap)) {
          if (keys.some(k => hl.includes(k))) { map[String(i)] = field; break; }
        }
      });
      setColumnMap(map);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csvRows.length) return;
    const headers = csvRows[0];
    const now = new Date().toISOString().split('T')[0];
    const reverseMap: Record<string, number> = {};
    Object.entries(columnMap).forEach(([idx, field]) => { reverseMap[field] = Number(idx); });

    const newPlayers: SAPlayer[] = csvRows.slice(1).map((row, i) => ({
      id: uid(),
      shortId: `#${String(i + 1).padStart(5, '0')}`,
      name: row[reverseMap['name']] ?? '',
      email: row[reverseMap['email']] ?? '',
      phone: row[reverseMap['phone']] ?? '',
      city: row[reverseMap['city']] ?? '',
      country: row[reverseMap['country']] ?? 'ES',
      ranking: Number(row[reverseMap['ranking']]) || 0,
      rankingPoints: 0,
      club: row[reverseMap['club']] ?? undefined,
      status: 'active' as const,
      role: 'player' as const,
      joinedAt: now,
      lastActive: now,
      customFields: {},
    })).filter(p => p.name && p.email);

    const emails = new Set(players.map(p => p.email));
    const unique = newPlayers.filter(p => !emails.has(p.email));
    const updated = [...players, ...unique];
    saveAndRefresh(updated);
    setShowImportModal(false);
    setCsvRows([]);
    setCsvFile(null);
    toast(`${unique.length} jugadores importados correctamente`);
    void headers;
  }

  // ── custom fields ──────────────────────────────────────────────────────────
  function addCustomField() {
    if (!newFieldName.trim() || customFields.includes(newFieldName.trim())) return;
    const updated = [...customFields, newFieldName.trim()];
    setCustomFields(updated);
    savePlayerCustomFields(updated);
    setNewFieldName('');
    toast('Campo personalizado agregado');
  }
  function removeCustomField(f: string) {
    const updated = customFields.filter(x => x !== f);
    setCustomFields(updated);
    savePlayerCustomFields(updated);
    toast('Campo eliminado');
  }

  // ── relationships ──────────────────────────────────────────────────────────
  function getRelationships(playerId: string) {
    return getPlayerRelationships().filter(r => r.playerId === playerId || r.relatedPlayerId === playerId);
  }
  function addRelationship(playerId: string, relatedId: string, type: PlayerRelationship['type']) {
    const existing = getPlayerRelationships();
    const dup = existing.find(r =>
      (r.playerId === playerId && r.relatedPlayerId === relatedId) ||
      (r.playerId === relatedId && r.relatedPlayerId === playerId)
    );
    if (dup) { toast('Relacion ya existente', false); return; }
    const updated: PlayerRelationship[] = [...existing, {
      id: uid(), playerId, relatedPlayerId: relatedId, type,
      createdAt: new Date().toISOString(),
    }];
    savePlayerRelationships(updated);
    toast('Relacion agregada');
  }
  function removeRelationship(relId: string) {
    const updated = getPlayerRelationships().filter(r => r.id !== relId);
    savePlayerRelationships(updated);
    toast('Relacion eliminada');
  }

  const playerById = Object.fromEntries(players.map(p => [p.id, p]));
  const deleteTarget = deleteConfirm ? playerById[deleteConfirm.playerId] : null;
  const blockTarget = blockConfirm ? playerById[blockConfirm.playerId] : null;

  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', fontFamily: 'var(--font-body)' };
  const allOnPageSelected = pagePlayers.length > 0 && pagePlayers.every(p => selectedIds.has(p.id));

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-body)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.ok ? '#0a0a0a' : '#dc2626',
            color: '#fff', padding: '12px 20px', borderRadius: 6, fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            borderLeft: `3px solid ${t.ok ? 'var(--turf-green)' : '#fca5a5'}`,
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Gestion</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Jugadores</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowCustomFieldModal(true)} style={{ padding: '9px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--grey-600)', textTransform: 'uppercase' }}>
            Campos
          </button>
          <button onClick={() => setShowImportModal(true)} style={{ padding: '9px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--grey-600)', textTransform: 'uppercase' }}>
            Importar CSV
          </button>
          <button
            onClick={() => exportCSV(filtered.map(p => ({ ID: p.id, ShortID: p.shortId, Nombre: p.name, Email: p.email, Telefono: p.phone, Sexo: p.sex ?? '', Nivel: p.level ?? '', Ciudad: p.city, Pais: p.country, RankingPos: p.ranking, PtsRanking: p.rankingPoints, Club: p.club ?? '', Rol: p.role, Estado: p.status, Perfil: p.profileCompleted ? 'Completo' : 'Incompleto', Ingreso: p.joinedAt, UltActivo: p.lastActive })), 'jugadores.csv')}
            style={{ padding: '9px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--grey-600)', textTransform: 'uppercase' }}
          >
            Exportar CSV
          </button>
          <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
            + Nuevo Jugador
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 280, flex: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          style={{ ...inputStyle, width: 160 }}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="blocked">Bloqueados</option>
          <option value="suspended">Suspendidos</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--grey-400)', display: 'flex', alignItems: 'center' }}>
          {filtered.length} jugador{filtered.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                <th style={{ padding: '10px 14px', width: 36 }}>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ ...thStyle, cursor: 'default' }}>#ID</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Short ID</th>
                <th onClick={() => handleSort('name')} style={thStyle}>Nombre + Email <SortIcon col="name" /></th>
                <th style={{ ...thStyle, cursor: 'default' }}>Sexo</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Nivel</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Ciudad / Pais</th>
                <th onClick={() => handleSort('ranking')} style={thStyle}>Ranking Pos. <SortIcon col="ranking" /></th>
                <th onClick={() => handleSort('rankingPoints')} style={thStyle}>Pts Ranking <SortIcon col="rankingPoints" /></th>
                <th style={{ ...thStyle, cursor: 'default' }}>Club</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Rol</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Estado</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Perfil %</th>
                <th onClick={() => handleSort('joinedAt')} style={thStyle}>Ingreso <SortIcon col="joinedAt" /></th>
                <th style={{ ...thStyle, cursor: 'default' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagePlayers.map((p) => {
                const shortUuid = p.id.slice(0, 8);
                return (
                  <tr key={p.id}
                    style={{ borderBottom: '1px solid var(--grey-100)', transition: 'background 0.1s', cursor: 'pointer', background: selectedIds.has(p.id) ? '#f0fdf4' : '#fff' }}
                    onClick={() => setSelectedPlayer(p)}
                    onMouseEnter={e => { if (!selectedIds.has(p.id)) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = selectedIds.has(p.id) ? '#f0fdf4' : '#fff'; }}
                  >
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <span
                        onClick={() => { navigator.clipboard.writeText(p.id); toast('ID copiado'); }}
                        title={p.id}
                        style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--grey-400)', cursor: 'pointer', background: 'var(--grey-50)', padding: '2px 6px', borderRadius: 3 }}
                      >
                        {shortUuid}...
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{p.shortId}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--black)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: p.sex ? 'var(--black)' : 'var(--grey-300)', fontWeight: p.sex ? 600 : 400 }}>{p.sex ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}><LevelBadge level={p.level} /></td>
                    <td style={{ padding: '10px 14px', color: 'var(--grey-600)', whiteSpace: 'nowrap' }}>{p.city}{p.city && p.country ? ' / ' : ''}{p.country}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap' }}>#{p.ranking}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--grey-600)', whiteSpace: 'nowrap' }}>{p.rankingPoints.toLocaleString()} pts</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.club ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}><RoleBadge role={p.role} /></td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.profileCompleted
                        ? <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>Completo</span>
                        : <span style={{ background: '#f0f0f0', color: '#888', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500 }}>Incompleto</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{p.joinedAt}</td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button title="Relaciones" onClick={() => setShowRelationshipModal({ playerId: p.id })}
                          style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-500)' }}>
                          REL
                        </button>
                        <button title="Editar" onClick={() => setEditPlayer(p)}
                          style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>
                          EDT
                        </button>
                        {p.status !== 'blocked' ? (
                          <button title="Bloquear" onClick={() => handleBlockStep1(p.id)}
                            style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
                            BLQ
                          </button>
                        ) : (
                          <button title="Desbloquear" onClick={() => handleUnblockPlayer(p.id)}
                            style={{ background: 'none', border: '1px solid #bbf7d0', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#166534' }}>
                            UBL
                          </button>
                        )}
                        <button title="Eliminar" onClick={() => handleDeleteStep1(p.id)}
                          style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
                          DEL
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagePlayers.length === 0 && (
                <tr>
                  <td colSpan={15} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
                    No se encontraron jugadores
                  </td>
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', color: '#fff', padding: '14px 24px', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'center', zIndex: 900, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
          <span style={{ color: '#555' }}>—</span>
          <button
            onClick={() => exportCSV(players.filter(p => selectedIds.has(p.id)).map(p => ({ ID: p.id, ShortID: p.shortId, Nombre: p.name, Email: p.email, Telefono: p.phone, Sexo: p.sex ?? '', Nivel: p.level ?? '', Ciudad: p.city, Pais: p.country, RankingPos: p.ranking, PtsRanking: p.rankingPoints, Club: p.club ?? '', Rol: p.role, Estado: p.status, Ingreso: p.joinedAt })), 'jugadores_seleccion.csv')}
            style={{ background: 'none', border: '1px solid #555', borderRadius: 4, color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Exportar seleccion
          </button>
          <button onClick={handleBulkBlock} style={{ background: 'none', border: '1px solid #f59e0b', borderRadius: 4, color: '#f59e0b', padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Bloquear seleccion
          </button>
          <button onClick={handleBulkDeleteStep1} style={{ background: 'none', border: '1px solid #ef4444', borderRadius: 4, color: '#ef4444', padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Eliminar seleccion
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 0 0 8px' }}>×</button>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedPlayer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1009 }} onClick={() => setSelectedPlayer(null)} />
          <div
            style={{ position: 'fixed', top: 0, right: 0, width: 520, height: '100vh', background: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', zIndex: 1010, overflowY: 'auto', padding: '32px 36px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button onClick={() => setSelectedPlayer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', lineHeight: 1 }}>×</button>
            </div>

            {/* Section 1 — Identidad */}
            <div style={{ marginBottom: 24 }}>
              <SectionHeader label="Identidad" />
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {selectedPlayer.photoUrl ? (
                  <img src={selectedPlayer.photoUrl} alt={selectedPlayer.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: getInitialsColor(selectedPlayer.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                    {selectedPlayer.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selectedPlayer.name}</h2>
                  <span style={{ display: 'inline-block', background: 'var(--grey-100)', color: 'var(--grey-600)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'monospace', marginBottom: 6 }}>{selectedPlayer.shortId}</span>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ wordBreak: 'break-all' }}>{selectedPlayer.id}</span>
                    <CopyButton text={selectedPlayer.id} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatusBadge status={selectedPlayer.status} />
              <RoleBadge role={selectedPlayer.role} />
              <LevelBadge level={selectedPlayer.level} />
            </div>

            {/* Section 2 — Datos Personales */}
            <div style={{ marginBottom: 20 }}>
              <SectionHeader label="Datos Personales" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <InfoRow label="Email">
                  <a href={`mailto:${selectedPlayer.email}`} style={{ color: 'var(--turf-green)', textDecoration: 'none', fontWeight: 600, fontSize: 12, wordBreak: 'break-all' }}>{selectedPlayer.email || '—'}</a>
                </InfoRow>
                <InfoRow label="Telefono"><span>{selectedPlayer.phone || '—'}</span></InfoRow>
                <InfoRow label="Sexo"><span>{selectedPlayer.sex === 'M' ? 'Masculino' : selectedPlayer.sex === 'F' ? 'Femenino' : 'No especificado'}</span></InfoRow>
                <InfoRow label="Nivel">
                  <span>{selectedPlayer.level === 'beginner' ? 'Principiante' : selectedPlayer.level === 'intermediate' ? 'Intermedio' : selectedPlayer.level === 'advanced' ? 'Avanzado' : '—'}</span>
                </InfoRow>
                <InfoRow label="Ciudad"><span>{selectedPlayer.city || '—'}</span></InfoRow>
                <InfoRow label="Pais"><span>{selectedPlayer.country || '—'}</span></InfoRow>
              </div>
              <InfoRow label="Perfil completado">
                {selectedPlayer.profileCompleted
                  ? <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>Si</span>
                  : <span style={{ background: '#f0f0f0', color: '#888', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500 }}>No</span>
                }
              </InfoRow>
            </div>

            {/* Section 3 — Ranking */}
            <div style={{ marginBottom: 20 }}>
              <SectionHeader label="Ranking" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                <div style={{ background: 'var(--grey-50)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Posicion</div>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--turf-green)' }}>#{selectedPlayer.ranking}</div>
                </div>
                <div style={{ background: 'var(--grey-50)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Puntos</div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#3b82f6' }}>{selectedPlayer.rankingPoints.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>pts</div>
                </div>
              </div>
              {selectedPlayer.club && <InfoRow label="Club"><span>{selectedPlayer.club}</span></InfoRow>}
            </div>

            {/* Section 4 — Sistema */}
            <div style={{ marginBottom: 20 }}>
              <SectionHeader label="Sistema" />
              <div style={{ background: 'var(--grey-50)', padding: '8px 12px', borderRadius: 4, marginBottom: 8, fontFamily: 'monospace', fontSize: 11, color: 'var(--grey-500)', wordBreak: 'break-all' }}>
                {selectedPlayer.id}
                <CopyButton text={selectedPlayer.id} />
              </div>
              <InfoRow label="Estado"><StatusBadge status={selectedPlayer.status} /></InfoRow>
              <InfoRow label="Rol"><RoleBadge role={selectedPlayer.role} /></InfoRow>
              <InfoRow label="Fecha de ingreso"><span>{selectedPlayer.joinedAt}</span></InfoRow>
              <InfoRow label="Ultima actividad"><span>{selectedPlayer.lastActive}</span></InfoRow>
            </div>

            {/* Section 5 — Campos Personalizados */}
            {customFields.length > 0 && selectedPlayer.customFields && Object.keys(selectedPlayer.customFields).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader label="Campos Personalizados" />
                {customFields.filter(f => selectedPlayer.customFields?.[f]).map(f => (
                  <InfoRow key={f} label={f}><span>{selectedPlayer.customFields?.[f]}</span></InfoRow>
                ))}
              </div>
            )}

            {/* Section 6 — Relaciones */}
            {(() => {
              const rels = getRelationships(selectedPlayer.id);
              const relTypeLabels: Record<PlayerRelationship['type'], string> = { friend: 'Amigo', rival: 'Rival', teammate: 'Companero' };
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <SectionHeader label="Relaciones" />
                    <button
                      onClick={() => setShowRelationshipModal({ playerId: selectedPlayer.id })}
                      style={{ fontSize: 11, fontWeight: 700, color: 'var(--turf-green)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}
                    >
                      + Agregar
                    </button>
                  </div>
                  {rels.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic' }}>Sin relaciones registradas.</div>
                  ) : rels.map(r => {
                    const otherId = r.playerId === selectedPlayer.id ? r.relatedPlayerId : r.playerId;
                    const other = playerById[otherId];
                    return (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--grey-100)' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{other?.name ?? otherId}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--grey-400)', background: 'var(--grey-100)', padding: '2px 8px', borderRadius: 10 }}>{relTypeLabels[r.type]}</span>
                          <button onClick={() => removeRelationship(r.id)}
                            style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Reset password inline */}
            {showResetPwField && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--grey-50)', borderRadius: 6, border: '1px solid var(--grey-200)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Nueva Contrasena</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type={showDrawerPassword ? 'text' : 'password'}
                    value={resetPwValue}
                    onChange={e => setResetPwValue(e.target.value)}
                    placeholder="Nueva contrasena..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="button" onClick={() => setShowDrawerPassword(v => !v)}
                    style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 12, color: 'var(--grey-600)', fontWeight: 600, flexShrink: 0 }}>
                    {showDrawerPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={handleResetPasswordInline}
                    style={{ flex: 1, padding: '8px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Guardar contrasena
                  </button>
                  <button onClick={() => { setShowResetPwField(false); setResetPwValue(''); }}
                    style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setEditPlayer(selectedPlayer); }}
                style={{ padding: '10px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Editar
              </button>
              {selectedPlayer.status !== 'blocked' ? (
                <button onClick={() => handleBlockStep1(selectedPlayer.id)}
                  style={{ padding: '10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Bloquear
                </button>
              ) : (
                <button onClick={() => handleUnblockPlayer(selectedPlayer.id)}
                  style={{ padding: '10px', background: 'transparent', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Desbloquear
                </button>
              )}
              <button onClick={() => { setShowResetPwField(v => !v); setResetPwValue(''); }}
                style={{ padding: '10px', background: 'transparent', color: 'var(--grey-600)', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Resetear Contrasena
              </button>
              <button onClick={() => handleDeleteStep1(selectedPlayer.id)}
                style={{ padding: '10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Eliminar Jugador
              </button>
              <button onClick={() => setSelectedPlayer(null)} style={{ padding: '10px', background: 'var(--grey-50)', color: 'var(--grey-600)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} maxWidth={640}>
          <PlayerForm
            mode="create"
            initial={{}}
            customFields={customFields}
            onSave={handleSavePlayer}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editPlayer && (
        <Modal onClose={() => setEditPlayer(null)} maxWidth={640}>
          <PlayerForm
            mode="edit"
            initial={editPlayer}
            customFields={customFields}
            onSave={handleSavePlayer}
            onCancel={() => setEditPlayer(null)}
          />
        </Modal>
      )}

      {/* DELETE STEP 1 */}
      {deleteConfirm?.step === 1 && deleteTarget && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Eliminar Jugador</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas seguro de que deseas eliminar a <strong>{deleteTarget.name}</strong>? Esta accion no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleDeleteStep2} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Si, eliminar</button>
          </div>
        </Modal>
      )}

      {/* DELETE STEP 2 */}
      {deleteConfirm?.step === 2 && deleteTarget && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12, color: '#dc2626' }}>Confirmar eliminacion definitiva</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas COMPLETAMENTE seguro? Se eliminaran todos los datos de <strong>{deleteTarget.name}</strong> de forma permanente.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleDeleteFinal} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
              Confirmar eliminacion definitiva
            </button>
          </div>
        </Modal>
      )}

      {/* BLOCK STEP 1 */}
      {blockConfirm?.step === 1 && blockTarget && (
        <Modal onClose={() => setBlockConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Bloquear Jugador</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Deseas bloquear a <strong>{blockTarget.name}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setBlockConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleBlockStep2} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Continuar</button>
          </div>
        </Modal>
      )}

      {/* BLOCK STEP 2 */}
      {blockConfirm?.step === 2 && blockTarget && (
        <Modal onClose={() => setBlockConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12, color: '#dc2626' }}>Confirmar Bloqueo</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas el bloqueo de <strong>{blockTarget.name}</strong>? No podra acceder a la plataforma.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setBlockConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleBlockFinal} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Confirmar bloqueo
            </button>
          </div>
        </Modal>
      )}

      {/* BULK DELETE STEP 1 */}
      {bulkDeleteConfirm?.step === 1 && (
        <Modal onClose={() => setBulkDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Eliminar {selectedIds.size} Jugadores</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas seguro de que deseas eliminar {selectedIds.size} jugadores? Esta accion no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setBulkDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleBulkDeleteStep2} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Si, eliminar</button>
          </div>
        </Modal>
      )}

      {/* BULK DELETE STEP 2 */}
      {bulkDeleteConfirm?.step === 2 && (
        <Modal onClose={() => setBulkDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12, color: '#dc2626' }}>Confirmar eliminacion definitiva de {selectedIds.size} jugadores</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas la eliminacion definitiva de {selectedIds.size} jugadores? Se borraran todos sus datos permanentemente.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setBulkDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleBulkDeleteFinal} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Confirmar eliminacion definitiva
            </button>
          </div>
        </Modal>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <Modal onClose={() => { setShowImportModal(false); setCsvRows([]); setCsvFile(null); }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>Importar Jugadores — CSV</h2>

          {!csvFile && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--grey-300)',
                borderRadius: 8,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'var(--grey-400)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Arrastra un archivo CSV o haz clic para seleccionar</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Formatos: .csv (separado por coma o punto y coma)</div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>
          )}

          {csvFile === 'xlsx' && (
            <div style={{ padding: '20px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, color: '#9a3412', fontSize: 13, marginBottom: 16 }}>
              Soporte XLSX proximamente — usa CSV por ahora. Puedes exportar desde Excel como CSV.
            </div>
          )}

          {csvFile === 'csv' && csvRows.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 10 }}>
                Vista previa (primeras 5 filas)
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--grey-200)', borderRadius: 4, marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {csvRows.slice(0, 6).map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--grey-100)', background: ri === 0 ? 'var(--grey-50)' : '#fff' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '6px 10px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: ri === 0 ? 700 : 400 }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 10 }}>
                Mapeo de columnas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {(csvRows[0] ?? []).map((header, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--grey-600)', minWidth: 80, fontWeight: 600 }}>{header}</span>
                    <select
                      value={columnMap[String(idx)] ?? ''}
                      onChange={e => setColumnMap(m => ({ ...m, [String(idx)]: e.target.value }))}
                      style={{ ...inputStyle, flex: 1, padding: '5px 8px' }}
                    >
                      <option value="">— Ignorar —</option>
                      <option value="name">Nombre</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefono</option>
                      <option value="city">Ciudad</option>
                      <option value="country">Pais</option>
                      <option value="ranking">Ranking</option>
                      <option value="club">Club</option>
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setCsvRows([]); setCsvFile(null); }} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Volver</button>
                <button onClick={handleImport} style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Importar {csvRows.length - 1} jugadores
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* CUSTOM FIELDS MODAL */}
      {showCustomFieldModal && (
        <Modal onClose={() => setShowCustomFieldModal(false)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>Campos Personalizados</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {customFields.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '12px 0' }}>No hay campos personalizados creados.</div>
            )}
            {customFields.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, background: 'var(--grey-50)' }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{f}</span>
                <button onClick={() => removeCustomField(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 700, padding: '2px 6px' }}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              placeholder="Nombre del campo..."
              value={newFieldName}
              onChange={e => setNewFieldName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomField(); } }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addCustomField} style={{ padding: '8px 16px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Agregar
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCustomFieldModal(false)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13 }}>Cerrar</button>
          </div>
        </Modal>
      )}

      {/* RELATIONSHIPS MODAL */}
      {showRelationshipModal && (
        <Modal onClose={() => { setShowRelationshipModal(null); setRelSearch(''); }}>
          {(() => {
            const player = playerById[showRelationshipModal.playerId];
            const rels = getRelationships(showRelationshipModal.playerId);
            const relPlayers = players.filter(p =>
              p.id !== showRelationshipModal.playerId &&
              (relSearch ? p.name.toLowerCase().includes(relSearch.toLowerCase()) || p.email.toLowerCase().includes(relSearch.toLowerCase()) : false)
            );
            const relTypeLabels: Record<PlayerRelationship['type'], string> = { friend: 'Amigo', rival: 'Rival', teammate: 'Companero habitual' };
            return (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 4 }}>Relaciones</h2>
                <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 20 }}>{player?.name}</div>

                {rels.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>Relaciones actuales</div>
                    {rels.map(r => {
                      const otherId = r.playerId === showRelationshipModal.playerId ? r.relatedPlayerId : r.playerId;
                      const other = playerById[otherId];
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, marginBottom: 6, background: 'var(--grey-50)' }}>
                          <span style={{ flex: 1, fontSize: 13 }}><strong>{other?.name ?? otherId}</strong> — {relTypeLabels[r.type]}</span>
                          <button onClick={() => { removeRelationship(r.id); setShowRelationshipModal({ playerId: showRelationshipModal.playerId }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}>
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>Agregar relacion</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <input
                    placeholder="Buscar jugador..."
                    value={relSearch}
                    onChange={e => setRelSearch(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select value={relType} onChange={e => setRelType(e.target.value as PlayerRelationship['type'])} style={{ ...inputStyle, width: 160 }}>
                    <option value="friend">Amigo</option>
                    <option value="rival">Rival</option>
                    <option value="teammate">Companero habitual</option>
                  </select>
                </div>
                {relSearch && (
                  <div style={{ border: '1px solid var(--grey-200)', borderRadius: 4, maxHeight: 180, overflowY: 'auto', marginBottom: 16 }}>
                    {relPlayers.length === 0 && <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--grey-400)' }}>Sin resultados</div>}
                    {relPlayers.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--grey-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <span style={{ fontSize: 13 }}>{p.name} <span style={{ color: 'var(--grey-400)' }}>({p.email})</span></span>
                        <button onClick={() => { addRelationship(showRelationshipModal.playerId, p.id, relType); setRelSearch(''); }}
                          style={{ padding: '4px 12px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowRelationshipModal(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13 }}>Cerrar</button>
                </div>
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
