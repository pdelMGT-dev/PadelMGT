'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPersonalizado, type PersonalizadoCategory } from '@/lib/personalizado-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getPlayerClubs } from '@/lib/club-membership-store';
import { getSAClubs } from '@/lib/superadmin-data';

// ── Shared styles ──────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};
const sel: React.CSSProperties = {
  ...inp, appearance: 'none' as const, cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};
const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};

// ── WizardSteps ────────────────────────────────────────────────────────────────

const P_STEP_LABELS = ['I INFO', 'II CATEGORÍAS', 'III RESUMEN'];

function WizardSteps({ current }: { current: number }) {
  const progress = Math.round(((current - 1) / (P_STEP_LABELS.length - 1)) * 100);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
        {P_STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = current > num;
          const active = current === num;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? 'var(--turf-green)' : active ? 'var(--black)' : 'var(--grey-100)',
                  color: done || active ? '#fff' : 'var(--grey-400)',
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                  boxShadow: active ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {done ? '✓' : num}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: active ? 'var(--black)' : done ? 'var(--turf-green)' : 'var(--grey-300)',
                  whiteSpace: 'nowrap',
                }}>{label}</span>
              </div>
              {i < P_STEP_LABELS.length - 1 && (
                <div style={{ width: 40, height: 2, background: done ? 'var(--turf-green)' : 'var(--grey-200)', margin: '0 4px', marginBottom: 18, flexShrink: 0, transition: 'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--grey-100)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--turf-green)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ── NavBtns ────────────────────────────────────────────────────────────────────

function NavBtns({
  onBack, onNext, nextLabel = 'Siguiente →', disabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
      {onBack
        ? <button onClick={onBack} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
        : <div />}
      <button onClick={onNext} disabled={disabled} style={{ padding: '11px 28px', background: disabled ? 'var(--grey-200)' : 'var(--black)', color: disabled ? 'var(--grey-400)' : '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {nextLabel}
      </button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCategory(overrides: Partial<PersonalizadoCategory> = {}): PersonalizadoCategory {
  return {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: '',
    gender: 'libre',
    maxTeams: 8,
    ...overrides,
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const GENDER_LABELS: Record<string, string> = {
  libre: 'Libre', masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PersonalizadoWizardPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 fields
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [locationName, setLocationName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [courts, setCourts] = useState(2);

  // Mis Clubes — loaded from localStorage on mount
  type MyClub = { id: string; name: string; city: string; country: string; courts: number };
  const [myClubs, setMyClubs] = useState<MyClub[]>([]);
  useEffect(() => {
    if (!user) return;
    const memberships = getPlayerClubs(user.id);
    if (!memberships.length) return;
    const allClubs = getSAClubs();
    const clubMap = new Map(allClubs.map(c => [c.id, c]));
    setMyClubs(memberships.map(m => {
      const saClub = clubMap.get(m.clubId);
      return { id: m.clubId, name: m.clubName, city: m.clubCity, country: m.clubCountry, courts: saClub?.courts ?? 2 };
    }));
  }, [user]);

  // Step 2 fields
  const [categories, setCategories] = useState<PersonalizadoCategory[]>([makeCategory({ name: 'Categoría A' })]);

  function updateCategory(idx: number, patch: Partial<PersonalizadoCategory>) {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }

  function addCategory() {
    setCategories(prev => [...prev, makeCategory()]);
  }

  function removeCategory(idx: number) {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  }

  // Step 1 validation
  const step1Valid = name.trim() !== '' && date !== '' && time !== '';

  // Step 2 validation
  const step2Valid = categories.every(c => c.name.trim() !== '') && categories.length > 0;

  // Step 3 review
  const totalSlots = categories.reduce((s, c) => s + c.maxTeams, 0);

  // Compute opening price based on total slots
  const openPrice = totalSlots <= 16 ? 9 : totalSlots <= 32 ? 19 : totalSlots <= 64 ? 29 : 49;

  function handleCreate() {
    if (!user) return;
    const tournament = createPersonalizado({
      name: name.trim(),
      date,
      time,
      locationName: locationName.trim(),
      city: city.trim(),
      country: country.trim(),
      courts,
      categories,
      creatorId: user.id,
      creatorName: user.name,
    });
    router.push(`/dashboard/player/tournaments/personalizado/${tournament.id}`);
  }

  const pageHeader = (
    <div style={{ marginBottom: 32 }}>
      <Link
        href="/dashboard/player/tournaments"
        style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}
      >
        ← Mis Torneos
      </Link>
      <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
        Nuevo Torneo Personalizado
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, marginBottom: 6 }}>
        TORNEO PERSONALIZADO
      </h1>
      <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
        Crea un torneo multi-categoría con inscripción abierta
      </div>
    </div>
  );

  // ── STEP 1: Info Básica ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ padding: '40px clamp(16px, 4vw, 40px) 80px', maxWidth: 960, margin: '0 auto' }}>
        {pageHeader}
        <WizardSteps current={1} />

        <div style={card}>
          <div style={secTitle}>Nombre del torneo</div>
          <label style={lbl}>Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Copa Primavera, Torneo Mixto Club Norte…"
            style={inp}
          />
        </div>

        <div style={card}>
          <div style={secTitle}>Fecha y hora</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <div>
              <label style={lbl}>Fecha *</label>
              <input type="date" value={date} min={today()} onChange={e => setDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Hora *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={secTitle}>Ubicación</div>

          {/* Mis Clubes quick-fill */}
          {myClubs.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
                Mis Clubes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {myClubs.map(club => {
                  const selected = locationName === club.name && city === club.city;
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => { setLocationName(club.name); setCity(club.city); setCountry(club.country); setCourts(club.courts || 2); }}
                      style={{
                        padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${selected ? 'var(--black)' : 'var(--grey-200)'}`,
                        background: selected ? 'var(--black)' : 'transparent',
                        color: selected ? 'var(--neon)' : 'var(--grey-600)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {club.name}
                      {club.city ? <span style={{ fontWeight: 400, color: selected ? 'rgba(214,255,0,0.7)' : 'var(--grey-400)', marginLeft: 5 }}>{club.city}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Lugar / Club</label>
              <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Ej: Club Padel Norte" style={inp} />
            </div>
            <div>
              <label style={lbl}>Ciudad</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Ej: Buenos Aires" style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>País</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Ej: Argentina" style={inp} />
            </div>
            <div>
              <label style={lbl}>N° de Canchas</label>
              <select value={courts} onChange={e => setCourts(Number(e.target.value))} style={sel}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'cancha' : 'canchas'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <NavBtns onNext={() => setStep(2)} nextLabel="Siguiente → Categorías" disabled={!step1Valid} />
      </div>
    );
  }

  // ── STEP 2: Categorías ─────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={{ padding: '40px clamp(16px, 4vw, 40px) 80px', maxWidth: 960, margin: '0 auto' }}>
        {pageHeader}
        <WizardSteps current={2} />

        {categories.map((cat, idx) => (
          <div key={cat.id} style={{ ...card, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
              <div style={{ ...secTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                Categoría {idx + 1}
              </div>
              {categories.length > 1 && (
                <button
                  onClick={() => removeCategory(idx)}
                  style={{ background: 'none', border: '1px solid var(--grey-200)', color: 'var(--grey-400)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Eliminar
                </button>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Nombre *</label>
              <input
                type="text"
                value={cat.name}
                onChange={e => updateCategory(idx, { name: e.target.value })}
                placeholder="Ej: Masculino A, Femenino B, Mixto Open…"
                style={{ ...inp, borderColor: cat.name.trim() === '' ? '#f87171' : undefined }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Género</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['libre', 'masculino', 'femenino', 'mixto'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => updateCategory(idx, { gender: g })}
                    style={{
                      padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: '1px solid',
                      borderColor: cat.gender === g ? 'var(--black)' : 'var(--grey-200)',
                      background: cat.gender === g ? 'var(--black)' : '#fff',
                      color: cat.gender === g ? '#fff' : 'var(--grey-500)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    {GENDER_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, alignItems: 'end' }}>
              <div>
                <label style={lbl}>Máx. equipos</label>
                <select value={cat.maxTeams} onChange={e => updateCategory(idx, { maxTeams: Number(e.target.value) })} style={sel}>
                  {[4, 6, 8, 12, 16, 24, 32].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-400)', lineHeight: 1.5, paddingBottom: 10 }}>
                Podrás ajustar este número en el Panel de Control antes de comenzar el torneo. Define los cupos y el precio de apertura.
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addCategory}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '14px 20px',
            border: '2px dashed var(--grey-200)', background: 'transparent',
            color: 'var(--grey-400)', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            justifyContent: 'center', marginBottom: 16,
          }}
        >
          + Agregar Categoría
        </button>

        <NavBtns onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Siguiente → Resumen" disabled={!step2Valid} />
      </div>
    );
  }

  // ── STEP 3: Resumen ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px clamp(16px, 4vw, 40px) 80px', maxWidth: 960, margin: '0 auto' }}>
      {pageHeader}
      <WizardSteps current={3} />

      {/* Tournament info */}
      <div style={card}>
        <div style={secTitle}>Información del torneo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 2 }}>Nombre</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 2 }}>Fecha y hora</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{date} · {time}</div>
          </div>
          {locationName && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 2 }}>Lugar</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{locationName}</div>
            </div>
          )}
          {(city || country) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 2 }}>Ubicación</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{[city, country].filter(Boolean).join(', ')}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 2 }}>Canchas</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{courts}</div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div style={card}>
        <div style={secTitle}>Categorías ({categories.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map((cat) => (
            <div key={cat.id} style={{ padding: '12px 16px', border: '1px solid var(--grey-100)', background: 'var(--grey-50, #fafafa)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                    {GENDER_LABELS[cat.gender]} · Parejas
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{cat.maxTeams} cupos</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>Cupos totales</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>{totalSlots} {totalSlots === 1 ? 'equipo/pareja' : 'equipos/parejas'}</span>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ ...card, background: 'rgba(214,255,0,0.04)', borderColor: 'rgba(214,255,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>Precio para abrir inscripción</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--black)' }}>${openPrice}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--grey-100)' }}>
          ℹ️ El torneo se creará como borrador. Podrás abrir la inscripción cuando estés listo.
        </div>
      </div>

      <NavBtns
        onBack={() => setStep(2)}
        onNext={handleCreate}
        nextLabel="Crear Borrador"
        disabled={!user}
      />
    </div>
  );
}
