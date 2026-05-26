'use client';

import React, { useState, useEffect } from 'react';
import { getSATournaments, type SATournament } from '@/lib/superadmin-data';

interface ScoreCorrectionRequest {
  id: string;
  type: 'tournament' | 'game';
  entityName: string;
  roundNum: number;
  courtNum: number;
  requestedBy: string;
  currentScore: string;
  requestedScore: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const MOCK_CORRECTIONS: ScoreCorrectionRequest[] = [
  { id: 'sc-1', type: 'tournament', entityName: 'Torneo Primavera Madrid', roundNum: 3, courtNum: 2, requestedBy: 'Carlos Rodríguez', currentScore: '2 – 1', requestedScore: '1 – 2', reason: 'Error al registrar el resultado. El marcador real fue 1-2 a favor del equipo contrario.', createdAt: '2026-05-24T10:30:00Z', status: 'pending' },
  { id: 'sc-2', type: 'tournament', entityName: 'Open Barcelona Padel', roundNum: 2, courtNum: 1, requestedBy: 'María García', currentScore: '3 – 0', requestedScore: '2 – 1', reason: 'Set score registrado incorrectamente por el sistema.', createdAt: '2026-05-23T16:45:00Z', status: 'pending' },
  { id: 'sc-3', type: 'tournament', entityName: 'Alicante Padel Open', roundNum: 5, courtNum: 3, requestedBy: 'Javier Torres', currentScore: '1 – 2', requestedScore: '2 – 1', reason: 'Cambio de resultado acordado entre ambos equipos.', createdAt: '2026-05-22T09:15:00Z', status: 'approved' },
];

const PAGE_SIZE = 15;

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '32px 36px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SATournament['status'] }) {
  const cfg = {
    ongoing:   { label: 'En curso',    bg: '#dcfce7', color: '#166534' },
    upcoming:  { label: 'Proximo',     bg: '#e0f2fe', color: '#0369a1' },
    completed: { label: 'Finalizado',  bg: '#f0f0f0', color: '#555' },
    cancelled: { label: 'Cancelado',   bg: '#fee2e2', color: '#991b1b' },
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

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<SATournament[]>([]);
  const [corrections, setCorrections] = useState<ScoreCorrectionRequest[]>(MOCK_CORRECTIONS);
  const [tab, setTab] = useState<'tournaments' | 'corrections'>('tournaments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [approveConfirm, setApproveConfirm] = useState<{ step: number; corrId: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ corrId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [selectedTournament, setSelectedTournament] = useState<SATournament | null>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => { setTournaments(getSATournaments()); }, []);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
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

  const filtered = tournaments.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.club.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchFormat = formatFilter === 'all' || t.format === formatFilter;
    return matchSearch && matchStatus && matchFormat;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    else if (sortKey === 'date') { av = a.date; bv = b.date; }
    else if (sortKey === 'players') { av = a.players; bv = b.players; }
    else if (sortKey === 'status') { av = a.status; bv = b.status; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pageTournaments = sorted.slice(pageStart, pageEnd);

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
    setCorrections(c => c.map(x => x.id === approveConfirm.corrId ? { ...x, status: 'approved' as const } : x));
    setApproveConfirm(null);
    toast('Correccion aprobada y aplicada');
  }

  function handleReject(corrId: string) {
    setCorrections(c => c.map(x => x.id === corrId ? { ...x, status: 'rejected' as const } : x));
    setRejectConfirm(null);
    toast('Correccion rechazada');
  }

  const corrById = Object.fromEntries(corrections.map(c => [c.id, c]));
  const approveTarget = approveConfirm ? corrById[approveConfirm.corrId] : null;
  const pendingCorrCount = corrections.filter(c => c.status === 'pending').length;

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
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Vista</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Torneos</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 24 }}>
        {([
          { key: 'tournaments', label: `Lista de Torneos (${tournaments.length})` },
          { key: 'corrections', label: `Correcciones de Score (${pendingCorrCount} pendiente${pendingCorrCount !== 1 ? 's' : ''})` },
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

      {tab === 'tournaments' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Buscar por nombre o club..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 280, outline: 'none', fontFamily: 'var(--font-body)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 170, outline: 'none', fontFamily: 'var(--font-body)' }}>
              <option value="all">Todos los estados</option>
              <option value="ongoing">En curso</option>
              <option value="upcoming">Proximos</option>
              <option value="completed">Finalizados</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <select value={formatFilter} onChange={e => { setFormatFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 13, width: 160, outline: 'none', fontFamily: 'var(--font-body)' }}>
              <option value="all">Todos los formatos</option>
              <option value="Americano">Americano</option>
              <option value="Mexicano">Mexicano</option>
              <option value="Round Robin">Round Robin</option>
            </select>
            <button
              onClick={() => exportCSV(filtered.map(t => ({ Nombre: t.name, Club: t.club, Ciudad: t.city, Fecha: t.date, Formato: t.format, Jugadores: t.players, Rondas: t.rounds, Estado: t.status })), 'torneos.csv')}
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
                    <th style={{ ...thStyle, cursor: 'default' }}>Club</th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Ciudad</th>
                    <th onClick={() => handleSort('date')} style={thStyle}>Fecha <SortIcon col="date" /></th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Formato</th>
                    <th onClick={() => handleSort('players')} style={{ ...thStyle, textAlign: 'center' }}>Jugadores <SortIcon col="players" /></th>
                    <th style={{ ...thStyle, cursor: 'default', textAlign: 'center' }}>Rondas</th>
                    <th onClick={() => handleSort('status')} style={thStyle}>Estado <SortIcon col="status" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pageTournaments.map(t => (
                    <tr key={t.id}
                      style={{ borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}
                      onClick={() => setSelectedTournament(t)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--black)' }}>{t.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--grey-600)', fontSize: 12 }}>{t.club}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--grey-600)', fontSize: 12 }}>{t.city}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{t.format}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{t.players}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>{t.rounds}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {pageTournaments.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>No se encontraron torneos</td>
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
      {selectedTournament && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1009 }} onClick={() => setSelectedTournament(null)} />
          <div
            style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', zIndex: 1010, overflowY: 'auto', padding: '32px 36px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Torneo</div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{selectedTournament.name}</h2>
              </div>
              <button onClick={() => setSelectedTournament(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: '0 0 0 16px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <StatusBadge status={selectedTournament.status} />
              <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--grey-500)' }}>{selectedTournament.date}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'Club', value: selectedTournament.club },
                { label: 'Ciudad', value: selectedTournament.city },
                { label: 'Formato', value: selectedTournament.format },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)', fontSize: 13 }}>
                  <span style={{ color: 'var(--grey-500)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Jugadores', value: selectedTournament.players },
                { label: 'Rondas Jugadas', value: selectedTournament.rounds },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--grey-50)', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8 }}>
              <button onClick={() => setSelectedTournament(null)} style={{ padding: '10px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Cerrar
              </button>
            </div>
          </div>
        </>
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Confirmar Modificacion de Score</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            Esta accion modificara el score permanentemente. ¿Confirmas la correccion de <strong>{approveTarget.entityName}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setApproveConfirm(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
            <button onClick={handleApproveFinal} style={{ padding: '9px 20px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Confirmar y aplicar</button>
          </div>
        </Modal>
      )}

      {/* REJECT CONFIRM */}
      {rejectConfirm && (
        <Modal onClose={() => setRejectConfirm(null)}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Rechazar Correccion</h2>
          <p style={{ color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 24 }}>
            ¿Confirmas el rechazo de esta solicitud de correccion de score? El score actual se mantendra.
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
