'use client';

import React, { useState, useEffect } from 'react';
import { getSAClubs, saveSAClubs, getSAClubsFromSupabase, upsertSAClubToSupabase, deleteSAClubFromSupabase, type SAClub } from '@/lib/superadmin-data';

function uid() { return Math.random().toString(36).slice(2, 10); }

const PAGE_SIZE = 15;

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
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
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
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: SAClub['status'] }) {
  const cfg = {
    active:   { label: 'Activo',   bg: '#dcfce7', color: '#166534' },
    inactive: { label: 'Inactivo', bg: '#f0f0f0', color: '#555' },
    pending:  { label: 'Pendiente',bg: '#fef9c3', color: '#854d0e' },
    rejected: { label: 'Rechazado',bg: '#fee2e2', color: '#991b1b' },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: SAClub['plan'] }) {
  const cfg = {
    free:  { label: 'Free',  bg: '#f0f0f0', color: '#555' },
    basic: { label: 'Basic', bg: '#e0f2fe', color: '#0369a1' },
    pro:   { label: 'Pro',   bg: '#fef3c7', color: '#92400e' },
  }[plan];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function ClubForm({
  initial,
  onSave,
  onCancel,
  mode,
}: {
  initial: Partial<SAClub>;
  onSave: (c: SAClub) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}) {
  const [form, setForm] = useState<Partial<SAClub>>({
    name: '', city: '', country: 'ES', courts: 0, members: 0,
    status: 'pending', adminEmail: '', plan: 'free', ...initial,
  });

  function set(k: keyof SAClub, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString().split('T')[0];
    onSave({
      id: form.id ?? uid(),
      name: form.name ?? '',
      city: form.city ?? '',
      country: form.country ?? 'ES',
      courts: form.courts ?? 0,
      members: form.members ?? 0,
      status: form.status ?? 'pending',
      adminEmail: form.adminEmail ?? '',
      joinedAt: form.joinedAt ?? now,
      plan: form.plan ?? 'free',
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 20 }}>
        {mode === 'create' ? 'Nuevo Club' : 'Editar Club'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Nombre del Club">
          <input style={inputStyle} required value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Email del Admin">
          <input style={inputStyle} type="email" value={form.adminEmail ?? ''} onChange={e => set('adminEmail', e.target.value)} />
        </Field>
        <Field label="Ciudad">
          <input style={inputStyle} value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Pais">
          <input style={inputStyle} value={form.country ?? ''} onChange={e => set('country', e.target.value)} />
        </Field>
        <Field label="Canchas">
          <input style={inputStyle} type="number" min={0} value={form.courts ?? 0} onChange={e => set('courts', Number(e.target.value))} />
        </Field>
        <Field label="Miembros">
          <input style={inputStyle} type="number" min={0} value={form.members ?? 0} onChange={e => set('members', Number(e.target.value))} />
        </Field>
        <Field label="Plan">
          <select style={inputStyle} value={form.plan ?? 'free'} onChange={e => set('plan', e.target.value as SAClub['plan'])}>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
        </Field>
        <Field label="Estado">
          <select style={inputStyle} value={form.status ?? 'pending'} onChange={e => set('status', e.target.value as SAClub['status'])}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="pending">Pendiente</option>
            <option value="rejected">Rechazado</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
        <button type="submit" style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {mode === 'create' ? 'Crear Club' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<SAClub[]>([]);
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editClub, setEditClub] = useState<SAClub | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; clubId: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ step: number; clubId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [selectedClub, setSelectedClub] = useState<SAClub | null>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setClubs(getSAClubs());
    getSAClubsFromSupabase().then(sbClubs => {
      if (sbClubs && sbClubs.length > 0) {
        setClubs(sbClubs);
        saveSAClubs(sbClubs);
      }
    });
  }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function saveAndRefresh(updated: SAClub[]) {
    saveSAClubs(updated);
    setClubs(updated);
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

  function handleSaveClub(c: SAClub) {
    const exists = clubs.find(x => x.id === c.id);
    const updated = exists ? clubs.map(x => x.id === c.id ? c : x) : [c, ...clubs];
    saveAndRefresh(updated);
    upsertSAClubToSupabase(c);
    setShowCreateModal(false);
    setEditClub(null);
    if (selectedClub?.id === c.id) setSelectedClub(c);
    toast(exists ? 'Club actualizado' : 'Club creado correctamente');
  }

  function handleApprove(clubId: string) {
    const updated = clubs.map(c => c.id === clubId ? { ...c, status: 'active' as const } : c);
    saveAndRefresh(updated);
    if (selectedClub?.id === clubId) setSelectedClub(prev => prev ? { ...prev, status: 'active' as const } : prev);
    toast('Club aprobado');
  }

  function handleRejectStep1(clubId: string) { setRejectConfirm({ step: 1, clubId }); }
  function handleRejectStep2() { if (!rejectConfirm) return; setRejectConfirm({ ...rejectConfirm, step: 2 }); }
  function handleRejectFinal() {
    if (!rejectConfirm) return;
    const updated = clubs.map(c => c.id === rejectConfirm.clubId ? { ...c, status: 'rejected' as const } : c);
    saveAndRefresh(updated);
    if (selectedClub?.id === rejectConfirm.clubId) setSelectedClub(prev => prev ? { ...prev, status: 'rejected' as const } : prev);
    setRejectConfirm(null);
    toast('Club rechazado');
  }

  function handleDeleteStep1(clubId: string) { setDeleteConfirm({ step: 1, clubId }); }
  function handleDeleteStep2() { if (!deleteConfirm) return; setDeleteConfirm({ ...deleteConfirm, step: 2 }); }
  function handleDeleteFinal() {
    if (!deleteConfirm) return;
    const updated = clubs.filter(c => c.id !== deleteConfirm.clubId);
    saveAndRefresh(updated);
    deleteSAClubFromSupabase(deleteConfirm.clubId);
    if (selectedClub?.id === deleteConfirm.clubId) setSelectedClub(null);
    setDeleteConfirm(null);
    toast('Club eliminado');
  }

  function handleToggleActive(clubId: string) {
    const club = clubs.find(c => c.id === clubId);
    if (!club) return;
    const newStatus: SAClub['status'] = club.status === 'active' ? 'inactive' : 'active';
    const updated = clubs.map(c => c.id === clubId ? { ...c, status: newStatus } : c);
    saveAndRefresh(updated);
    if (selectedClub?.id === clubId) setSelectedClub(prev => prev ? { ...prev, status: newStatus } : prev);
    toast(newStatus === 'active' ? 'Club activado' : 'Club desactivado');
  }

  function handleChangePlan(clubId: string, plan: SAClub['plan']) {
    const updated = clubs.map(c => c.id === clubId ? { ...c, plan } : c);
    saveAndRefresh(updated);
    if (selectedClub?.id === clubId) setSelectedClub(prev => prev ? { ...prev, plan } : prev);
    toast('Plan actualizado');
  }

  const pending = clubs.filter(c => c.status === 'pending');

  const baseList = tab === 'pending' ? pending : clubs;

  const filtered = baseList.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.adminEmail.toLowerCase().includes(q);
    const matchPlan = planFilter === 'all' || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    else if (sortKey === 'members') { av = a.members; bv = b.members; }
    else if (sortKey === 'courts') { av = a.courts; bv = b.courts; }
    else if (sortKey === 'joinedAt') { av = a.joinedAt; bv = b.joinedAt; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pageClubs = sorted.slice(pageStart, pageEnd);

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

  const clubById = Object.fromEntries(clubs.map(c => [c.id, c]));
  const deleteTarget = deleteConfirm ? clubById[deleteConfirm.clubId] : null;
  const rejectTarget = rejectConfirm ? clubById[rejectConfirm.clubId] : null;

  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', fontFamily: 'var(--font-body)' };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Gestion</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Clubes</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => exportCSV(filtered.map(c => ({ Nombre: c.name, Ciudad: c.city, Pais: c.country, Canchas: c.courts, Miembros: c.members, Plan: c.plan, Estado: c.status, Admin: c.adminEmail, Fecha: c.joinedAt })), 'clubes.csv')}
            style={{ padding: '9px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--grey-600)', textTransform: 'uppercase' }}
          >
            Exportar CSV
          </button>
          <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
            + Nuevo Club
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 20 }}>
        {(['all', 'pending'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }} style={{
            padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: tab === t ? 'var(--black)' : 'var(--grey-400)',
            borderBottom: tab === t ? '2px solid var(--turf-green)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t === 'all' ? `Todos los Clubes (${clubs.length})` : `Solicitudes Pendientes (${pending.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          placeholder="Buscar por nombre, ciudad o email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 320, flex: 'none' }}
        />
        {tab === 'all' && (
          <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
            style={{ ...inputStyle, width: 150 }}>
            <option value="all">Todos los planes</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--grey-400)', display: 'flex', alignItems: 'center' }}>
          {filtered.length} club{filtered.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Table / Cards */}
      {tab === 'pending' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6 }}>
              No hay solicitudes pendientes
            </div>
          )}
          {pageClubs.map(club => (
            <div key={club.id}
              style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '20px 24px', display: 'flex', gap: 24, alignItems: 'flex-start', cursor: 'pointer' }}
              onClick={() => setSelectedClub(club)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, fontFamily: 'var(--font-display)' }}>{club.name}</div>
                <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 8 }}>{club.city}, {club.country}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--grey-500)' }}>
                  <span>Admin: <strong>{club.adminEmail}</strong></span>
                  <span>Canchas: <strong>{club.courts}</strong></span>
                  <span>Miembros: <strong>{club.members}</strong></span>
                  <span>Plan: <PlanBadge plan={club.plan} /></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => handleApprove(club.id)} style={{ padding: '8px 18px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Aprobar
                </button>
                <button onClick={() => handleRejectStep1(club.id)} style={{ padding: '8px 18px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                  <th onClick={() => handleSort('name')} style={thStyle}>Nombre <SortIcon col="name" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Ciudad</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Pais</th>
                  <th onClick={() => handleSort('courts')} style={{ ...thStyle, textAlign: 'center' }}>Canchas <SortIcon col="courts" /></th>
                  <th onClick={() => handleSort('members')} style={{ ...thStyle, textAlign: 'center' }}>Miembros <SortIcon col="members" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Plan</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Estado</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Admin</th>
                  <th onClick={() => handleSort('joinedAt')} style={thStyle}>Fecha <SortIcon col="joinedAt" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageClubs.map(c => (
                  <tr key={c.id}
                    style={{ borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}
                    onClick={() => setSelectedClub(c)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--black)' }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--grey-600)' }}>{c.city}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--grey-600)' }}>{c.country}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{c.courts}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{c.members}</td>
                    <td style={{ padding: '10px 14px' }}><PlanBadge plan={c.plan} /></td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>{c.adminEmail}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{c.joinedAt}</td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditClub(c)} style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>EDT</button>
                        <button onClick={() => handleDeleteStep1(c.id)} style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>DEL</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageClubs.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>No se encontraron clubes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* DETAIL DRAWER */}
      {selectedClub && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1009 }} onClick={() => setSelectedClub(null)} />
          <div
            style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', zIndex: 1010, overflowY: 'auto', padding: '32px 36px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Club</div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{selectedClub.name}</h2>
              </div>
              <button onClick={() => setSelectedClub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: '0 0 0 16px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <StatusBadge status={selectedClub.status} />
              <PlanBadge plan={selectedClub.plan} />
            </div>

            {/* Stats tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'var(--grey-50)', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 6 }}>Canchas</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, background: 'var(--turf-green)', borderRadius: 2 }} />
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selectedClub.courts}</div>
                </div>
              </div>
              <div style={{ background: 'var(--grey-50)', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 6 }}>Miembros</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, background: '#3b82f6', borderRadius: 2 }} />
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selectedClub.members}</div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              {[
                { label: 'Ciudad', value: selectedClub.city },
                { label: 'Pais', value: selectedClub.country },
                { label: 'Fecha de registro', value: selectedClub.joinedAt },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--grey-100)', fontSize: 13 }}>
                  <span style={{ color: 'var(--grey-500)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value || '—'}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--grey-100)', fontSize: 13 }}>
                <span style={{ color: 'var(--grey-500)' }}>Email Admin</span>
                <a href={`mailto:${selectedClub.adminEmail}`} style={{ fontWeight: 600, color: 'var(--turf-green)', textDecoration: 'none' }}>{selectedClub.adminEmail || '—'}</a>
              </div>
            </div>

            {/* Change Plan */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 8 }}>Cambiar Plan</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['free', 'basic', 'pro'] as const).map(plan => (
                  <button key={plan} onClick={() => handleChangePlan(selectedClub.id, plan)} style={{
                    flex: 1, padding: '8px', border: `2px solid ${selectedClub.plan === plan ? '#0a0a0a' : 'var(--grey-200)'}`,
                    borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    background: selectedClub.plan === plan ? '#0a0a0a' : '#fff',
                    color: selectedClub.plan === plan ? '#fff' : 'var(--grey-600)',
                  }}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { setEditClub(selectedClub); }}
                style={{ padding: '10px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Editar
              </button>
              <button onClick={() => handleToggleActive(selectedClub.id)}
                style={{ padding: '10px', background: 'transparent', color: selectedClub.status === 'active' ? '#dc2626' : '#166534', border: `1px solid ${selectedClub.status === 'active' ? '#fecaca' : '#bbf7d0'}`, borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {selectedClub.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => handleDeleteStep1(selectedClub.id)}
                style={{ padding: '10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Eliminar Club
              </button>
              <button onClick={() => setSelectedClub(null)} style={{ padding: '10px', background: 'var(--grey-50)', color: 'var(--grey-600)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <ClubForm mode="create" initial={{}} onSave={handleSaveClub} onCancel={() => setShowCreateModal(false)} />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editClub && (
        <Modal onClose={() => setEditClub(null)}>
          <ClubForm mode="edit" initial={editClub} onSave={handleSaveClub} onCancel={() => setEditClub(null)} />
        </Modal>
      )}

      {/* REJECT STEP 1 */}
      {rejectConfirm?.step === 1 && rejectTarget && (
        <Modal onClose={() => setRejectConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Rechazar Solicitud</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas seguro de que deseas rechazar la solicitud de <strong>{rejectTarget.name}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setRejectConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleRejectStep2} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Continuar</button>
          </div>
        </Modal>
      )}

      {/* REJECT STEP 2 */}
      {rejectConfirm?.step === 2 && rejectTarget && (
        <Modal onClose={() => setRejectConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12, color: '#dc2626' }}>Confirmar Rechazo</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas el rechazo definitivo de <strong>{rejectTarget.name}</strong>? El administrador sera notificado.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setRejectConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleRejectFinal} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Confirmar rechazo definitivo</button>
          </div>
        </Modal>
      )}

      {/* DELETE STEP 1 */}
      {deleteConfirm?.step === 1 && deleteTarget && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Eliminar Club</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas seguro de que deseas eliminar <strong>{deleteTarget.name}</strong>? Esta accion no se puede deshacer.
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12, color: '#dc2626' }}>Confirmar Eliminacion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Estas COMPLETAMENTE seguro? Se eliminaran todos los datos de <strong>{deleteTarget.name}</strong> de forma permanente.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleDeleteFinal} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Confirmar eliminacion definitiva</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
