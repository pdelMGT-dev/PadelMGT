'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getSAPlayers,
  saveSAPlayers,
  getPlayerCustomFields,
  savePlayerCustomFields,
  getPlayerRelationships,
  savePlayerRelationships,
  type SAPlayer,
  type PlayerRelationship,
} from '@/lib/superadmin-data';

// ── helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

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

// ── modal backdrop ────────────────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
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
    ranking: 0, role: 'player', status: 'active', club: '',
    customFields: {}, ...initial,
  });

  function set(k: keyof SAPlayer, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function setCustom(field: string, v: string) {
    setForm(f => ({ ...f, customFields: { ...(f.customFields ?? {}), [field]: v } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString().split('T')[0];
    onSave({
      id: form.id ?? uid(),
      name: form.name ?? '',
      email: form.email ?? '',
      phone: form.phone ?? '',
      city: form.city ?? '',
      country: form.country ?? 'ES',
      ranking: form.ranking ?? 0,
      role: form.role ?? 'player',
      status: form.status ?? 'active',
      club: form.club ?? undefined,
      joinedAt: form.joinedAt ?? now,
      lastActive: form.lastActive ?? now,
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
        <Field label="Club">
          <input style={inputStyle} value={form.club ?? ''} onChange={e => set('club', e.target.value)} />
        </Field>
        <Field label="Ciudad">
          <input style={inputStyle} value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Pais">
          <input style={inputStyle} value={form.country ?? ''} onChange={e => set('country', e.target.value)} />
        </Field>
        <Field label="Ranking (pts)">
          <input style={inputStyle} type="number" value={form.ranking ?? 0} onChange={e => set('ranking', Number(e.target.value))} />
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

      {mode === 'create' && (
        <Field label="Contrasena temporal">
          <input style={inputStyle} type="password" placeholder="••••••••" />
        </Field>
      )}
      {mode === 'edit' && (
        <div style={{ fontSize: 12, color: 'var(--grey-400)', fontStyle: 'italic' }}>
          Para resetear la contrasena, usa la opcion correspondiente desde el perfil del jugador.
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

  useEffect(() => {
    setPlayers(getSAPlayers());
    setCustomFields(getPlayerCustomFields());
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

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
    setDeleteConfirm(null);
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
    setBlockConfirm(null);
    toast('Jugador bloqueado');
  }

  // ── save player ────────────────────────────────────────────────────────────
  function handleSavePlayer(p: SAPlayer) {
    const exists = players.find(x => x.id === p.id);
    const updated = exists ? players.map(x => x.id === p.id ? p : x) : [p, ...players];
    saveAndRefresh(updated);
    setShowCreateModal(false);
    setEditPlayer(null);
    toast(exists ? 'Jugador actualizado' : 'Jugador creado correctamente');
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
      // auto-map columns
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

    const newPlayers: SAPlayer[] = csvRows.slice(1).map(row => ({
      id: uid(),
      name: row[reverseMap['name']] ?? '',
      email: row[reverseMap['email']] ?? '',
      phone: row[reverseMap['phone']] ?? '',
      city: row[reverseMap['city']] ?? '',
      country: row[reverseMap['country']] ?? 'ES',
      ranking: Number(row[reverseMap['ranking']]) || 0,
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
    void headers; // suppress unused warning
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
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 280, flex: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
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
                {['#', 'Jugador', 'Ciudad / Pais', 'Ranking', 'Club', 'Estado', 'Rol', 'Ingreso', 'Ult. Actividad', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--grey-100)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <td style={{ padding: '10px 14px', color: 'var(--grey-400)', fontWeight: 500 }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--black)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--grey-600)', whiteSpace: 'nowrap' }}>{p.city}{p.city && p.country ? ' / ' : ''}{p.country}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--black)' }}>{p.ranking.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>{p.club ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '10px 14px' }}><RoleBadge role={p.role} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{p.joinedAt}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{p.lastActive}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button title="Relaciones" onClick={() => setShowRelationshipModal({ playerId: p.id })}
                        style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-500)' }}>
                        REL
                      </button>
                      <button title="Editar" onClick={() => setEditPlayer(p)}
                        style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>
                        EDT
                      </button>
                      {p.status !== 'blocked' && (
                        <button title="Bloquear" onClick={() => handleBlockStep1(p.id)}
                          style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
                          BLQ
                        </button>
                      )}
                      <button title="Eliminar" onClick={() => handleDeleteStep1(p.id)}
                        style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
                        DEL
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
                    No se encontraron jugadores
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
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
        <Modal onClose={() => setEditPlayer(null)}>
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
