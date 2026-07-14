'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSAAdminUsers, saveSAAdminUsers, getSAAdminUsersFromSupabase, upsertSAAdminUserToSupabase, deleteSAAdminUserFromSupabase, getSAPlayers, getSAClubs, getSATournaments, seedPlayersToSupabase, seedClubsToSupabase, upsertTournamentToSupabase, type SAAdminUser } from '@/lib/superadmin-data';
import { getGlobalRankingConfig, saveRankingConfig } from '@/lib/ranking-config-store';
import { getMinorCategories, saveMinorCategories, type MinorCategory } from '@/lib/minor-categories-store';
import { getAuditLog, clearAuditLog, type AuditEntry } from '@/lib/audit-log-store';

function uid() { return Math.random().toString(36).slice(2, 10); }

interface TeamMember { name: string; role: string; country: string; bio: string; }
interface Milestone  { year: string; event: string; }

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
  const [tab, setTab] = useState<'admins' | 'general' | 'database' | 'stripe' | 'ranking' | 'menores' | 'audit' | 'sitio'>('admins');
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
  // Ranking config
  const [rankWin, setRankWin] = useState(3);
  const [rankDraw, setRankDraw] = useState(1);
  const [rankLoss, setRankLoss] = useState(-1);
  const [rankSaved, setRankSaved] = useState(false);
  // Minor (age) categories config
  const [minorCats, setMinorCats] = useState<MinorCategory[]>([]);
  const [minorSaved, setMinorSaved] = useState(false);
  // Audit log
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  // Sitio web
  type StatMode = 'real' | 'custom';
  const [statsMode, setStatsMode] = useState<StatMode>('real');
  const [statsValues, setStatsValues] = useState({ players: '12,400+', clubs: '380', leagues: '47', countries: '9' });
  const [savingStats, setSavingStats] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { name: 'Martín Rodríguez', role: 'CEO & Co-Founder', country: '🇦🇷', bio: 'Ex-jugador profesional y fanático del pádel. Fundó PadelMGT para resolver los problemas que vivió como organizador.' },
    { name: 'Valentina Cruz', role: 'CTO & Co-Founder', country: '🇨🇴', bio: 'Ingeniera de software con 10 años de experiencia en plataformas deportivas a escala.' },
    { name: 'Diego Morales', role: 'Head of Product', country: '🇲🇽', bio: 'Diseñador y estratega de producto. Obsesionado con la experiencia de usuario en deportes.' },
    { name: 'Ana Fernández', role: 'Head of Growth', country: '🇨🇱', bio: 'Especialista en crecimiento de comunidades deportivas en América Latina.' },
  ]);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { year: '2023', event: 'Fundación de PadelMGT en Buenos Aires con el primer torneo piloto.' },
    { year: '2024', event: 'Lanzamiento público. 1,000 jugadores registrados en el primer mes.' },
    { year: '2025', event: 'Expansión a 8 países de América Latina y España.' },
    { year: '2026', event: 'Más de 12,400 jugadores activos y 380 clubes en la plataforma.' },
  ]);
  const [savingAbout, setSavingAbout] = useState(false);
  const [editTeamIdx, setEditTeamIdx] = useState<number | null>(null);
  const [editTeamForm, setEditTeamForm] = useState<TeamMember>({ name: '', role: '', country: '', bio: '' });
  const [editMsIdx, setEditMsIdx] = useState<number | null>(null);
  const [editMsForm, setEditMsForm] = useState<Milestone>({ year: '', event: '' });
  // Logos de la plataforma
  const [brandLogos, setBrandLogos] = useState({ logoFull: '', logoWhite: '', logoBlack: '', logoIcon: '' });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandLoaded, setBrandLoaded] = useState(false);

  useEffect(() => {
    setAdmins(getSAAdminUsers());
    getSAAdminUsersFromSupabase().then(sbAdmins => {
      if (sbAdmins && sbAdmins.length > 0) {
        saveSAAdminUsers(sbAdmins);
        setAdmins(sbAdmins);
      }
    }).catch(() => {});
    // Load ranking config
    const cfg = getGlobalRankingConfig();
    setRankWin(cfg.pointsWin);
    setRankDraw(cfg.pointsDraw);
    setRankLoss(cfg.pointsLoss);
    // Load minor (age) categories config
    setMinorCats(getMinorCategories());
    // Load audit log
    setAuditLog(getAuditLog(200));
    // Load sitio web config
    fetch('/api/sa/stats')
      .then(r => r.json() as Promise<{ config: Record<string, { display: string; useReal: boolean }> | null }>)
      .then(d => {
        if (d.config) {
          setStatsValues({
            players:   d.config.players?.display   ?? '12,400+',
            clubs:     d.config.clubs?.display     ?? '380',
            leagues:   d.config.leagues?.display   ?? '47',
            countries: d.config.countries?.display ?? '9',
          });
          setStatsMode(d.config.players?.useReal ? 'real' : 'custom');
        }
      })
      .catch(() => {});
    fetch('/api/sa/about-content')
      .then(r => r.json() as Promise<{ content: { team?: TeamMember[]; milestones?: Milestone[] } | null }>)
      .then(d => {
        if (d.content?.team?.length)       setTeamMembers(d.content.team);
        if (d.content?.milestones?.length) setMilestones(d.content.milestones);
      })
      .catch(() => {});
    // Load general settings (platform name, support email)
    fetch('/api/sa/general-config', { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<{ config: { platformName?: string; supportEmail?: string } | null }> : null)
      .then(d => {
        if (d?.config?.platformName) setPlatformName(d.config.platformName);
        if (d?.config?.supportEmail) setSupportEmail(d.config.supportEmail);
      })
      .catch(() => {});
    // Load branding (logos)
    fetch('/api/sa/branding', { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<{ branding: Record<string, string> | null }> : null)
      .then(d => {
        const b = d?.branding ?? {};
        setBrandLogos({
          logoFull:  b.logoFull  ?? '/assets/brand/logo-full.png',
          logoWhite: b.logoWhite ?? '/assets/brand/logo-white.png',
          logoBlack: b.logoBlack ?? '/assets/brand/logo-black.png',
          logoIcon:  b.logoIcon  ?? '/assets/brand/logo-icon.png',
        });
        setBrandLoaded(true);
      })
      .catch(() => setBrandLoaded(true));
  }, []);

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
  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminForm.name || !adminForm.email) return;
    if (!editAdmin && !adminForm.password) { toast('La contraseña es requerida para nuevos admins', false); return; }
    const now = new Date().toISOString().split('T')[0];
    if (editAdmin) {
      const updated: SAAdminUser = { ...editAdmin, name: adminForm.name, email: adminForm.email, role: adminForm.role, ...(adminForm.password ? { password: adminForm.password } : {}) };
      const all = admins.map(a => a.id === editAdmin.id ? updated : a);
      saveAndRefresh(all);
      await upsertSAAdminUserToSupabase(updated);
      toast('Administrador actualizado');
    } else {
      const newAdmin: SAAdminUser = { id: uid(), name: adminForm.name, email: adminForm.email, password: adminForm.password, role: adminForm.role, status: 'active', createdAt: now };
      saveAndRefresh([...admins, newAdmin]);
      await upsertSAAdminUserToSupabase(newAdmin);
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

  async function toggleAdminStatus(adminId: string) {
    const updated = admins.map(a => a.id === adminId ? { ...a, status: a.status === 'active' ? 'inactive' as const : 'active' as const } : a);
    saveAndRefresh(updated);
    const changed = updated.find(a => a.id === adminId);
    if (changed) await upsertSAAdminUserToSupabase(changed);
    toast('Estado actualizado');
  }

  function handleDeleteStep1(adminId: string) { setDeleteConfirm({ step: 1, adminId }); }
  function handleDeleteStep2() { if (!deleteConfirm) return; setDeleteConfirm({ ...deleteConfirm, step: 2 }); }

  async function saveStats() {
    setSavingStats(true);
    const config = {
      players:   { display: statsValues.players,   useReal: statsMode === 'real' },
      clubs:     { display: statsValues.clubs,     useReal: statsMode === 'real' },
      leagues:   { display: statsValues.leagues,   useReal: statsMode === 'real' },
      countries: { display: statsValues.countries, useReal: statsMode === 'real' },
    };
    try {
      const res = await fetch('/api/sa/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
      const json = await res.json() as { ok?: boolean };
      if (json.ok) toast('Estadísticas guardadas ✓');
      else toast('Error al guardar estadísticas', false);
    } catch { toast('Error de conexión', false); }
    setSavingStats(false);
  }

  async function saveAboutContent() {
    setSavingAbout(true);
    try {
      const res = await fetch('/api/sa/about-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { team: teamMembers, milestones } }),
      });
      const json = await res.json() as { ok?: boolean };
      if (json.ok) toast('Contenido del /about guardado ✓');
      else toast('Error al guardar', false);
    } catch { toast('Error de conexión', false); }
    setSavingAbout(false);
  }

  async function saveBranding() {
    setBrandSaving(true);
    try {
      const res = await fetch('/api/sa/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ branding: brandLogos }),
      });
      if (res.ok) {
        toast('Logos guardados ✓ — se actualizan en todas las páginas');
        try { sessionStorage.removeItem('padelmgt_branding_v1'); } catch {}
      } else {
        const e = await res.json() as { error?: string };
        toast(e.error ?? 'Error al guardar logos', false);
      }
    } catch { toast('Error de conexión', false); }
    setBrandSaving(false);
  }

  function handleLogoFile(key: keyof typeof brandLogos, file: File) {
    if (file.size > 500_000) { toast('Imagen demasiado grande (máx 500KB)', false); return; }
    const reader = new FileReader();
    reader.onload = e => setBrandLogos(prev => ({ ...prev, [key]: (e.target?.result as string) ?? '' }));
    reader.readAsDataURL(file);
  }

  async function handleDeleteFinal() {
    if (!deleteConfirm) return;
    const updated = admins.filter(a => a.id !== deleteConfirm.adminId);
    saveAndRefresh(updated);
    await deleteSAAdminUserFromSupabase(deleteConfirm.adminId);
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
    const headers = ['ID', 'Nombre', 'Email', 'Telefono', 'Ciudad', 'Pais', 'Ranking', 'Nivel', 'Estado', 'Rol', 'Fecha de Ingreso'];
    const rows = players.map(p => [p.id, p.name, p.email, p.phone, p.city, p.country, String(p.ranking), p.level ?? '', p.status, p.role, p.joinedAt]);
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
          { key: 'stripe', label: 'Stripe / Pagos' },
          { key: 'ranking', label: 'Ranking' },
          { key: 'menores', label: 'Categorías de Menores' },
          { key: 'sitio', label: 'Sitio Web' },
          { key: 'audit', label: `Auditoria (${auditLog.length})` },
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
                <button onClick={async () => {
                    try {
                      const res = await fetch('/api/sa/general-config', {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ platformName, supportEmail }),
                      });
                      if (!res.ok) throw new Error(await res.text());
                      toast('Configuracion guardada');
                    } catch (err) {
                      console.error('[SA config] general save failed:', err);
                      toast('Error al guardar — reintentá', false);
                    }
                  }} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
                <button
                  onClick={async () => {
                    const tourneys = getSATournaments();
                    let count = 0;
                    for (const t of tourneys) {
                      await upsertTournamentToSupabase(t as unknown as Record<string, unknown>);
                      count++;
                    }
                    toast(`${count} torneos subidos a Supabase`);
                  }}
                  style={{ padding: '10px 20px', background: '#0ea5e9', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
                >
                  Subir Torneos a Supabase
                </button>
              </div>
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

      {/* ── STRIPE TAB ── */}
      {tab === 'stripe' && (
        <div style={{ maxWidth: 480 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Stripe</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 20, lineHeight: 1.6 }}>
            La configuración de Stripe (estado de conexión, webhooks, precios) tiene su propia página dedicada.
          </p>
          <Link
            href="/superadmin/stripe"
            style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--black)', color: 'var(--neon)', textDecoration: 'none', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Ir a Stripe →
          </Link>
        </div>
      )}

      {/* RANKING TAB */}
      {tab === 'ranking' && (
        <div style={{ maxWidth: 480 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Puntos de Ranking</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 24, lineHeight: 1.6 }}>
            Define cuántos puntos se otorgan por cada resultado en el Ranking General de la plataforma.<br />
            Afecta a todos los Juegos Rápidos y Torneos futuros.
          </p>
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: 'Victoria', color: '#166534', value: rankWin, setter: setRankWin },
              { label: 'Empate',   color: '#92400e', value: rankDraw, setter: setRankDraw },
              { label: 'Derrota',  color: '#991b1b', value: rankLoss, setter: setRankLoss },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: row.color, marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>Puntos que suma un jugador cuando {row.label.toLowerCase()}.</div>
                </div>
                <input
                  type="number"
                  value={row.value}
                  onChange={e => row.setter(Number(e.target.value))}
                  style={{ width: 72, padding: '8px 10px', border: '2px solid var(--grey-200)', fontSize: 18, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)', color: row.color, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const cfg = getGlobalRankingConfig();
                saveRankingConfig({ ...cfg, pointsWin: rankWin, pointsDraw: rankDraw, pointsLoss: rankLoss });
                setRankSaved(true);
                toast('Configuración de ranking guardada');
                setTimeout(() => setRankSaved(false), 3000);
              }}
              style={{ padding: '12px', background: 'var(--black)', color: 'var(--neon)', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start', paddingLeft: 32, paddingRight: 32 }}
            >
              {rankSaved ? '✓ Guardado' : 'Guardar configuración'}
            </button>
          </div>
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
            ⚠ Los cambios aplican solo a juegos futuros. Las partidas ya registradas mantienen los puntos originales.
          </div>
        </div>
      )}

      {/* CATEGORÍAS DE MENORES TAB */}
      {tab === 'menores' && (
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Categorías de Menores</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 24, lineHeight: 1.6 }}>
            Edad calculada al 1 de enero del año de la competición. Un jugador puede competir en categorías superiores (mayor edad máxima) pero no inferiores.
          </p>
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {minorCats.map((cat, i) => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 4 }}>Nombre</div>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={e => setMinorCats(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ width: 110 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--grey-500)', textTransform: 'uppercase', marginBottom: 4 }}>Edad máx.</div>
                  <input
                    type="number"
                    value={cat.maxAge}
                    onChange={e => setMinorCats(prev => prev.map((c, j) => j === i ? { ...c, maxAge: Number(e.target.value) } : c))}
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={() => setMinorCats(prev => prev.filter((_, j) => j !== i))}
                  style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', background: '#fff', color: '#991b1b', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4 }}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              onClick={() => setMinorCats(prev => [...prev, { id: `cat-${uid()}`, name: '', maxAge: 0 }])}
              style={{ alignSelf: 'flex-start', padding: '8px 16px', border: '1px dashed var(--grey-300)', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 4 }}
            >
              + Añadir categoría
            </button>
            <button
              onClick={() => {
                saveMinorCategories(minorCats);
                setMinorSaved(true);
                toast('Categorías de menores guardadas');
                setTimeout(() => setMinorSaved(false), 3000);
              }}
              style={{ padding: '12px', background: 'var(--black)', color: 'var(--neon)', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start', paddingLeft: 32, paddingRight: 32 }}
            >
              {minorSaved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* SITIO WEB TAB */}
      {tab === 'sitio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Logos section */}
          <div style={{ border: '1px solid var(--grey-200)', background: '#fafafa' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', marginBottom: 2 }}>Logos de la Plataforma</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Se actualizan en todas las páginas (públicas, privadas y app). PNG, SVG o WebP — máx 500KB por imagen</div>
              </div>
              <button onClick={saveBranding} disabled={brandSaving || !brandLoaded} style={{ padding: '8px 18px', background: 'var(--black)', color: '#c8f135', border: 'none', cursor: brandSaving ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: brandSaving ? 0.6 : 1 }}>
                {brandSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {!brandLoaded ? (
                <div style={{ color: 'var(--grey-400)', fontSize: 13 }}>Cargando configuración...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  {([
                    { key: 'logoFull',  label: 'Logo Principal',   bg: '#fff',    desc: 'Fondos claros (navbar, páginas)' },
                    { key: 'logoWhite', label: 'Logo Blanco',      bg: '#0a0a0a', desc: 'Fondos oscuros (sidebar, footer)' },
                    { key: 'logoBlack', label: 'Logo Negro',       bg: '#f5f5f5', desc: 'Impresión y documentos' },
                    { key: 'logoIcon',  label: 'Ícono (cuadrado)', bg: '#fff',    desc: 'Favicon e ícono de la app' },
                  ] as const).map(({ key, label, bg, desc }) => {
                    const src = brandLogos[key];
                    const isDefault = src.startsWith('/assets/');
                    return (
                      <div key={key} style={{ border: '1px solid var(--grey-200)', background: '#fff', overflow: 'hidden' }}>
                        <div style={{ background: bg, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--grey-200)' }}>
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={label} style={{ maxHeight: 64, maxWidth: '80%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ color: 'var(--grey-300)', fontSize: 12 }}>Sin imagen</div>
                          )}
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)', marginBottom: 8 }}>{desc}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'inline-block', cursor: 'pointer', padding: '5px 12px', background: 'var(--grey-100)', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--black)' }}>
                              Subir
                              <input
                                type="file"
                                accept="image/png,image/svg+xml,image/webp"
                                style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(key, f); e.target.value = ''; }}
                              />
                            </label>
                            {!isDefault && (
                              <button
                                onClick={() => setBrandLogos(prev => ({ ...prev, [key]: `/assets/brand/${key === 'logoFull' ? 'logo-full' : key === 'logoWhite' ? 'logo-white' : key === 'logoBlack' ? 'logo-black' : 'logo-icon'}.png` }))}
                                style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--grey-200)', fontSize: 11, cursor: 'pointer', color: 'var(--grey-500)' }}
                              >
                                Restablecer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stats section */}
          <div style={{ border: '1px solid var(--grey-200)', background: '#fafafa' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', marginBottom: 2 }}>Estadísticas del Sitio</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Aparecen en el hero de la página principal y en la página /about</div>
              </div>
              <button onClick={saveStats} disabled={savingStats} style={{ padding: '8px 18px', background: 'var(--black)', color: '#c8f135', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: savingStats ? 0.6 : 1 }}>
                {savingStats ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['real', 'custom'] as const).map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                    <input type="radio" checked={statsMode === m} onChange={() => setStatsMode(m)} />
                    {m === 'real' ? 'Usar datos reales de Supabase' : 'Mostrar valores personalizados'}
                  </label>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {([
                  { key: 'players' as const,   label: 'Jugadores',    placeholder: '12,400+' },
                  { key: 'clubs' as const,      label: 'Clubes',       placeholder: '380' },
                  { key: 'leagues' as const,    label: 'Ligas Activas',placeholder: '47' },
                  { key: 'countries' as const,  label: 'Países',       placeholder: '9' },
                ]).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', opacity: statsMode === 'real' ? 0.5 : 1 }}
                      disabled={statsMode === 'real'}
                      value={statsValues[key]}
                      onChange={e => setStatsValues(v => ({ ...v, [key]: e.target.value }))}
                      placeholder={placeholder}
                    />
                    <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 3 }}>
                      {statsMode === 'real' ? 'Dato real de Supabase' : 'Texto a mostrar'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team members section */}
          <div style={{ border: '1px solid var(--grey-200)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', marginBottom: 2 }}>Equipo</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Miembros del equipo que aparecen en /about</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setEditTeamIdx(teamMembers.length); setEditTeamForm({ name: '', role: '', country: '', bio: '' }); }}
                  style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--grey-600)' }}
                >
                  + Agregar
                </button>
                <button onClick={saveAboutContent} disabled={savingAbout} style={{ padding: '7px 14px', background: 'var(--black)', color: '#c8f135', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: savingAbout ? 0.6 : 1 }}>
                  {savingAbout ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
            <div>
              {teamMembers.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--grey-100)' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--court-blue-deep)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                    {m.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name} {m.country}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-500)' }}>{m.role}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditTeamIdx(i); setEditTeamForm({ ...m }); }} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>Editar</button>
                    <button onClick={() => { const t = teamMembers.filter((_, j) => j !== i); setTeamMembers(t); }} style={{ padding: '4px 10px', border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>×</button>
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Sin miembros del equipo. Agrega el primero.</div>
              )}
            </div>
          </div>

          {/* Milestones section */}
          <div style={{ border: '1px solid var(--grey-200)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', marginBottom: 2 }}>Hitos / Historia</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Línea de tiempo que aparece en /about</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditMsIdx(milestones.length); setEditMsForm({ year: '', event: '' }); }} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--grey-600)' }}>
                  + Agregar
                </button>
                <button onClick={saveAboutContent} disabled={savingAbout} style={{ padding: '7px 14px', background: 'var(--black)', color: '#c8f135', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: savingAbout ? 0.6 : 1 }}>
                  {savingAbout ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
            <div>
              {milestones.map((ms, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--grey-100)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--neon)', background: 'var(--black)', padding: '4px 10px', flexShrink: 0 }}>{ms.year}</div>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--grey-600)' }}>{ms.event}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditMsIdx(i); setEditMsForm({ ...ms }); }} style={{ padding: '4px 10px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 11, color: 'var(--grey-600)' }}>Editar</button>
                    <button onClick={() => { const ms2 = milestones.filter((_, j) => j !== i); setMilestones(ms2); }} style={{ padding: '4px 10px', border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>×</button>
                  </div>
                </div>
              ))}
              {milestones.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Sin hitos. Agrega el primero.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* AUDIT TAB */}
      {tab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Log de Auditoría</h2>
              <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>Registro de las últimas {auditLog.length} acciones del panel de administración.</p>
            </div>
            <button
              onClick={() => { clearAuditLog(); setAuditLog([]); toast('Log de auditoría limpiado'); }}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #fecaca', borderRadius: 4, color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Limpiar log
            </button>
          </div>
          {auditLog.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, border: '1px dashed var(--grey-200)', borderRadius: 6 }}>
              Sin actividad registrada todavía.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fecha</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>Accion</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>Actor</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>Objetivo</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap', color: 'var(--grey-500)', fontSize: 11 }}>
                        {new Date(entry.createdAt).toLocaleString('es-ES')}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--grey-100)', padding: '2px 6px', borderRadius: 3, color: 'var(--grey-700)' }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--black)' }}>{entry.actor}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--grey-600)' }}>
                        {entry.targetName ?? entry.targetId ?? '—'}
                        {entry.targetType && <span style={{ fontSize: 10, color: 'var(--grey-400)', marginLeft: 4 }}>({entry.targetType})</span>}
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--grey-500)', fontSize: 11 }}>{entry.details ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              <Field label="Contrasena (requerida)">
                <input style={inputStyle} type="password" required value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
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

      {/* EDIT TEAM MEMBER MODAL */}
      {editTeamIdx !== null && (
        <Modal onClose={() => setEditTeamIdx(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>
            {editTeamIdx < teamMembers.length ? 'Editar miembro' : 'Nuevo miembro'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nombre">
              <input style={inputStyle} value={editTeamForm.name} onChange={e => setEditTeamForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Rol / Cargo">
              <input style={inputStyle} value={editTeamForm.role} onChange={e => setEditTeamForm(f => ({ ...f, role: e.target.value }))} placeholder="CEO & Co-Founder" />
            </Field>
            <Field label="País (emoji)">
              <input style={inputStyle} value={editTeamForm.country} onChange={e => setEditTeamForm(f => ({ ...f, country: e.target.value }))} placeholder="🇦🇷" />
            </Field>
            <Field label="Bio">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={editTeamForm.bio} onChange={e => setEditTeamForm(f => ({ ...f, bio: e.target.value }))} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setEditTeamIdx(null)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button onClick={() => {
                if (!editTeamForm.name) return;
                const updated = [...teamMembers];
                updated[editTeamIdx] = { ...editTeamForm };
                setTeamMembers(updated);
                setEditTeamIdx(null);
              }} style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MILESTONE MODAL */}
      {editMsIdx !== null && (
        <Modal onClose={() => setEditMsIdx(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>
            {editMsIdx < milestones.length ? 'Editar hito' : 'Nuevo hito'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Año">
              <input style={inputStyle} value={editMsForm.year} onChange={e => setEditMsForm(f => ({ ...f, year: e.target.value }))} placeholder="2023" />
            </Field>
            <Field label="Evento">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={editMsForm.event} onChange={e => setEditMsForm(f => ({ ...f, event: e.target.value }))} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setEditMsIdx(null)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button onClick={() => {
                if (!editMsForm.year) return;
                const updated = [...milestones];
                updated[editMsIdx] = { ...editMsForm };
                setMilestones(updated);
                setEditMsIdx(null);
              }} style={{ padding: '9px 24px', background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
