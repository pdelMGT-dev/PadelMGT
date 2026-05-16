'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClubRequest {
  id: string;
  clubName: string;
  clubType: string;
  country: string;
  city: string;
  address: string;
  description: string;
  courtsCount: number;
  courtTypes: string[];
  amenities: string[];
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
}

type Tab = 'overview' | 'requests' | 'clubs' | 'users';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CLUBS = [
  { id: 'c1', name: 'Club Madrid Central',  city: 'Madrid',    courts: 6,  members: 240, status: 'Activo' },
  { id: 'c2', name: 'Pádel Barcelona Nord', city: 'Barcelona', courts: 4,  members: 180, status: 'Activo' },
  { id: 'c3', name: 'Valencia Pádel Club',  city: 'Valencia',  courts: 8,  members: 310, status: 'Activo' },
  { id: 'c4', name: 'Sevilla Pádel Center', city: 'Sevilla',   courts: 5,  members: 155, status: 'Activo' },
  { id: 'c5', name: 'Club Bilbao Pádel',    city: 'Bilbao',    courts: 3,  members: 98,  status: 'Inactivo' },
  { id: 'c6', name: 'Málaga Sport Club',    city: 'Málaga',    courts: 7,  members: 220, status: 'Activo' },
];

const MOCK_USERS = [
  { id: 'u1', name: 'Carlos Martínez',   email: 'carlos@example.com',   role: 'player',     joined: '12 Ene 2026', status: 'Activo' },
  { id: 'u2', name: 'Ana López',          email: 'ana@example.com',       role: 'club_admin', joined: '15 Ene 2026', status: 'Activo' },
  { id: 'u3', name: 'Roberto Sánchez',   email: 'roberto@example.com',  role: 'player',     joined: '02 Feb 2026', status: 'Activo' },
  { id: 'u4', name: 'Lucía Fernández',   email: 'lucia@example.com',    role: 'player',     joined: '14 Feb 2026', status: 'Activo' },
  { id: 'u5', name: 'Diego Herrera',     email: 'diego@example.com',    role: 'club_admin', joined: '01 Mar 2026', status: 'Suspendido' },
  { id: 'u6', name: 'Valentina Cruz',    email: 'valentina@example.com',role: 'player',     joined: '20 Mar 2026', status: 'Activo' },
  { id: 'u7', name: 'Marcos Rodríguez',  email: 'marcos@example.com',   role: 'player',     joined: '05 Abr 2026', status: 'Activo' },
  { id: 'u8', name: 'Camila Ortiz',      email: 'camila@example.com',   role: 'club_admin', joined: '22 Abr 2026', status: 'Activo' },
];

const RECENT_ACTIVITY = [
  'Club Madrid Central fue aprobado · hace 2h',
  'Nuevo jugador registrado: Carlos Martínez · hace 3h',
  'Torneo "Abierto de Mayo" creado en Valencia · hace 5h',
  'Club Bilbao Pádel actualizó sus instalaciones · hace 8h',
  'Solicitud rechazada: Club Sin Nombre (datos incompletos) · hace 12h',
];

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3000);
    return () => clearTimeout(t);
  }, [onHide]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        background: 'var(--black)',
        color: '#fff',
        padding: '14px 20px',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 260,
      }}
    >
      <span style={{ color: 'var(--turf-green)', fontSize: 16 }}>✓</span>
      {message}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; requestId: string; reason: string }>({
    open: false,
    requestId: '',
    reason: '',
  });
  const [toast, setToast] = useState('');

  // Load requests from localStorage (SSR-safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('padelmgt_club_requests');
      if (stored) {
        try {
          setRequests(JSON.parse(stored));
        } catch {
          setRequests([]);
        }
      }
    }
  }, []);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const saveRequests = (updated: ClubRequest[]) => {
    setRequests(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('padelmgt_club_requests', JSON.stringify(updated));
    }
  };

  const handleApprove = (id: string) => {
    const updated = requests.map((r) =>
      r.id === id ? { ...r, status: 'approved' as const } : r,
    );
    saveRequests(updated);
    setToast('Club aprobado correctamente');
  };

  const openReject = (id: string) => {
    setRejectModal({ open: true, requestId: id, reason: '' });
  };

  const handleReject = () => {
    if (!rejectModal.reason.trim()) return;
    const updated = requests.map((r) =>
      r.id === rejectModal.requestId
        ? { ...r, status: 'rejected' as const, rejectReason: rejectModal.reason }
        : r,
    );
    saveRequests(updated);
    setRejectModal({ open: false, requestId: '', reason: '' });
    setToast('Solicitud rechazada');
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    padding: '40px 48px 96px',
    maxWidth: 1280,
    margin: '0 auto',
    fontFamily: 'var(--font-body)',
  };

  const statCardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid var(--grey-200)',
    padding: '24px 28px',
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {toast && <Toast message={toast} onHide={() => setToast('')} />}

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--grey-400)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Plataforma PadelMGT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: 'var(--black)',
              margin: 0,
            }}
          >
            Super Admin
          </h1>
          <span
            className="badge"
            style={{ background: 'var(--black)', color: 'var(--neon)' }}
          >
            Admin
          </span>
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--grey-200)',
          marginBottom: 40,
        }}
      >
        {[
          { label: 'Clubes activos',           value: '24' },
          { label: 'Jugadores registrados',     value: '1,847' },
          { label: 'Torneos este mes',          value: '38' },
          { label: 'Solicitudes pendientes',    value: String(pendingCount) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--black)',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--grey-400)',
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {(
          [
            { id: 'overview',  label: 'Overview' },
            { id: 'requests',  label: `Solicitudes${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id: 'clubs',     label: 'Clubes' },
            { id: 'users',     label: 'Usuarios' },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            className={`pill-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginBottom: 40,
            }}
          >
            {[
              { label: 'Juegos activos hoy',  value: '12',   unit: 'partidos' },
              { label: 'Revenue este mes',    value: '$4,820', unit: 'USD' },
              { label: 'NPS Score',           value: '8.4',  unit: '/ 10' },
              { label: 'Retención mensual',   value: '94%',  unit: 'usuarios' },
            ].map((s) => (
              <div key={s.label} style={statCardStyle}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 48,
                    fontWeight: 600,
                    color: 'var(--black)',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    marginBottom: 4,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 4 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--grey-400)',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid var(--grey-100)',
              }}
            >
              Actividad reciente
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RECENT_ACTIVITY.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 0',
                    borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--grey-100)' : 'none',
                    fontSize: 14,
                    color: 'var(--grey-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--grey-300)', flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Requests ────────────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 24px',
                color: 'var(--grey-400)',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: 'var(--grey-100)',
                  borderRadius: '50%',
                  margin: '0 auto 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                📋
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--grey-500)', marginBottom: 8 }}>
                No hay solicitudes pendientes
              </div>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>
                Las solicitudes de nuevos clubes aparecerán aquí.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--grey-200)',
                    padding: '24px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 24,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          color: 'var(--black)',
                          margin: '0 0 4px',
                        }}
                      >
                        {req.clubName}
                      </h2>
                      <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>
                        {req.city}{req.country ? `, ${req.country}` : ''} · {req.ownerEmail}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                        {new Date(req.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {req.status === 'pending' && (
                        <span className="badge" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}>
                          Pendiente
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="badge" style={{ background: '#d4edda', color: '#155724' }}>
                          Aprobado
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>
                          Rechazado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chips */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <span className="chip">{req.courtsCount} canchas</span>
                    {req.courtTypes.map((ct) => (
                      <span key={ct} className="chip">{ct}</span>
                    ))}
                    {req.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="chip">{a}</span>
                    ))}
                    {req.amenities.length > 4 && (
                      <span className="chip">+{req.amenities.length - 4} más</span>
                    )}
                  </div>

                  {/* Reject reason display */}
                  {req.status === 'rejected' && req.rejectReason && (
                    <div
                      style={{
                        padding: '10px 14px',
                        background: '#fff5f5',
                        border: '1px solid #fed7d7',
                        fontSize: 13,
                        color: '#c53030',
                        marginBottom: 16,
                      }}
                    >
                      <strong>Motivo de rechazo:</strong> {req.rejectReason}
                    </div>
                  )}

                  {/* Action buttons (only for pending) */}
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleApprove(req.id)}
                        style={{ background: 'var(--turf-green)', color: '#fff', border: 'none' }}
                      >
                        Aprobar
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => openReject(req.id)}
                        style={{ background: '#fff', color: '#e53e3e', border: '1px solid #e53e3e' }}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}

                  {/* Inline reject form */}
                  {rejectModal.open && rejectModal.requestId === req.id && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '16px',
                        background: 'var(--grey-50)',
                        border: '1px solid var(--grey-200)',
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--grey-500)',
                          marginBottom: 8,
                        }}
                      >
                        Motivo de rechazo *
                      </label>
                      <textarea
                        rows={3}
                        style={{
                          display: 'block',
                          width: '100%',
                          border: '1px solid var(--grey-200)',
                          padding: '10px 14px',
                          fontSize: 14,
                          background: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                          marginBottom: 12,
                        }}
                        placeholder="Indica el motivo del rechazo..."
                        value={rejectModal.reason}
                        onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-sm"
                          onClick={handleReject}
                          disabled={!rejectModal.reason.trim()}
                          style={{
                            background: '#e53e3e',
                            color: '#fff',
                            border: 'none',
                            opacity: rejectModal.reason.trim() ? 1 : 0.4,
                            cursor: rejectModal.reason.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setRejectModal({ open: false, requestId: '', reason: '' })}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Clubs ───────────────────────────────────────────────────────── */}
      {activeTab === 'clubs' && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', overflow: 'auto' }}>
          <table className="rank-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Ciudad</th>
                <th>Canchas</th>
                <th>Miembros</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CLUBS.map((club) => (
                <tr key={club.id}>
                  <td style={{ fontFamily: 'var(--font-display)', color: 'var(--grey-400)', fontSize: 12 }}>
                    {club.id.toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{club.name}</td>
                  <td style={{ color: 'var(--grey-500)' }}>{club.city}</td>
                  <td>{club.courts}</td>
                  <td>{club.members}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: club.status === 'Activo' ? '#d4edda' : 'var(--grey-100)',
                        color: club.status === 'Activo' ? '#155724' : 'var(--grey-500)',
                      }}
                    >
                      {club.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      href="/dashboard/club"
                      style={{
                        fontSize: 13,
                        color: 'var(--court-blue)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Ver dashboard →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Users ───────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', overflow: 'auto' }}>
          <table className="rank-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Registro</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_USERS.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{user.email}</td>
                  <td>
                    <span
                      className="chip"
                      style={{
                        background: user.role === 'club_admin' ? 'var(--court-blue)' : 'var(--grey-100)',
                        color: user.role === 'club_admin' ? '#fff' : 'var(--black)',
                        cursor: 'default',
                      }}
                    >
                      {user.role === 'club_admin' ? 'Club Admin' : 'Jugador'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{user.joined}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: user.status === 'Activo' ? '#d4edda' : '#f8d7da',
                        color: user.status === 'Activo' ? '#155724' : '#721c24',
                      }}
                    >
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
