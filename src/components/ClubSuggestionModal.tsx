'use client';

import { useState } from 'react';
import { submitClubSuggestion } from '@/lib/club-suggestion-store';

const COUNTRIES: string[] = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Portugal', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela', 'Estados Unidos', 'Otro',
];

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8,
};
const inp: React.CSSProperties = {
  display: 'block', width: '100%', border: '1px solid var(--grey-200)',
  padding: '11px 14px', fontSize: 14, background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font-body)', borderRadius: 0,
};

export default function ClubSuggestionModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [courts, setCourts] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim())    { setError('Ingresá el nombre del club.'); return; }
    if (!country)        { setError('Seleccioná el país.'); return; }
    if (!city.trim())    { setError('Ingresá la ciudad.'); return; }
    setSubmitting(true);
    try {
      const id = await submitClubSuggestion({
        name: name.trim(),
        country,
        city: city.trim(),
        courts: Number(courts) || 0,
        website: website.trim(),
        contactEmail: contactEmail.trim() || undefined,
      });
      setDoneId(id);
    } catch {
      setError('No se pudo enviar la solicitud. Intentá de nuevo.');
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{ background: '#fff', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div style={{ background: 'var(--black)', padding: '24px 28px', position: 'relative' }}>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
          >×</button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', margin: 0 }}>
            {doneId ? '¡Solicitud enviada!' : 'Solicitar agregar club'}
          </h2>
          {!doneId && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '6px 0 0' }}>
              ¿No encontrás tu club? Sugerilo y lo revisaremos para agregarlo.
            </p>
          )}
        </div>

        {doneId ? (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, color: 'var(--turf-green)', lineHeight: 1, marginBottom: 16 }}>✓</div>
            <p style={{ fontSize: 14, color: 'var(--grey-600)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Gracias. Revisaremos la existencia del club y, una vez verificado, lo agregaremos al directorio.
            </p>
            <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>
                Código de seguimiento
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.04em', color: 'var(--black)' }}>
                {doneId}
              </div>
            </div>
            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', borderRadius: 0, padding: '13px' }}>
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Nombre del club *</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Club de Pádel Central" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>País *</label>
                <select style={{ ...inp, appearance: 'none' as const, cursor: 'pointer', color: country ? 'var(--black)' : 'var(--grey-400)' }} value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="" disabled>Seleccionar</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Ciudad *</label>
                <input style={inp} value={city} onChange={e => setCity(e.target.value)} placeholder="Madrid" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Número de pistas (canchas)</label>
              <input style={{ ...inp, width: 140 }} type="number" min={0} max={100} value={courts} onChange={e => setCourts(e.target.value)} placeholder="4" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Link de website o Google Maps</label>
              <input style={inp} type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://maps.google.com/..." />
              <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 5 }}>
                Nos ayuda a verificar que el club existe.
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Tu email (opcional)</label>
              <input style={inp} type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="tu@email.com" />
              <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 5 }}>
                Te avisamos cuando el club esté disponible.
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', borderRadius: 0, padding: '14px', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Enviando...' : 'Enviar solicitud →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
