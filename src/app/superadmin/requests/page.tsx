'use client';

import React, { useState, useEffect } from 'react';
import {
  getScoreCorrections,
  updateScoreCorrectionStatus,
  fetchCorrectionsFromSupabase,
  mergeCorrectionsFromSupabase,
  type ScoreCorrectionRequest,
} from '@/lib/score-correction-store';
import { getSAClubs, saveSAClubs, type SAClub } from '@/lib/superadmin-data';

// ─── Unified request type ─────────────────────────────────────────────────────

type RequestType = 'score_correction' | 'club_approval' | 'plan_upgrade' | 'dispute';

interface UnifiedRequest {
  id: string;
  type: RequestType;
  title: string;
  subtitle: string;
  requestedBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  meta: Record<string, unknown>;
}

const TYPE_LABELS: Record<RequestType, string> = {
  score_correction: 'Corrección Score',
  club_approval:    'Aprobación Club',
  plan_upgrade:     'Cambio de Plan',
  dispute:          'Disputa',
};

const TYPE_COLORS: Record<RequestType, { bg: string; color: string }> = {
  score_correction: { bg: '#e0f2fe', color: '#0369a1' },
  club_approval:    { bg: '#f3e8ff', color: '#7c3aed' },
  plan_upgrade:     { bg: '#dcfce7', color: '#166534' },
  dispute:          { bg: '#fee2e2', color: '#991b1b' },
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', padding: '32px 36px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function adaptScoreCorrection(c: ScoreCorrectionRequest): UnifiedRequest {
  return {
    id: c.id,
    type: 'score_correction',
    title: `Corrección — ${c.entityName}`,
    subtitle: `Ronda ${c.roundNum} · Cancha ${c.courtNum} · ${c.currentScore} → ${c.requestedScore}`,
    requestedBy: c.requestedBy,
    createdAt: c.createdAt,
    status: c.status,
    meta: { correctionId: c.id, currentScore: c.currentScore, requestedScore: c.requestedScore, reason: c.reason, entityName: c.entityName, roundNum: c.roundNum, courtNum: c.courtNum, reviewedBy: c.reviewedBy, reviewedAt: c.reviewedAt },
  };
}

function adaptClubApproval(c: SAClub): UnifiedRequest {
  return {
    id: `club-${c.id}`,
    type: 'club_approval',
    title: `Aprobación — ${c.name}`,
    subtitle: `${c.city ?? ''} · ${c.courts ?? 0} canchas · ${c.members ?? 0} socios`,
    requestedBy: c.ownerName ?? c.adminEmail ?? '–',
    createdAt: c.joinedAt ?? new Date().toISOString(),
    status: c.status === 'pending' ? 'pending' : c.status === 'active' ? 'approved' : 'rejected',
    meta: { clubId: c.id, clubName: c.name, city: c.city, owner: c.ownerName ?? c.adminEmail ?? '–' },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const [requests, setRequests] = useState<UnifiedRequest[]>([]);
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [selectedReq, setSelectedReq] = useState<UnifiedRequest | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<UnifiedRequest | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<UnifiedRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);

  function loadRequests() {
    const corrections = getScoreCorrections();
    const clubs = getSAClubs().filter(c => c.status === 'pending' || c.status === 'active' || c.status === 'rejected');
    const all: UnifiedRequest[] = [
      ...corrections.map(adaptScoreCorrection),
      ...clubs.map(adaptClubApproval),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setRequests(all);
  }

  useEffect(() => {
    loadRequests();
    fetchCorrectionsFromSupabase().then(remote => {
      if (remote.length > 0) {
        mergeCorrectionsFromSupabase(remote);
        loadRequests();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function handleApprove(req: UnifiedRequest) {
    if (req.type === 'score_correction') {
      updateScoreCorrectionStatus(req.meta.correctionId as string, 'approved', {
        reviewedBy: 'Super Admin',
        reviewNotes: reviewNotes.trim() || undefined,
      });
    } else if (req.type === 'club_approval') {
      const clubs = getSAClubs();
      const updated = clubs.map(c => c.id === req.meta.clubId ? { ...c, status: 'active' as const } : c);
      saveSAClubs(updated);
    }
    setApproveConfirm(null);
    setSelectedReq(null);
    setReviewNotes('');
    loadRequests();
    toast('Solicitud aprobada');
  }

  function handleReject(req: UnifiedRequest) {
    if (req.type === 'score_correction') {
      updateScoreCorrectionStatus(req.meta.correctionId as string, 'rejected', {
        reviewedBy: 'Super Admin',
        reviewNotes: reviewNotes.trim() || undefined,
      });
    } else if (req.type === 'club_approval') {
      const clubs = getSAClubs();
      const updated = clubs.map(c => c.id === req.meta.clubId ? { ...c, status: 'rejected' as const } : c);
      saveSAClubs(updated);
    }
    setRejectConfirm(null);
    setSelectedReq(null);
    setReviewNotes('');
    loadRequests();
    toast('Solicitud rechazada');
  }

  const filtered = requests.filter(r => {
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchType && matchStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const typeBreakdown = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    type: type as RequestType,
    label,
    count: requests.filter(r => r.type === type && r.status === 'pending').length,
  }));

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
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Gestión</div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Centro de Solicitudes</h1>
        <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>
          {pendingCount > 0
            ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{pendingCount} solicitudes pendientes</span>
            : 'Sin solicitudes pendientes'}
        </div>
      </div>

      {/* KPI chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {typeBreakdown.map(({ type, label, count }) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
            style={{
              padding: '8px 16px', border: `1px solid ${typeFilter === type ? TYPE_COLORS[type].color : 'var(--grey-200)'}`,
              background: typeFilter === type ? TYPE_COLORS[type].bg : '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 20,
              color: typeFilter === type ? TYPE_COLORS[type].color : 'var(--grey-600)',
            }}
          >
            {label} {count > 0 && <span style={{ fontWeight: 700, color: count > 0 ? '#dc2626' : 'inherit' }}>({count})</span>}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--grey-200)' }}>
          {(['pending', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 16px', border: 'none', background: statusFilter === s ? 'var(--black)' : '#fff',
                color: statusFilter === s ? '#fff' : 'var(--grey-600)', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              {s === 'pending' ? 'Pendientes' : 'Todas'}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)', marginLeft: 'auto' }}>
          {filtered.length} solicitude{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--grey-400)', border: '1px solid var(--grey-200)', background: '#fff' }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            {statusFilter === 'pending' ? 'Sin pendientes' : 'Sin solicitudes'}
          </div>
          <div style={{ fontSize: 13 }}>
            {statusFilter === 'pending' ? 'No hay solicitudes que requieran acción.' : 'No hay solicitudes registradas todavía.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(req => {
            const tc = TYPE_COLORS[req.type];
            const isResolved = req.status !== 'pending';
            return (
              <div
                key={req.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${req.status === 'pending' ? 'var(--grey-200)' : req.status === 'approved' ? '#bbf7d0' : '#fecaca'}`,
                  padding: '16px 20px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.1s',
                }}
                onClick={() => setSelectedReq(req)}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                        {TYPE_LABELS[req.type]}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--black)' }}>{req.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 4 }}>{req.subtitle}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                      Por: <strong>{req.requestedBy}</strong> · {new Date(req.createdAt).toLocaleString('es-ES')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: req.status === 'pending' ? '#fef9c3' : req.status === 'approved' ? '#dcfce7' : '#fee2e2',
                      color: req.status === 'pending' ? '#854d0e' : req.status === 'approved' ? '#166534' : '#991b1b',
                    }}>
                      {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                    {!isResolved && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setRejectConfirm(req); setReviewNotes(''); }}
                          style={{ padding: '5px 12px', border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#dc2626' }}
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setApproveConfirm(req); setReviewNotes(''); }}
                          style={{ padding: '5px 12px', border: 'none', background: 'var(--turf-green)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                        >
                          Aprobar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedReq && (
        <Modal onClose={() => setSelectedReq(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <span style={{ background: TYPE_COLORS[selectedReq.type].bg, color: TYPE_COLORS[selectedReq.type].color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {TYPE_LABELS[selectedReq.type]}
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '8px 0 0', textTransform: 'uppercase' }}>
                {selectedReq.title}
              </h2>
            </div>
            <button onClick={() => setSelectedReq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: 0, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Solicitado por</div>
                <div style={{ fontWeight: 600 }}>{selectedReq.requestedBy}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Fecha</div>
                <div>{new Date(selectedReq.createdAt).toLocaleString('es-ES')}</div>
              </div>
            </div>

            {selectedReq.type === 'score_correction' && (
              <>
                <div style={{ display: 'flex', gap: 24, padding: '16px', background: 'var(--grey-50)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Score actual</div>
                    <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#dc2626' }}>{selectedReq.meta.currentScore as string}</div>
                  </div>
                  <div style={{ fontSize: 20, color: 'var(--grey-300)', display: 'flex', alignItems: 'center' }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 4 }}>Score solicitado</div>
                    <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--turf-green)' }}>{selectedReq.meta.requestedScore as string}</div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>
                  "{selectedReq.meta.reason as string}"
                </div>
              </>
            )}

            {selectedReq.type === 'club_approval' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Club', value: selectedReq.meta.clubName as string },
                  { label: 'Ciudad', value: selectedReq.meta.city as string ?? '–' },
                  { label: 'Propietario', value: selectedReq.meta.owner as string ?? '–' },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontWeight: 600 }}>{row.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Status */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Estado</div>
              <span style={{
                padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: selectedReq.status === 'pending' ? '#fef9c3' : selectedReq.status === 'approved' ? '#dcfce7' : '#fee2e2',
                color: selectedReq.status === 'pending' ? '#854d0e' : selectedReq.status === 'approved' ? '#166534' : '#991b1b',
              }}>
                {selectedReq.status === 'pending' ? 'Pendiente' : selectedReq.status === 'approved' ? 'Aprobado' : 'Rechazado'}
              </span>
              {selectedReq.meta.reviewedBy ? (
                <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--grey-400)' }}>
                  por {String(selectedReq.meta.reviewedBy)} · {selectedReq.meta.reviewedAt ? new Date(String(selectedReq.meta.reviewedAt)).toLocaleString('es-ES') : '–'}
                </span>
              ) : null}
            </div>

            {selectedReq.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--grey-100)' }}>
                <button onClick={() => { setSelectedReq(null); setRejectConfirm(selectedReq); setReviewNotes(''); }} style={{ padding: '9px 20px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Rechazar
                </button>
                <button onClick={() => { setSelectedReq(null); setApproveConfirm(selectedReq); setReviewNotes(''); }} style={{ padding: '9px 24px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  Aprobar solicitud
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* APPROVE CONFIRM */}
      {approveConfirm && (
        <Modal onClose={() => setApproveConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Confirmar aprobación</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 16, fontSize: 13 }}>
            ¿Aprobás la solicitud <strong>{approveConfirm.title}</strong>? Esta acción no puede deshacerse.
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', display: 'block', marginBottom: 6 }}>
              Notas (opcional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              placeholder="Motivo o comentario de la decisión..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', minHeight: 72, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setApproveConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={() => handleApprove(approveConfirm)} style={{ padding: '9px 24px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Confirmar aprobación</button>
          </div>
        </Modal>
      )}

      {/* REJECT CONFIRM */}
      {rejectConfirm && (
        <Modal onClose={() => setRejectConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Confirmar rechazo</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 16, fontSize: 13 }}>
            ¿Rechazás la solicitud <strong>{rejectConfirm.title}</strong>?
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', display: 'block', marginBottom: 6 }}>
              Motivo del rechazo (opcional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              placeholder="Explicá por qué se rechaza..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', minHeight: 72, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setRejectConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={() => handleReject(rejectConfirm)} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Rechazar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
