'use client';

import React, { useState, useEffect } from 'react';
import { fetchClubContent, pushClubContent } from '@/lib/club-content-client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared style helpers
// ─────────────────────────────────────────────────────────────────────────────

const cardBase: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--grey-500)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--grey-200)',
  background: '#fff',
  fontSize: 14,
  color: 'var(--black)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 1: GallerySection
// ─────────────────────────────────────────────────────────────────────────────

interface Photo {
  id: string;
  url: string;
  title: string;
  caption: string;
}

function loadPhotos(): Photo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('padelmgt_club_gallery');
    if (raw) return JSON.parse(raw) as Photo[];
  } catch {
    // ignore
  }
  return [];
}

function GallerySection() {
  const [photos, setPhotos] = useState<Photo[]>(() => loadPhotos());
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const skipNextPush = React.useRef(true);

  useEffect(() => {
    fetchClubContent<Photo[]>('gallery').then(remote => { if (remote !== null) setPhotos(remote); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('padelmgt_club_gallery', JSON.stringify(photos));
    // Skip the mount-time run: pushing here would race the fetch above and
    // could clobber the real server data with a stale local snapshot.
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    pushClubContent('gallery', photos).catch(err => console.warn('[club-content] gallery sync failed:', err));
  }, [photos]);

  function handleSave() {
    if (!formTitle.trim()) return;
    const newPhoto: Photo = {
      id: Date.now().toString(),
      url: formUrl,
      title: formTitle,
      caption: formCaption,
    };
    setPhotos((prev) => [...prev, newPhoto]);
    setFormUrl('');
    setFormTitle('');
    setFormCaption('');
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--black)' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          GALERÍA DEL CLUB
        </h2>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--black)', color: '#fff', borderRadius: 0 }}
          onClick={() => setShowForm((v) => !v)}
        >
          + Agregar foto
        </button>
      </div>

      {/* Add photo form */}
      {showForm && (
        <div style={{ ...cardBase, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>URL de imagen</label>
              <input
                type="url"
                style={inputStyle}
                placeholder="https://... o dejar vacío para placeholder"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Título de la foto *</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Ej: Cancha 2 — Vista lateral"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Descripción</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Descripción breve de la foto"
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--black)', color: '#fff', borderRadius: 0 }}
                onClick={handleSave}
              >
                Guardar foto
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 0 }}
                onClick={() => { setShowForm(false); setFormUrl(''); setFormTitle(''); setFormCaption(''); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, border: '1px dashed var(--grey-200)' }}>
          No hay fotos en la galería. Agregá la primera.
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ ...cardBase, position: 'relative', overflow: 'hidden' }}>
              {/* Image area */}
              <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--grey-100)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: 'var(--grey-400)',
                  }}>
                    <span style={{ fontSize: 32 }}>📷</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '0 12px' }}>{photo.title}</span>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={() => setDeleteConfirm(deleteConfirm === photo.id ? null : photo.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-body)',
                  }}
                  aria-label="Eliminar foto"
                >
                  ×
                </button>
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 16px 14px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4 }}>
                  {photo.title}
                </div>
                {photo.caption && (
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{photo.caption}</div>
                )}
              </div>

              {/* Delete confirmation inline */}
              {deleteConfirm === photo.id && (
                <div style={{ borderTop: '1px solid var(--grey-200)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
                  <span style={{ fontSize: 13, color: 'var(--grey-600)', flex: 1 }}>¿Eliminar?</span>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#e53e3e', color: '#fff', borderRadius: 0 }}
                    onClick={() => handleDelete(photo.id)}
                  >
                    Sí
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: 0 }}
                    onClick={() => setDeleteConfirm(null)}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 2: CourtsSection
// ─────────────────────────────────────────────────────────────────────────────

type CourtType = 'Indoor' | 'Outdoor' | 'Cubierta';
type CourtSurface = 'Moqueta' | 'Cristal' | 'Cemento' | 'Hierba';
type CourtStatus = 'disponible' | 'ocupada' | 'mantenimiento';

interface Court {
  id: string;
  name: string;
  type: CourtType;
  surface: CourtSurface;
  status: CourtStatus;
  notes: string;
}

interface CourtFormData {
  name: string;
  type: CourtType;
  surface: CourtSurface;
  status: CourtStatus;
  notes: string;
}

const EMPTY_COURT_FORM: CourtFormData = {
  name: '',
  type: 'Indoor',
  surface: 'Moqueta',
  status: 'disponible',
  notes: '',
};

function loadCourts(): Court[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('padelmgt_club_courts');
    if (raw) return JSON.parse(raw) as Court[];
  } catch {
    // ignore
  }
  return [];
}

function statusDotColor(status: CourtStatus): string {
  if (status === 'disponible') return 'var(--turf-green)';
  if (status === 'ocupada') return '#e53e3e';
  return '#f5a623';
}

function statusLabel(status: CourtStatus): string {
  if (status === 'disponible') return 'Disponible';
  if (status === 'ocupada') return 'Ocupada';
  return 'Mantenimiento';
}

function CourtsSection() {
  const [courts, setCourts] = useState<Court[]>(() => loadCourts());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourtFormData>(EMPTY_COURT_FORM);
  const skipNextPush = React.useRef(true);

  useEffect(() => {
    fetchClubContent<Court[]>('courts').then(remote => { if (remote !== null) setCourts(remote); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('padelmgt_club_courts', JSON.stringify(courts));
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    pushClubContent('courts', courts).catch(err => console.warn('[club-content] courts sync failed:', err));
  }, [courts]);

  const countByStatus = (s: CourtStatus) => courts.filter((c) => c.status === s).length;

  function handleStatusToggle(id: string, status: CourtStatus) {
    setCourts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }

  function handleEdit(court: Court) {
    setEditingId(court.id);
    setFormData({ name: court.name, type: court.type, surface: court.surface, status: court.status, notes: court.notes });
    setShowAddForm(false);
  }

  function handleSaveEdit() {
    if (!formData.name.trim()) return;
    setCourts((prev) => prev.map((c) => c.id === editingId ? { ...c, ...formData } : c));
    setEditingId(null);
    setFormData(EMPTY_COURT_FORM);
  }

  function handleAddCourt() {
    if (!formData.name.trim()) return;
    const newCourt: Court = { id: Date.now().toString(), ...formData };
    setCourts((prev) => [...prev, newCourt]);
    setFormData(EMPTY_COURT_FORM);
    setShowAddForm(false);
  }

  const statBoxes: { label: string; count: number; color: string }[] = [
    { label: 'Disponibles', count: countByStatus('disponible'), color: 'var(--turf-green)' },
    { label: 'Ocupadas',    count: countByStatus('ocupada'),    color: '#e53e3e' },
    { label: 'Mantenimiento', count: countByStatus('mantenimiento'), color: '#f5a623' },
  ];

  const courtTypes: CourtType[] = ['Indoor', 'Outdoor', 'Cubierta'];
  const courtSurfaces: CourtSurface[] = ['Moqueta', 'Cristal', 'Cemento', 'Hierba'];
  const courtStatuses: CourtStatus[] = ['disponible', 'ocupada', 'mantenimiento'];

  function CourtForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
    return (
      <div style={{ ...cardBase, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre *</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Ej: Cancha 7"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              style={{ ...inputStyle }}
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as CourtType }))}
            >
              {courtTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Superficie</label>
            <select
              style={{ ...inputStyle }}
              value={formData.surface}
              onChange={(e) => setFormData((p) => ({ ...p, surface: e.target.value as CourtSurface }))}
            >
              {courtSurfaces.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Estado</label>
            <select
              style={{ ...inputStyle }}
              value={formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as CourtStatus }))}
            >
              {courtStatuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Notas</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Observaciones opcionales"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--black)', color: '#fff', borderRadius: 0 }}
            onClick={onSave}
          >
            Guardar
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 0 }}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--black)' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          GESTIÓN DE CANCHAS
        </h2>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--black)', color: '#fff', borderRadius: 0 }}
          onClick={() => { setShowAddForm((v) => !v); setEditingId(null); setFormData(EMPTY_COURT_FORM); }}
        >
          + Agregar cancha
        </button>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 24 }}>
        {statBoxes.map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '18px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: s.color, lineHeight: 1 }}>
              {s.count}
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <CourtForm
          onSave={handleAddCourt}
          onCancel={() => { setShowAddForm(false); setFormData(EMPTY_COURT_FORM); }}
        />
      )}

      {/* Courts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {courts.map((court) => (
          <React.Fragment key={court.id}>
            <div style={{ ...cardBase, padding: 20 }}>
              {/* Top row: name + status dot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{court.name}</span>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: statusDotColor(court.status),
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Chips: type + surface */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="chip" style={{ fontSize: 11 }}>{court.type}</span>
                <span className="chip" style={{ fontSize: 11 }}>{court.surface}</span>
              </div>

              {/* Notes */}
              {court.notes && (
                <div style={{ fontSize: 12, color: 'var(--grey-400)', fontStyle: 'italic', marginBottom: 12 }}>
                  {court.notes}
                </div>
              )}

              {/* Status toggle row */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {courtStatuses.map((s) => (
                  <button
                    key={s}
                    className="btn btn-sm"
                    style={{
                      borderRadius: 0,
                      fontSize: 10,
                      padding: '4px 8px',
                      background: court.status === s ? 'var(--black)' : '#fff',
                      color: court.status === s ? '#fff' : 'var(--grey-500)',
                      border: '1px solid var(--grey-200)',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleStatusToggle(court.id, s)}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>

              {/* Edit button */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 0, width: '100%' }}
                onClick={() => editingId === court.id ? setEditingId(null) : handleEdit(court)}
              >
                {editingId === court.id ? 'Cerrar edición' : 'Editar'}
              </button>
            </div>

            {/* Inline edit form — spans full width below the card */}
            {editingId === court.id && (
              <div style={{ gridColumn: '1 / -1' }}>
                <CourtForm
                  onSave={handleSaveEdit}
                  onCancel={() => { setEditingId(null); setFormData(EMPTY_COURT_FORM); }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 3: AnnouncementsSection
// ─────────────────────────────────────────────────────────────────────────────

type AnnouncementCategory = 'Torneo' | 'Evento' | 'Comunicado' | 'Oferta';

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  date: string;
  pinned: boolean;
}

interface AnnouncementFormData {
  title: string;
  body: string;
  category: AnnouncementCategory;
  date: string;
  pinned: boolean;
}

const EMPTY_ANNOUNCEMENT_FORM: AnnouncementFormData = {
  title: '',
  body: '',
  category: 'Comunicado',
  date: new Date().toISOString().slice(0, 10),
  pinned: false,
};

function loadAnnouncements(): Announcement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('padelmgt_club_announcements');
    if (raw) return JSON.parse(raw) as Announcement[];
  } catch {
    // ignore
  }
  return [];
}

function categoryBadgeStyle(category: AnnouncementCategory): React.CSSProperties {
  switch (category) {
    case 'Torneo':
      return { background: 'rgba(40,167,69,0.12)', color: 'var(--turf-green)' };
    case 'Evento':
      return { background: 'rgba(0,82,204,0.1)', color: 'var(--court-blue)' };
    case 'Comunicado':
      return { background: 'var(--grey-100)', color: 'var(--grey-500)' };
    case 'Oferta':
      return { background: 'var(--neon)', color: 'var(--black)' };
  }
}

function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadAnnouncements());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>(EMPTY_ANNOUNCEMENT_FORM);
  const skipNextPush = React.useRef(true);

  useEffect(() => {
    fetchClubContent<Announcement[]>('announcements').then(remote => { if (remote !== null) setAnnouncements(remote); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('padelmgt_club_announcements', JSON.stringify(announcements));
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    pushClubContent('announcements', announcements).catch(err => console.warn('[club-content] announcements sync failed:', err));
  }, [announcements]);

  function handlePublish() {
    if (!formData.title.trim() || !formData.body.trim()) return;
    const newAnn: Announcement = { id: Date.now().toString(), ...formData };
    setAnnouncements((prev) => [...prev, newAnn]);
    setFormData(EMPTY_ANNOUNCEMENT_FORM);
    setShowForm(false);
  }

  function handleTogglePin(id: string) {
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, pinned: !a.pinned } : a));
  }

  function handleDelete(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.date.localeCompare(a.date);
  });

  const categories: AnnouncementCategory[] = ['Torneo', 'Evento', 'Comunicado', 'Oferta'];

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--black)' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          COMUNICADOS Y PROMOCIONES
        </h2>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--black)', color: '#fff', borderRadius: 0 }}
          onClick={() => setShowForm((v) => !v)}
        >
          + Nuevo comunicado
        </button>
      </div>

      {/* New announcement form */}
      {showForm && (
        <div style={{ ...cardBase, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Título *</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Título del comunicado"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Contenido *</label>
              <textarea
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Texto del comunicado..."
                value={formData.body}
                onChange={(e) => setFormData((p) => ({ ...p, body: e.target.value }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select
                  style={{ ...inputStyle }}
                  value={formData.category}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value as AnnouncementCategory }))}
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="form-pinned"
                checked={formData.pinned}
                onChange={(e) => setFormData((p) => ({ ...p, pinned: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="form-pinned" style={{ fontSize: 14, color: 'var(--grey-600)', cursor: 'pointer' }}>
                Destacar comunicado
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--black)', color: '#fff', borderRadius: 0 }}
                onClick={handlePublish}
              >
                Publicar
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 0 }}
                onClick={() => { setShowForm(false); setFormData(EMPTY_ANNOUNCEMENT_FORM); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {sorted.length === 0 && (
        <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14, border: '1px dashed var(--grey-200)' }}>
          No hay comunicados publicados.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sorted.map((ann) => (
          <div key={ann.id} style={{ ...cardBase, padding: 24 }}>
            {/* Category badge + pinned indicator */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span
                className="badge"
                style={{
                  ...categoryBadgeStyle(ann.category),
                  padding: '3px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {ann.category}
              </span>
              {ann.pinned && (
                <span
                  className="badge"
                  style={{
                    background: 'var(--grey-900)',
                    color: '#fff',
                    padding: '3px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  📌 Destacado
                </span>
              )}
            </div>

            {/* Title + date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
                {ann.title}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--grey-400)', flexShrink: 0, paddingTop: 4 }}>
                {ann.date}
              </span>
            </div>

            {/* Body */}
            <p style={{ fontSize: 13, color: 'var(--grey-600)', lineHeight: 1.6, margin: '0 0 16px' }}>
              {ann.body}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 0 }}
                onClick={() => handleTogglePin(ann.id)}
              >
                {ann.pinned ? 'Quitar destaque' : 'Destacar'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#e53e3e', color: '#fff', borderRadius: 0 }}
                onClick={() => handleDelete(ann.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { GallerySection, CourtsSection, AnnouncementsSection };
