'use client';

import React, { useState, useEffect } from 'react';
import { getSAClubs, saveSAClubs, getSAClubsFromSupabase, upsertSAClubToSupabase, deleteSAClubFromSupabase, type SAClub } from '@/lib/superadmin-data';

function uid() { return Math.random().toString(36).slice(2, 10); }

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
    pro:   { label: 'Pro',   bg: '#f3e8ff', color: '#7c3aed' },
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editClub, setEditClub] = useState<SAClub | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; clubId: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ step: number; clubId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);

  useEffect(() => {
    // Immediate load from localStorage
    setClubs(getSAClubs());
    // Then load from Supabase in background
    getSAClubsFromSupabase().then(sbClubs => {
      if (sbClubs && sbClubs.length > 0) {
        setClubs(sbClubs);
        saveSAClubs(sbClubs); // sync to localStorage
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

  function handleSaveClub(c: SAClub) {
    const exists = clubs.find(x => x.id === c.id);
    const updated = exists ? clubs.map(x => x.id === c.id ? c : x) : [c, ...clubs];
    saveAndRefresh(updated);
    upsertSAClubToSupabase(c);
    setShowCreateModal(false);
    setEditClub(null);
    toast(exists ? 'Club actualizado' : 'Club creado correctamente');
  }

  function handleApprove(clubId: string) {
    const updated = clubs.map(c => c.id === clubId ? { ...c, status: 'active' as const } : c);
    saveAndRefresh(updated);
    toast('Club aprobado');
  }

  function handleRejectStep1(clubId: string) { setRejectConfirm({ step: 1, clubId }); }
  function handleRejectStep2() { if (!rejectConfirm) return; setRejectConfirm({ ...rejectConfirm, step: 2 }); }
  function handleRejectFinal() {
    if (!rejectConfirm) return;
    const updated = clubs.map(c => c.id === rejectConfirm.clubId ? { ...c, status: 'rejected' as const } : c);
    saveAndRefresh(updated);
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
    setDeleteConfirm(null);
    toast('Club eliminado');
  }

  const pending = clubs.filter(c => c.status === 'pending');
  const displayed = (tab === 'pending' ? pending : clubs).filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.adminEmail.toLowerCase().includes(q);
  });

  const clubById = Object.fromEntries(clubs.map(c => [c.id, c]));
  const deleteTarget = deleteConfirm ? clubById[deleteConfirm.clubId] : null;
  const rejectTarget = rejectConfirm ? clubById[rejectConfirm.clubId] : null;

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
        <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
          + Nuevo Club
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 20 }}>
        {(['all', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          placeholder="Buscar por nombre, ciudad o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 320, flex: 'none' }}
        />
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--grey-400)', display: 'flex', alignItems: 'center' }}>
          {displayed.length} club{displayed.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Table */}
      {tab === 'pending' ? (
        /* Pending requests view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6 }}>
              No hay solicitudes pendientes
            </div>
          )}
          {displayed.map(club => (
            <div key={club.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '20px 24px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
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
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
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
        /* All clubs table */
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                  {['Nombre del Club', 'Ciudad', 'Pais', 'Canchas', 'Miembros', 'Plan', 'Estado', 'Admin', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--grey-100)' }}
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
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditClub(c)} style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>EDT</button>
                        <button onClick={() => handleDeleteStep1(c.id)} style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>DEL</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>No se encontraron clubes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
