'use client';

import React, { useState, useEffect } from 'react';
import {
  getPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getRedemptions,
  getRedemptionsForPromo,
  fetchPromosFromSupabase,
  type PromoCode,
  type PromoType,
} from '@/lib/promotion-store';

const TYPE_LABELS: Record<PromoType, string> = {
  percent_off:    '% Descuento',
  fixed_off:      'Descuento fijo ($)',
  free_trial:     'Prueba gratuita (días)',
  feature_unlock: 'Feature especial',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)',
  fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none',
  boxSizing: 'border-box', color: 'var(--black)', background: '#fff',
};

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--grey-500)', display: 'block', marginBottom: 5,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', padding: '32px 36px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  code: '',
  type: 'percent_off' as PromoType,
  value: 0,
  description: '',
  maxUses: '' as string | number,
  expiresAt: '',
  isActive: true,
};

export default function PromotionsPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<'codes' | 'redemptions'>('codes');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [expandedPromo, setExpandedPromo] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setPromos(getPromoCodes());
    fetchPromosFromSupabase().then(remote => {
      if (remote.length > 0) setPromos(remote);
    });
  }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: PromoCode) {
    setForm({
      code: p.code,
      type: p.type,
      value: p.value,
      description: p.description,
      maxUses: p.maxUses ?? '',
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : '',
      isActive: p.isActive,
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.code.trim()) { toast('El código es obligatorio', false); return; }
    if (form.value < 0) { toast('El valor no puede ser negativo', false); return; }

    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      description: form.description.trim(),
      maxUses: form.maxUses === '' ? null : Number(form.maxUses),
      expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : null,
      isActive: form.isActive,
      createdBy: 'Super Admin',
    };

    if (editingId) {
      const updated = updatePromoCode(editingId, payload);
      if (!updated) { toast('Error al actualizar', false); return; }
      toast('Código actualizado');
    } else {
      const all = getPromoCodes();
      if (all.some(p => p.code === payload.code && p.id !== editingId)) {
        toast('Ya existe un código con ese nombre', false);
        return;
      }
      createPromoCode(payload);
      toast('Código creado');
    }

    setPromos(getPromoCodes());
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deletePromoCode(id);
    setPromos(getPromoCodes());
    setDeleteConfirm(null);
    toast('Código eliminado');
  }

  function handleToggleActive(p: PromoCode) {
    updatePromoCode(p.id, { isActive: !p.isActive });
    setPromos(getPromoCodes());
    toast(p.isActive ? 'Código desactivado' : 'Código activado');
  }

  const filteredPromos = promos.filter(p => {
    const q = search.toLowerCase();
    return !q || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  const allRedemptions = getRedemptions().sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt));

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-body)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.ok ? '#0a0a0a' : '#dc2626', color: '#fff', padding: '12px 20px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderLeft: `3px solid ${t.ok ? 'var(--turf-green)' : '#fca5a5'}` }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Marketing</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Promociones</h1>
        </div>
        <button
          onClick={openCreate}
          style={{ padding: '10px 24px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          + Nuevo código
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 24 }}>
        {([
          { key: 'codes', label: `Códigos (${promos.length})` },
          { key: 'redemptions', label: `Usos (${allRedemptions.length})` },
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

      {/* CODES TAB */}
      {tab === 'codes' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <input
              placeholder="Buscar por código o descripción..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inp, width: 320, display: 'inline-block' }}
            />
          </div>

          {filteredPromos.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--grey-400)', border: '1px solid var(--grey-200)', background: '#fff' }}>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                {search ? 'Sin resultados' : 'Sin códigos'}
              </div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>
                {search ? 'Probá con otra búsqueda.' : 'Creá tu primer código promocional.'}
              </div>
              {!search && (
                <button onClick={openCreate} style={{ padding: '10px 24px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                  Crear código
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredPromos.map(p => {
                const redemptions = getRedemptionsForPromo(p.id);
                const isExpired = p.expiresAt ? new Date(p.expiresAt) < new Date() : false;
                const isFull = p.maxUses !== null && p.usedCount >= p.maxUses;
                const statusColor = !p.isActive ? 'var(--grey-400)' : isExpired || isFull ? '#dc2626' : '#166534';
                const statusLabel = !p.isActive ? 'Inactivo' : isExpired ? 'Vencido' : isFull ? 'Agotado' : 'Activo';

                return (
                  <div key={p.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '0.04em' }}>{p.code}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusColor === '#166534' ? '#dcfce7' : statusColor === '#dc2626' ? '#fee2e2' : '#f0f0f0', padding: '2px 8px', borderRadius: 10 }}>
                            {statusLabel}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--grey-400)', background: 'var(--grey-100)', padding: '2px 8px', borderRadius: 10 }}>
                            {TYPE_LABELS[p.type]}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--grey-600)', marginBottom: 4 }}>{p.description || '–'}</div>
                        <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'var(--grey-400)' }}>
                          <span>
                            Valor: <strong style={{ color: 'var(--black)' }}>
                              {p.type === 'percent_off' ? `${p.value}%` : p.type === 'fixed_off' ? `$${p.value}` : `${p.value} días`}
                            </strong>
                          </span>
                          <span>
                            Usos: <strong style={{ color: 'var(--black)' }}>{p.usedCount}{p.maxUses !== null ? ` / ${p.maxUses}` : ''}</strong>
                          </span>
                          {p.expiresAt && (
                            <span>Vence: <strong style={{ color: isExpired ? '#dc2626' : 'var(--black)' }}>{new Date(p.expiresAt).toLocaleDateString('es-ES')}</strong></span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 16 }}>
                        <button
                          onClick={() => setExpandedPromo(expandedPromo === p.id ? null : p.id)}
                          style={{ padding: '6px 14px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-600)' }}
                        >
                          {expandedPromo === p.id ? 'Ocultar' : `Usos (${redemptions.length})`}
                        </button>
                        <button
                          onClick={() => handleToggleActive(p)}
                          style={{ padding: '6px 14px', border: `1px solid ${p.isActive ? '#fecaca' : '#bbf7d0'}`, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: p.isActive ? '#dc2626' : '#166534' }}
                        >
                          {p.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          style={{ padding: '6px 14px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-600)' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          style={{ padding: '6px 14px', border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#dc2626' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {expandedPromo === p.id && redemptions.length > 0 && (
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--grey-100)', paddingTop: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>
                          Usuarios que usaron este código
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {redemptions.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--grey-50)' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{r.userName}</span>
                                <span style={{ color: 'var(--grey-400)', marginLeft: 8 }}>{r.userEmail}</span>
                              </div>
                              <span style={{ color: 'var(--grey-400)' }}>{new Date(r.redeemedAt).toLocaleString('es-ES')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {expandedPromo === p.id && redemptions.length === 0 && (
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--grey-100)', paddingTop: 16, fontSize: 12, color: 'var(--grey-400)' }}>
                        Nadie ha usado este código todavía.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* REDEMPTIONS TAB */}
      {tab === 'redemptions' && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          {allRedemptions.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
              Todavía nadie ha canjeado un código.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                  {['Código', 'Usuario', 'Email', 'Fecha'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRedemptions.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em' }}>{r.promoCode}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.userName}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--grey-500)', fontSize: 12 }}>{r.userEmail}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{new Date(r.redeemedAt).toLocaleString('es-ES')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 24 }}>
            {editingId ? 'Editar código' : 'Nuevo código promocional'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Código (ej: WELCOME20)">
              <input style={inp} placeholder="VERANO2026" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </Field>

            <Field label="Tipo de promoción">
              <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as PromoType }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>

            <Field label={form.type === 'percent_off' ? 'Porcentaje (%)' : form.type === 'fixed_off' ? 'Monto ($)' : 'Días de prueba'}>
              <input style={inp} type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
            </Field>

            <Field label="Descripción">
              <input style={inp} placeholder="20% de descuento en el primer mes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Máx. usos (vacío = ilimitado)">
                <input style={inp} type="number" min="1" placeholder="100" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
              </Field>
              <Field label="Fecha de vencimiento">
                <input style={inp} type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </Field>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: form.isActive ? 'var(--turf-green)' : 'var(--grey-300)', position: 'relative', padding: 0, transition: 'background 0.2s' }}
              >
                <span style={{ position: 'absolute', top: 2, left: form.isActive ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--grey-600)' }}>{form.isActive ? 'Código activo' : 'Código inactivo'}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '9px 24px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {editingId ? 'Guardar cambios' : 'Crear código'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Eliminar código</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmás la eliminación? Esta acción es permanente.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
