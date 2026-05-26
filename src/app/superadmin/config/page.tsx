'use client';

import React, { useState, useEffect } from 'react';
import { getSAAdminUsers, saveSAAdminUsers, getSAPlayers, getSAClubs, getSATournaments, seedPlayersToSupabase, seedClubsToSupabase, type SAAdminUser } from '@/lib/superadmin-data';

function uid() { return Math.random().toString(36).slice(2, 10); }

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '32px 36px', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
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

const ROLE_LABELS: Record<SAAdminUser['role'], string> = {
  score_corrections: 'Correcciones de Score',
  player_db: 'Base de Datos de Jugadores',
  transactions: 'Transacciones',
  clubs: 'Gestion de Clubes',
};

function RoleBadge({ role }: { role: SAAdminUser['role'] }) {
  const colors: Record<SAAdminUser['role'], { bg: string; color: string }> = {
    score_corrections: { bg: '#e0f2fe', color: '#0369a1' },
    player_db: { bg: '#dcfce7', color: '#166534' },
    transactions: { bg: '#f3e8ff', color: '#7c3aed' },
    clubs: { bg: '#fff7ed', color: '#c2410c' },
  };
  const c = colors[role];
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ConfigPage() {
  const [tab, setTab] = useState<'admins' | 'general' | 'database'>('admins');
  const [admins, setAdmins] = useState<SAAdminUser[]>([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [editAdmin, setEditAdmin] = useState<SAAdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; adminId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  // Admin form
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'score_corrections' as SAAdminUser['role'] });
  // General settings
  const [platformName, setPlatformName] = useState('PadelMGT');
  const [supportEmail, setSupportEmail] = useState('soporte@padelmgt.com');
  const [newSAEmail, setNewSAEmail] = useState('');
  const [newSAPassword, setNewSAPassword] = useState('');
  const [newSAConfirm, setNewSAConfirm] = useState('');
  // Danger zone
  const [clearCacheConfirm, setClearCacheConfirm] = useState<number>(0);

  useEffect(() => { setAdmins(getSAAdminUsers()); }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function saveAndRefresh(updated: SAAdminUser[]) {
    saveSAAdminUsers(updated);
    setAdmins(updated);
  }

  // Admin CRUD
  function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminForm.name || !adminForm.email) return;
    const now = new Date().toISOString().split('T')[0];
    if (editAdmin) {
      const updated = admins.map(a => a.id === editAdmin.id ? { ...editAdmin, name: adminForm.name, email: adminForm.email, role: adminForm.role } : a);
      saveAndRefresh(updated);
      toast('Administrador actualizado');
    } else {
      const newAdmin: SAAdminUser = { id: uid(), name: adminForm.name, email: adminForm.email, role: adminForm.role, status: 'active', createdAt: now };
      saveAndRefresh([...admins, newAdmin]);
      toast('Administrador creado correctamente');
    }
    setShowCreateAdmin(false);
    setEditAdmin(null);
    setAdminForm({ name: '', email: '', password: '', role: 'score_corrections' });
  }

  function openEditAdmin(a: SAAdminUser) {
    setAdminForm({ name: a.name, email: a.email, password: '', role: a.role });
    setEditAdmin(a);
    setShowCreateAdmin(true);
  }

  function toggleAdminStatus(adminId: string) {
    const updated = admins.map(a => a.id === adminId ? { ...a, status: a.status === 'active' ? 'inactive' as const : 'active' as const } : a);
    saveAndRefresh(updated);
    toast('Estado actualizado');
  }

  function handleDeleteStep1(adminId: string) { setDeleteConfirm({ step: 1, adminId }); }
  function handleDeleteStep2() { if (!deleteConfirm) return; setDeleteConfirm({ ...deleteConfirm, step: 2 }); }
  function handleDeleteFinal() {
    if (!deleteConfirm) return;
    const updated = admins.filter(a => a.id !== deleteConfirm.adminId);
    saveAndRefresh(updated);
    setDeleteConfirm(null);
    toast('Administrador eliminado');
  }

  function handleSACredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!newSAEmail || !newSAPassword) { toast('Ambos campos son requeridos', false); return; }
    if (newSAPassword !== newSAConfirm) { toast('Las contrasenas no coinciden', false); return; }
    // In a real app, this would update the credentials. For now, just show success.
    toast('Credenciales actualizadas (demo — no persistido)');
    setNewSAEmail(''); setNewSAPassword(''); setNewSAConfirm('');
  }

  function handleExportPlayers() {
    const players = getSAPlayers();
    const headers = ['ID', 'Nombre', 'Email', 'Telefono', 'Ciudad', 'Pais', 'Ranking', 'Club', 'Estado', 'Rol', 'Fecha de Ingreso'];
    const rows = players.map(p => [p.id, p.name, p.email, p.phone, p.city, p.country, String(p.ranking), p.club ?? '', p.status, p.role, p.joinedAt]);
    downloadCSV('jugadores.csv', [headers, ...rows]);
    toast('Jugadores exportados');
  }

  function handleExportClubs() {
    const clubs = getSAClubs();
    const headers = ['ID', 'Nombre', 'Ciudad', 'Pais', 'Canchas', 'Miembros', 'Plan', 'Estado', 'Admin', 'Fecha'];
    const rows = clubs.map(c => [c.id, c.name, c.city, c.country, String(c.courts), String(c.members), c.plan, c.status, c.adminEmail, c.joinedAt]);
    downloadCSV('clubes.csv', [headers, ...rows]);
    toast('Clubes exportados');
  }

  function handleExportTournaments() {
    const tournaments = getSATournaments();
    const headers = ['ID', 'Nombre', 'Club', 'Ciudad', 'Fecha', 'Jugadores', 'Formato', 'Rondas', 'Estado'];
    const rows = tournaments.map(t => [t.id, t.name, t.club, t.city, t.date, String(t.players), t.format, String(t.rounds), t.status]);
    downloadCSV('torneos.csv', [headers, ...rows]);
    toast('Torneos exportados');
  }

  function handleClearCache() {
    if (clearCacheConfirm === 0) { setClearCacheConfirm(1); return; }
    if (clearCacheConfirm === 1) {
      // Clear non-essential keys
      const keysToKeep = ['padelmgt_sa_players', 'padelmgt_sa_admin_users', 'padelmgt_sa_player_custom_fields', 'padelmgt_sa_player_relationships', 'padelmgt_club_requests', 'padelmgt_registered_players'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(k => { if (!keysToKeep.includes(k)) localStorage.removeItem(k); });
      setClearCacheConfirm(0);
      toast('Cache del sistema limpiada');
    }
  }

  const adminById = Object.fromEntries(admins.map(a => [a.id, a]));
  const deleteTarget = deleteConfirm ? adminById[deleteConfirm.adminId] : null;

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
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Sistema</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Configuracion</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 32 }}>
        {([
          { key: 'admins', label: 'Administradores del Sistema' },
          { key: 'general', label: 'Configuracion General' },
          { key: 'database', label: 'Base de Datos' },
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

      {/* ADMINS TAB */}
      {tab === 'admins' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => { setEditAdmin(null); setAdminForm({ name: '', email: '', password: '', role: 'score_corrections' }); setShowCreateAdmin(true); }}
              style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
              + Nuevo Administrador
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Fecha de creacion', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
                      No hay administradores creados. Agrega el primero.
                    </td>
                  </tr>
                )}
                {admins.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--grey-100)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--grey-500)', fontSize: 12 }}>{a.email}</td>
                    <td style={{ padding: '10px 14px' }}><RoleBadge role={a.role} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: a.status === 'active' ? '#dcfce7' : '#f0f0f0', color: a.status === 'active' ? '#166534' : '#555', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {a.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>{a.createdAt}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditAdmin(a)} style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>EDT</button>
                        <button onClick={() => toggleAdminStatus(a.id)} style={{ background: 'none', border: '1px solid var(--grey-200)', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>
                          {a.status === 'active' ? 'Desact.' : 'Activar'}
                        </button>
                        <button onClick={() => handleDeleteStep1(a.id)} style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>DEL</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERAL TAB */}
      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 580 }}>
          {/* Platform settings */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 20 }}>
              Configuracion de la Plataforma
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nombre de la plataforma">
                <input style={inputStyle} value={platformName} onChange={e => setPlatformName(e.target.value)} />
              </Field>
              <Field label="Email de soporte">
                <input style={inputStyle} type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => toast('Configuracion guardada')} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>

          {/* SA Credentials */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 20 }}>
              Credenciales del Super Admin
            </div>
            <form onSubmit={handleSACredentials} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nuevo email">
                <input style={inputStyle} type="email" placeholder="nuevo@email.com" value={newSAEmail} onChange={e => setNewSAEmail(e.target.value)} />
              </Field>
              <Field label="Nueva contrasena">
                <input style={inputStyle} type="password" placeholder="••••••••••••" value={newSAPassword} onChange={e => setNewSAPassword(e.target.value)} />
              </Field>
              <Field label="Confirmar contrasena">
                <input style={inputStyle} type="password" placeholder="••••••••••••" value={newSAConfirm} onChange={e => setNewSAConfirm(e.target.value)} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>

          {/* Maintenance mode */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px', opacity: 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6 }}>Modo Mantenimiento</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>Proximamente — Desactiva el acceso publico a la plataforma</div>
              </div>
              <div style={{ width: 44, height: 24, background: 'var(--grey-300)', borderRadius: 12, position: 'relative', cursor: 'not-allowed' }}>
                <div style={{ position: 'absolute', top: 2, left: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE TAB */}
      {tab === 'database' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 580 }}>
          {/* Export */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 20 }}>
              Exportar Datos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleExportPlayers} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--black)' }}>
                <span>Exportar todos los jugadores</span>
                <span style={{ fontSize: 11, color: 'var(--turf-green)', fontWeight: 700 }}>.CSV</span>
              </button>
              <button onClick={handleExportClubs} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--black)' }}>
                <span>Exportar todos los clubes</span>
                <span style={{ fontSize: 11, color: 'var(--turf-green)', fontWeight: 700 }}>.CSV</span>
              </button>
              <button onClick={handleExportTournaments} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--grey-200)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--black)' }}>
                <span>Exportar todos los torneos</span>
                <span style={{ fontSize: 11, color: 'var(--turf-green)', fontWeight: 700 }}>.CSV</span>
              </button>
            </div>
          </div>

          {/* Supabase seed */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
              Supabase — Sincronizacion
            </div>
            <div style={{ borderTop: '1px solid var(--grey-200)', paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Sincronizar con Supabase</div>
              <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 12 }}>
                Sube todos los datos de localStorage a la base de datos de Supabase. Úsalo una vez para migrar los datos existentes.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    const count = await seedPlayersToSupabase();
                    toast(`${count} jugadores subidos a Supabase`);
                  }}
                  style={{ padding: '10px 20px', background: '#0ea5e9', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
                >
                  Subir Jugadores a Supabase
                </button>
                <button
                  onClick={async () => {
                    const count = await seedClubsToSupabase();
                    toast(`${count} clubes subidos a Supabase`);
                  }}
                  style={{ padding: '10px 20px', background: '#0ea5e9', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
                >
                  Subir Clubes a Supabase
                </button>
              </div>
            </div>
          </div>

          {/* Supabase */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
              Conectar con Supabase
            </div>
            <p style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 20, lineHeight: 1.6 }}>
              Cuando el backend este listo, configura las credenciales de Supabase para migrar los datos de localStorage a la nube.
              El esquema SQL esta disponible en <code style={{ background: 'var(--grey-100)', padding: '1px 6px', borderRadius: 3, fontSize: 12 }}>/supabase/schema.sql</code>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Supabase Project URL">
                <input style={{ ...inputStyle, background: 'var(--grey-50)', color: 'var(--grey-400)' }} placeholder="https://xxxx.supabase.co" disabled />
              </Field>
              <Field label="Supabase Anon Key">
                <input style={{ ...inputStyle, background: 'var(--grey-50)', color: 'var(--grey-400)' }} placeholder="eyJhbGci..." disabled />
              </Field>
              <button disabled style={{ padding: '9px 20px', background: 'var(--grey-200)', color: 'var(--grey-400)', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'not-allowed', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Conectar (Proximamente)
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', marginBottom: 12 }}>
              Zona de Peligro
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', marginBottom: 4 }}>Limpiar cache del sistema</div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>Elimina datos temporales de localStorage (no elimina jugadores ni clubes).</div>
              </div>
              <button onClick={handleClearCache} style={{
                padding: '9px 18px', background: clearCacheConfirm === 0 ? 'transparent' : '#dc2626',
                color: clearCacheConfirm === 0 ? '#dc2626' : '#fff',
                border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', marginLeft: 16,
              }}>
                {clearCacheConfirm === 0 ? 'Limpiar cache' : 'Confirmar limpieza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT ADMIN MODAL */}
      {showCreateAdmin && (
        <Modal onClose={() => { setShowCreateAdmin(false); setEditAdmin(null); }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>
            {editAdmin ? 'Editar Administrador' : 'Nuevo Administrador'}
          </h2>
          <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre">
              <input style={inputStyle} required value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input style={inputStyle} type="email" required value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            {!editAdmin && (
              <Field label="Contrasena temporal">
                <input style={inputStyle} type="password" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} />
              </Field>
            )}
            <Field label="Rol">
              <select style={inputStyle} value={adminForm.role} onChange={e => setAdminForm(f => ({ ...f, role: e.target.value as SAAdminUser['role'] }))}>
                <option value="score_corrections">Correcciones de Score</option>
                <option value="player_db">Base de Datos de Jugadores</option>
                <option value="transactions">Transacciones</option>
                <option value="clubs">Gestion de Clubes</option>
              </select>
            </Field>
            <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', borderRadius: 4, padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>
              <strong>Permisos del rol:</strong>{' '}
              {adminForm.role === 'score_corrections' && 'Puede aprobar o rechazar solicitudes de correccion de score.'}
              {adminForm.role === 'player_db' && 'Puede gestionar jugadores: crear, editar, bloquear y eliminar.'}
              {adminForm.role === 'transactions' && 'Puede ver y gestionar pagos cuando Stripe este conectado.'}
              {adminForm.role === 'clubs' && 'Puede gestionar clubes y aprobar/rechazar solicitudes.'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => { setShowCreateAdmin(false); setEditAdmin(null); }} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button type="submit" style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {editAdmin ? 'Guardar Cambios' : 'Crear Administrador'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE STEP 1 */}
      {deleteConfirm?.step === 1 && deleteTarget && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Eliminar Administrador</h2>
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12, color: '#dc2626' }}>Confirmar Eliminacion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas la eliminacion definitiva de <strong>{deleteTarget.name}</strong>? Perdera todos los permisos inmediatamente.
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
