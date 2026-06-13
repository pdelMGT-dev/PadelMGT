import React from 'react';

// CloneDialog — modal to clone a finished Quick Game or Tournament. Only the
// name, date and time are entered fresh; all other config is copied by the
// caller. A toggle controls whether the player roster is copied too.

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface CloneDialogProps {
  title: string;
  sourceName: string;
  name: string; setName: (v: string) => void;
  date: string; setDate: (v: string) => void;
  time: string; setTime: (v: string) => void;
  copyRoster: boolean; setCopyRoster: (v: boolean) => void;
  rosterCount: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CloneDialog({
  title, sourceName, name, setName, date, setDate, time, setTime,
  copyRoster, setCopyRoster, rosterCount, busy, onCancel, onConfirm,
}: CloneDialogProps) {
  const valid = !!(name.trim() && date && time);
  const lblS: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block' };
  const inpS: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--black)', outline: 'none', boxSizing: 'border-box' };
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 440, padding: '28px 28px 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 4 }}>Clonar</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 6px' }}>{title}</h2>
        <p style={{ fontSize: 12, color: 'var(--grey-500)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Se copia toda la configuración de <strong>{sourceName}</strong>. Solo definí el nuevo nombre, fecha y hora.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={lblS}>Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inpS} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <div>
            <label style={lblS}>Fecha *</label>
            <input type="date" value={date} min={today()} onChange={e => setDate(e.target.value)} style={inpS} />
          </div>
          <div>
            <label style={lblS}>Hora *</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inpS} />
          </div>
        </div>

        <button onClick={() => setCopyRoster(!copyRoster)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--grey-200)', background: 'var(--grey-50)', cursor: 'pointer', textAlign: 'left', marginBottom: 22 }}>
          <span style={{ width: 38, height: 22, borderRadius: 11, background: copyRoster ? 'var(--turf-green)' : 'var(--grey-300)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: copyRoster ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>Copiar jugadores</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--grey-500)', marginTop: 1 }}>
              {copyRoster ? `Se copian los ${rosterCount} jugadores/invitados (se les pide confirmar de nuevo).` : 'Empezás con la lista vacía (solo vos).'}
            </span>
          </span>
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--grey-600)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!valid || busy}
            style={{ flex: 1, padding: '12px', border: 'none', background: valid && !busy ? 'var(--black)' : 'var(--grey-200)', color: valid && !busy ? 'var(--neon)' : 'var(--grey-400)', cursor: valid && !busy ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {busy ? 'Clonando…' : 'Clonar →'}
          </button>
        </div>
      </div>
    </div>
  );
}
