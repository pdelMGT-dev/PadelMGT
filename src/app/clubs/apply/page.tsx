'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Shared wizard styles ──────────────────────────────────────────────────────

const secTitle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--grey-400)',
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
  padding: '24px',
  marginBottom: 16,
};

const inp: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: '1px solid var(--grey-200)',
  padding: '10px 14px',
  fontSize: 14,
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--grey-500)',
  marginBottom: 8,
};

// ── Steps component ───────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = ['Info del club', 'Instalaciones', 'Contacto y envío'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {steps.map((label, i) => {
        const filled = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  background: filled ? 'var(--black)' : active ? 'var(--neon)' : '#fff',
                  color: filled ? '#fff' : active ? 'var(--black)' : 'var(--grey-400)',
                  border: filled
                    ? 'none'
                    : active
                    ? 'none'
                    : '2px solid var(--grey-300)',
                  flexShrink: 0,
                }}
              >
                {filled ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--black)' : filled ? 'var(--grey-500)' : 'var(--grey-400)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: filled ? 'var(--black)' : 'var(--grey-200)',
                  margin: '0 8px',
                  marginBottom: 22,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── NavBtns ───────────────────────────────────────────────────────────────────

function NavBtns({
  onBack,
  onNext,
  nextLabel = 'Siguiente →',
  nextDisabled = false,
  nextStyle,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
      {onBack ? (
        <button className="btn btn-secondary" onClick={onBack}>
          ← Atrás
        </button>
      ) : (
        <div />
      )}
      <button
        className="btn"
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          background: 'var(--black)',
          color: '#fff',
          opacity: nextDisabled ? 0.4 : 1,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          ...nextStyle,
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ClubType = 'privado' | 'público' | 'federación';

export default function ClubApplyPage() {
  const [step, setStep] = useState<0 | 1 | 2 | 99>(0);

  // Step 0
  const [clubName, setClubName] = useState('');
  const [clubType, setClubType] = useState<ClubType>('privado');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  // Step 1
  const [courtsCount, setCourtsCount] = useState(4);
  const [courtTypes, setCourtTypes] = useState<Set<string>>(new Set());
  const [amenities, setAmenities] = useState<Set<string>>(new Set());

  // Step 2
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [message, setMessage] = useState('');

  const [requestId, setRequestId] = useState('');

  const toggleSet = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const handleSubmit = () => {
    const id = `CR-${Date.now()}`;
    const entry = {
      id,
      clubName,
      clubType,
      country,
      city,
      address,
      description,
      courtsCount,
      courtTypes: [...courtTypes],
      amenities: [...amenities],
      ownerName,
      ownerEmail,
      ownerPhone,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('padelmgt_club_requests') ?? '[]');
    localStorage.setItem('padelmgt_club_requests', JSON.stringify([...existing, entry]));
    setRequestId(id);
    setStep(99);
  };

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--grey-50)',
    fontFamily: 'var(--font-body)',
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: 640,
    margin: '0 auto',
    padding: '48px 24px 96px',
  };

  const AMENITY_LIST = [
    'Vestuarios',
    'Bar/Cafetería',
    'Estacionamiento',
    'Pro Shop',
    'Iluminación nocturna',
    'Academia',
    'Wifi',
  ];

  const COURT_TYPE_LIST = ['Indoor', 'Outdoor', 'Cubierto'];

  // ── Step 99: Success ──────────────────────────────────────────────────────

  if (step === 99) {
    return (
      <div
        style={{
          ...pageStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%', padding: '48px 24px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 64,
              color: 'var(--turf-green)',
              lineHeight: 1,
              marginBottom: 24,
            }}
          >
            ✓
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--black)',
              margin: '0 0 16px',
            }}
          >
            ¡Solicitud enviada!
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--grey-500)',
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Revisaremos tu solicitud en las próximas 48 horas y te contactaremos a{' '}
            <strong style={{ color: 'var(--black)' }}>{ownerEmail}</strong>.
          </p>
          <div
            style={{
              background: 'var(--black)',
              color: '#fff',
              padding: '20px 24px',
              marginBottom: 32,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
              Tu código de seguimiento
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                letterSpacing: '0.06em',
                color: 'var(--neon)',
              }}
            >
              {requestId}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn btn-secondary">
              Volver al inicio
            </Link>
            <Link href="/clubs/apply/status" className="btn btn-primary">
              Ver estado de mi solicitud
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 0: Info básica ───────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div style={pageStyle}>
        <div style={innerStyle}>
          <div style={{ marginBottom: 40 }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--black)',
                margin: '0 0 12px',
              }}
            >
              Registrar mi club
            </h1>
            <p style={{ fontSize: 15, color: 'var(--grey-500)', margin: 0, lineHeight: 1.5 }}>
              Completá el formulario para solicitar el alta de tu club en la plataforma.
            </p>
          </div>

          <Steps current={0} />

          {/* Card: Club info */}
          <div style={card}>
            <div style={secTitle}>Información del club</div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Nombre del club</label>
              <input
                style={inp}
                placeholder="Ej. Club de Pádel Madrid Central"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
              />
            </div>
            <div>
              <label style={lbl}>Tipo de club</label>
              <select
                style={{ ...inp, appearance: 'none' as const }}
                value={clubType}
                onChange={(e) => setClubType(e.target.value as ClubType)}
              >
                <option value="privado">Privado</option>
                <option value="público">Público</option>
                <option value="federación">Federación</option>
              </select>
            </div>
          </div>

          {/* Card: Location */}
          <div style={card}>
            <div style={secTitle}>Ubicación</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>País</label>
                <input
                  style={inp}
                  placeholder="España"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div>
                <label style={lbl}>Ciudad</label>
                <input
                  style={inp}
                  placeholder="Madrid"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label style={lbl}>Dirección</label>
              <input
                style={inp}
                placeholder="Calle, número, código postal"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Card: Description */}
          <div style={card}>
            <div style={secTitle}>Descripción</div>
            <div>
              <label style={lbl}>Sobre tu club</label>
              <textarea
                style={{ ...inp, resize: 'vertical' as const }}
                rows={3}
                placeholder="Contanos sobre tu club..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <NavBtns
            onNext={() => setStep(1)}
            nextDisabled={!clubName.trim() || !city.trim()}
          />
        </div>
      </div>
    );
  }

  // ── Step 1: Instalaciones ─────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div style={pageStyle}>
        <div style={innerStyle}>
          <Steps current={1} />

          {/* Card: Canchas */}
          <div style={card}>
            <div style={secTitle}>Canchas</div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Número de canchas</label>
              <input
                type="number"
                min={1}
                max={50}
                style={{ ...inp, width: 120 }}
                value={courtsCount}
                onChange={(e) => setCourtsCount(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={lbl}>Tipo de canchas</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {COURT_TYPE_LIST.map((type) => {
                  const on = courtTypes.has(type);
                  return (
                    <div
                      key={type}
                      onClick={() => setCourtTypes(toggleSet(courtTypes, type))}
                      style={{
                        padding: '10px 16px',
                        border: `1px solid ${on ? 'var(--black)' : 'var(--grey-200)'}`,
                        background: on ? 'var(--black)' : '#fff',
                        color: on ? '#fff' : 'var(--black)',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        userSelect: 'none' as const,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: `2px solid ${on ? '#fff' : 'var(--grey-300)'}`,
                          borderRadius: 3,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {on ? '✓' : ''}
                      </span>
                      {type}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card: Amenities */}
          <div style={card}>
            <div style={secTitle}>Instalaciones y servicios</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 8,
              }}
            >
              {AMENITY_LIST.map((a) => {
                const on = amenities.has(a);
                return (
                  <div
                    key={a}
                    onClick={() => setAmenities(toggleSet(amenities, a))}
                    style={{
                      padding: '10px 14px',
                      border: `1px solid ${on ? 'transparent' : 'var(--grey-200)'}`,
                      background: on ? 'var(--black)' : '#fff',
                      color: on ? '#fff' : 'var(--black)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: 'center' as const,
                      userSelect: 'none' as const,
                      transition: 'all 0.15s',
                    }}
                  >
                    {a}
                  </div>
                );
              })}
            </div>
          </div>

          <NavBtns onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </div>
      </div>
    );
  }

  // ── Step 2: Contacto y envío ──────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <Steps current={2} />

        {/* Card: Owner info */}
        <div style={card}>
          <div style={secTitle}>Responsable del club</div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Nombre completo</label>
            <input
              style={inp}
              placeholder="Tu nombre"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Email</label>
            <input
              type="email"
              style={inp}
              placeholder="tu@email.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={lbl}>Teléfono</label>
            <input
              type="tel"
              style={inp}
              placeholder="+34 600 000 000"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Card: Photos (simulated) */}
        <div style={card}>
          <div style={secTitle}>Fotos del club (simulado)</div>
          <div
            style={{
              border: '2px dashed var(--grey-300)',
              background: 'var(--grey-50)',
              padding: '32px 24px',
              textAlign: 'center' as const,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
            <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: 0, lineHeight: 1.5 }}>
              Las fotos se podrán subir desde el panel de administración una vez aprobado el club.
            </p>
          </div>
        </div>

        {/* Card: Additional message */}
        <div style={card}>
          <div style={secTitle}>Mensaje adicional (opcional)</div>
          <textarea
            style={{ ...inp, resize: 'vertical' as const }}
            rows={3}
            placeholder="¿Algo más que quieras contarnos?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <NavBtns
          onBack={() => setStep(1)}
          onNext={handleSubmit}
          nextLabel="Enviar solicitud →"
          nextDisabled={!ownerName.trim() || !ownerEmail.trim()}
          nextStyle={{ background: 'var(--neon)', color: 'var(--black)', fontWeight: 700 }}
        />
      </div>
    </div>
  );
}
