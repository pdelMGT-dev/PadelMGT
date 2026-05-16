'use client';

import { useEffect, useState } from 'react';
import { getAllGames } from '@/lib/game-store';
import type { ActiveGame } from '@/lib/game-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

type ClubPlayer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: string;
  points: number;
  joined: string;
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 16,
};

const inp: React.CSSProperties = {
  display: 'block', width: '100%', border: '1px solid var(--grey-200)',
  padding: '10px 14px', fontSize: 14, background: '#fff', outline: 'none',
  boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8,
};

// ── Data ───────────────────────────────────────────────────────────────────────

const LEVELS = ['1', '2', '3', '4', '5', '6', '7', 'Pro'];
const LEVEL_LABELS: Record<string, string> = {
  '1': 'Nivel 1 — Iniciación', '2': 'Nivel 2 — Básico', '3': 'Nivel 3 — Intermedio bajo',
  '4': 'Nivel 4 — Intermedio', '5': 'Nivel 5 — Intermedio alto',
  '6': 'Nivel 6 — Avanzado', '7': 'Nivel 7 — Competición', 'Pro': 'Pro',
};

const INITIAL_PLAYERS: ClubPlayer[] = [
  { id: 'cp1', name: 'Ana Rodríguez',   email: 'ana@email.com',    phone: '+54 11 4444-0001', level: '4', points: 1150, joined: '2024-03-01' },
  { id: 'cp2', name: 'Carlos Vega',     email: 'carlos@email.com', phone: '+54 11 4444-0002', level: '5', points: 1320, joined: '2024-01-15' },
  { id: 'cp3', name: 'Sofía López',     email: 'sofia@email.com',  phone: '+54 11 4444-0003', level: '3', points: 870,  joined: '2024-06-10' },
  { id: 'cp4', name: 'Marcos Herrera',  email: 'marcos@email.com', phone: '+54 11 4444-0004', level: '5', points: 1280, joined: '2023-11-20' },
  { id: 'cp5', name: 'Laura Torres',    email: 'laura@email.com',  phone: '+54 11 4444-0005', level: '3', points: 750,  joined: '2025-02-08' },
  { id: 'cp6', name: 'Diego Fernández', email: 'diego@email.com',  phone: '+54 11 4444-0006', level: '6', points: 1490, joined: '2023-09-01' },
  { id: 'cp7', name: 'Valentina Cruz',  email: 'valen@email.com',  phone: '+54 11 4444-0007', level: '2', points: 580,  joined: '2025-04-12' },
  { id: 'cp8', name: 'Rodrigo Peña',    email: 'rodri@email.com',  phone: '+54 11 4444-0008', level: '4', points: 1100, joined: '2024-08-30' },
];

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(text: string): ClubPlayer[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const cols = line.split(',').map(c => c.trim());
    return {
      id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:   cols[0] ?? '',
      email:  cols[1] ?? '',
      phone:  cols[2] ?? '',
      level:  LEVELS.includes(cols[3] ?? '') ? (cols[3] ?? '3') : '3',
      points: parseInt(cols[4] ?? '0', 10) || 0,
      joined: new Date().toISOString().slice(0, 10),
    };
  }).filter(p => p.name);
}

// ── Sub-sections ───────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'jugadores' | 'galeria' | 'canchas' | 'torneos' | 'comunicados';

function ResumenSection({ players, games }: { players: ClubPlayer[]; games: ActiveGame[] }) {
  const live     = games.filter(g => g.status === 'live').length;
  const upcoming = games.filter(g => g.status === 'starting_soon' || g.status === 'created').length;
  const finished = games.filter(g => g.status === 'finished').length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Jugadores',       value: String(players.length) },
          { label: 'Juegos en vivo',  value: String(live),     color: 'var(--turf-green)' },
          { label: 'Próximos',        value: String(upcoming), color: '#f5a623' },
          { label: 'Finalizados',     value: String(finished) },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', padding: '24px 20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, lineHeight: 1, color: s.color ?? 'var(--black)' }}>{s.value}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Crear torneo', href: '/dashboard/player/tournaments', desc: 'Organizá un nuevo torneo para los miembros', bg: 'var(--neon)', color: 'var(--black)' },
          { label: 'Crear juego rápido', href: '/dashboard/player/quick-game', desc: 'Armá un Americano o Mexicano express', bg: 'var(--black)', color: '#fff' },
          { label: 'Solicitar alta de club', href: '/clubs/apply', desc: 'Registrar un nuevo club en la plataforma', bg: '#fff', color: 'var(--black)', border: '1px solid var(--grey-200)' },
        ].map(a => (
          <a key={a.label} href={a.href} style={{ display: 'block', textDecoration: 'none', padding: '24px', background: a.bg, color: a.color, border: a.border }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>{a.label}</div>
            <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.5 }}>{a.desc}</div>
          </a>
        ))}
      </div>

      {games.filter(g => g.status !== 'finished').length > 0 && (
        <div>
          <div style={secTitle}>Juegos activos</div>
          {games.filter(g => g.status !== 'finished').map(g => {
            const sc: Record<string, string> = { live: 'var(--turf-green)', starting_soon: '#f5a623', created: '#7c3aed' };
            const href = ['americano', 'mexicano'].includes(g.format)
              ? `/dashboard/player/quick-game/${g.id}`
              : `/dashboard/player/tournaments/${g.id}`;
            return (
              <div key={g.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{g.date} · {g.players.length}/{g.maxPlayers} jugadores</div>
                </div>
                <span className="chip" style={{ fontSize: 9 }}>{g.format}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: sc[g.status] ?? 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>● {g.status}</span>
                <a href={href} style={{ padding: '6px 14px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gestionar →</a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayersSection({ players, setPlayers }: { players: ClubPlayer[]; setPlayers: React.Dispatch<React.SetStateAction<ClubPlayer[]>> }) {
  const [mode, setMode] = useState<'list' | 'add' | 'import'>('list');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<ClubPlayer[]>([]);
  const [csvParsed, setCsvParsed] = useState(false);
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', level: '3', points: '' });

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function handleAdd() {
    if (!form.name.trim()) return;
    const p: ClubPlayer = { id: `p-${Date.now()}`, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), level: form.level, points: parseInt(form.points || '0', 10) || 0, joined: new Date().toISOString().slice(0, 10) };
    setPlayers(prev => [p, ...prev]);
    setForm({ name: '', email: '', phone: '', level: '3', points: '' });
    setMode('list');
    showToast(`${p.name} agregado.`);
  }

  function handleParseCSV() {
    const parsed = parseCSV(csvText);
    setCsvPreview(parsed);
    setCsvParsed(true);
  }

  function handleImportConfirm() {
    setPlayers(prev => [...csvPreview, ...prev]);
    showToast(`${csvPreview.length} jugadores importados.`);
    setCsvText(''); setCsvPreview([]); setCsvParsed(false); setMode('list');
  }

  function handleDelete(id: string) { setPlayers(prev => prev.filter(p => p.id !== id)); setDeleteId(null); showToast('Jugador eliminado.'); }

  const filtered = players.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())) &&
    (levelFilter === 'Todos' || p.level === levelFilter)
  );

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: 'var(--turf-green)', color: '#fff', padding: '12px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Base de Jugadores</div>
          <div style={{ fontSize: 13, color: 'var(--grey-400)', marginTop: 4 }}>{players.length} jugadores registrados</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('import')} style={{ padding: '9px 18px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-600)' }}>Importar CSV</button>
          <button onClick={() => setMode(mode === 'add' ? 'list' : 'add')} style={{ padding: '9px 18px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ Agregar jugador</button>
        </div>
      </div>

      {mode === 'add' && (
        <div style={{ ...card, borderLeft: '3px solid var(--turf-green)', marginBottom: 24 }}>
          <div style={{ ...secTitle, marginBottom: 20 }}>Nuevo jugador</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div><label style={lbl}>Nombre completo *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ana García" style={inp} /></div>
            <div><label style={lbl}>Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ana@email.com" style={inp} /></div>
            <div><label style={lbl}>Teléfono</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+54 11 ..." style={inp} /></div>
            <div>
              <label style={lbl}>Nivel de juego</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} style={{ ...inp, appearance: 'none' as const }}>
                {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Puntos de ranking</label><input type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} placeholder="0" style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={!form.name.trim()} style={{ padding: '10px 24px', background: form.name.trim() ? 'var(--black)' : 'var(--grey-200)', color: form.name.trim() ? '#fff' : 'var(--grey-400)', border: 'none', cursor: form.name.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Guardar jugador</button>
            <button onClick={() => setMode('list')} style={{ padding: '10px 20px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--grey-500)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <div style={{ ...card, borderLeft: '3px solid var(--court-blue)', marginBottom: 24 }}>
          <div style={{ ...secTitle, marginBottom: 16 }}>Importar desde CSV</div>
          <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
            Pegá los datos en formato CSV. Columnas: <strong>Nombre, Email, Teléfono, Nivel (1–7/Pro), Puntos</strong>
          </div>
          <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '12px 16px', marginBottom: 12, fontSize: 12, color: 'var(--grey-500)', fontFamily: 'monospace' }}>
            Ejemplo:<br />Ana García, ana@club.com, +54 11 1234, 4, 1100<br />Carlos Vega, carlos@club.com, +54 11 5678, 5, 1320
          </div>
          <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setCsvParsed(false); setCsvPreview([]); }} rows={6} placeholder="Pegá aquí tu CSV..." style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', marginBottom: 12 }} />
          {!csvParsed ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleParseCSV} disabled={!csvText.trim()} style={{ padding: '10px 24px', background: csvText.trim() ? 'var(--court-blue)' : 'var(--grey-200)', color: '#fff', border: 'none', cursor: csvText.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vista previa →</button>
              <button onClick={() => setMode('list')} style={{ padding: '10px 16px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', fontWeight: 600 }}>Cancelar</button>
            </div>
          ) : csvPreview.length > 0 ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--turf-green)' }}>✓ {csvPreview.length} jugadores detectados</div>
              <div style={{ border: '1px solid var(--grey-200)', marginBottom: 16, overflow: 'auto', maxHeight: 220 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                    {['Nombre', 'Email', 'Teléfono', 'Nivel', 'Puntos'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {csvPreview.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--grey-500)' }}>{p.email || '–'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--grey-500)' }}>{p.phone || '–'}</td>
                        <td style={{ padding: '8px 12px' }}><span className="chip" style={{ fontSize: 9 }}>Nv. {p.level}</span></td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{p.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleImportConfirm} style={{ padding: '10px 24px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Importar {csvPreview.length} jugadores →</button>
                <button onClick={() => { setCsvParsed(false); setCsvPreview([]); setCsvText(''); }} style={{ padding: '10px 16px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', fontWeight: 600 }}>Limpiar</button>
                <button onClick={() => setMode('list')} style={{ padding: '10px 16px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', fontWeight: 600 }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#e53e3e', marginTop: 8 }}>No se detectaron jugadores válidos. Revisá el formato.</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..." style={{ ...inp, maxWidth: 240 }} />
        <div style={{ display: 'flex', gap: 1, background: 'var(--grey-200)' }}>
          {['Todos', ...LEVELS].map(l => (
            <button key={l} onClick={() => setLevelFilter(l)} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: 'none', cursor: 'pointer', background: levelFilter === l ? 'var(--black)' : '#fff', color: levelFilter === l ? '#fff' : 'var(--grey-500)', whiteSpace: 'nowrap' }}>
              {l === 'Todos' ? 'Todos' : `Nv.${l}`}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ border: '1px solid var(--grey-200)', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
              {['Jugador', 'Contacto', 'Nivel', 'Puntos', 'Miembro desde', ''].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>No se encontraron jugadores.</td></tr>}
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--grey-100)', background: i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{p.email || '–'}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.phone || '–'}</div>
                </td>
                <td style={{ padding: '12px 14px' }}><span className="chip" style={{ fontSize: 9 }}>Nv. {p.level}</span></td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{p.points.toLocaleString()}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>
                  {p.joined ? new Date(p.joined).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  {deleteId === p.id ? (
                    <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', background: '#e53e3e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Eliminar</button>
                      <button onClick={() => setDeleteId(null)} style={{ padding: '4px 10px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--grey-500)' }}>Cancelar</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteId(p.id)} style={{ padding: '4px 10px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--grey-500)' }}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ClubDashboardPage() {
  const [tab, setTab] = useState<Tab>('resumen');

  const [players, setPlayers] = useState<ClubPlayer[]>(() => {
    if (typeof window === 'undefined') return INITIAL_PLAYERS;
    try { const s = localStorage.getItem('padelmgt_club_players'); return s ? JSON.parse(s) : INITIAL_PLAYERS; } catch { return INITIAL_PLAYERS; }
  });

  const [games, setGames] = useState<ActiveGame[]>([]);

  const [Sections, setSections] = useState<{
    GallerySection: React.ComponentType;
    CourtsSection: React.ComponentType;
    AnnouncementsSection: React.ComponentType;
  } | null>(null);

  useEffect(() => {
    try { localStorage.setItem('padelmgt_club_players', JSON.stringify(players)); } catch {}
  }, [players]);

  useEffect(() => { setGames(getAllGames()); }, []);

  useEffect(() => {
    import('./sections').then(m => setSections({ GallerySection: m.GallerySection, CourtsSection: m.CourtsSection, AnnouncementsSection: m.AnnouncementsSection })).catch(() => {});
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'resumen',     label: 'Resumen' },
    { key: 'jugadores',   label: `Jugadores (${players.length})` },
    { key: 'galeria',     label: 'Galería' },
    { key: 'canchas',     label: 'Canchas' },
    { key: 'torneos',     label: 'Torneos' },
    { key: 'comunicados', label: 'Comunicados' },
  ];

  return (
    <div style={{ paddingBottom: 80, fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ background: 'var(--black)', color: '#fff', padding: '40px 40px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <a href="/dashboard/player/quick-game" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em', display: 'inline-block', marginBottom: 12 }}>← Dashboard</a>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 8 }}>Panel de administración</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px', color: '#fff' }}>CLUB BARRIO NORTE</h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Buenos Aires, Argentina · 6 canchas · Miembro desde Mar 2024</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/dashboard/player/tournaments" style={{ padding: '10px 20px', background: 'var(--neon)', color: 'var(--black)', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Crear torneo</a>
            <a href="/clubs/1" style={{ padding: '10px 20px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ver perfil público →</a>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '2px solid var(--grey-200)', background: '#fff', paddingLeft: 40, display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: tab === t.key ? 'var(--black)' : 'var(--grey-400)', borderBottom: tab === t.key ? '2px solid var(--black)' : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '40px 40px 0' }}>
        {tab === 'resumen'     && <ResumenSection players={players} games={games} />}
        {tab === 'jugadores'   && <PlayersSection players={players} setPlayers={setPlayers} />}
        {tab === 'galeria'     && (Sections ? <Sections.GallerySection /> : <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Cargando galería...</div>)}
        {tab === 'canchas'     && (Sections ? <Sections.CourtsSection /> : <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Cargando canchas...</div>)}
        {tab === 'comunicados' && (Sections ? <Sections.AnnouncementsSection /> : <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Cargando comunicados...</div>)}

        {tab === 'torneos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Torneos y Juegos</div>
              <a href="/dashboard/player/tournaments" style={{ padding: '9px 20px', background: 'var(--neon)', color: 'var(--black)', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Crear nuevo →</a>
            </div>
            {games.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', border: '1px dashed var(--grey-300)', color: 'var(--grey-400)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>No hay torneos aún</div>
                <a href="/dashboard/player/tournaments" style={{ display: 'inline-block', marginTop: 12, padding: '12px 28px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Crear torneo</a>
              </div>
            ) : games.map(g => {
              const sc: Record<string, string> = { live: 'var(--turf-green)', starting_soon: '#f5a623', created: '#7c3aed', finished: 'var(--grey-400)' };
              const href = ['americano', 'mexicano'].includes(g.format) ? `/dashboard/player/quick-game/${g.id}` : `/dashboard/player/tournaments/${g.id}`;
              return (
                <div key={g.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{g.date} · {g.time} · {g.players.length}/{g.maxPlayers} jugadores · <span className="chip" style={{ fontSize: 9 }}>{g.format}</span></div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: sc[g.status] ?? 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 8px', border: `1px solid ${sc[g.status] ?? 'var(--grey-200)'}` }}>{g.status}</span>
                  <a href={href} style={{ padding: '7px 16px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gestionar →</a>
                  <a href={`/tournament/${g.code}`} target="_blank" style={{ padding: '7px 16px', border: '1px solid var(--grey-300)', color: 'var(--grey-500)', textDecoration: 'none', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ver público</a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
