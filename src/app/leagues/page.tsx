'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PublicLeague {
  id: string;
  name: string;
  organizer: string;
  members: number;
  isOpen: boolean;
  code: string;
  createdAt: string;
}

export default function LeaguesPage() {
  const [search, setSearch] = useState('');
  const [inscription, setInscription] = useState('Todas');
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!supabase) { setLoaded(true); return; }
      const [{ data: lRows }, { data: mRows }] = await Promise.all([
        supabase.from('player_leagues').select('*').eq('is_public', true).order('created_at', { ascending: false }),
        supabase.from('league_members').select('league_id'),
      ]);
      if (!alive) return;

      const memberCount = new Map<string, number>();
      for (const m of (mRows ?? []) as { league_id: string }[]) {
        memberCount.set(m.league_id, (memberCount.get(m.league_id) ?? 0) + 1);
      }

      setLeagues(((lRows ?? []) as Record<string, unknown>[]).map(l => ({
        id: l.id as string,
        name: (l.name as string) ?? '',
        organizer: (l.created_by_name as string) ?? '',
        members: memberCount.get(l.id as string) ?? 0,
        isOpen: !!l.is_open,
        code: (l.code as string) ?? '',
        createdAt: (l.created_at as string) ?? '',
      })));
      setLoaded(true);
    }

    load();
    return () => { alive = false; };
  }, []);

  // Filter option lists are derived from the loaded leagues' own fields.
  const hasOpen = leagues.some(l => l.isOpen);
  const hasClosed = leagues.some(l => !l.isOpen);
  const inscriptionOptions = ['Todas', ...(hasOpen ? ['Abierta'] : []), ...(hasClosed ? ['Cerrada'] : [])];

  const filtered = leagues.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.organizer.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);
    const matchInscription = inscription === 'Todas' || (inscription === 'Abierta' ? l.isOpen : !l.isOpen);
    return matchSearch && matchInscription;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Temporadas largas. Ascensos y descensos.</div>
          <h1 className="page-title">LIGAS</h1>
          <p className="page-sub">Tabla automática. Encuentra una liga o crea la tuya.</p>
        </div>
      </div>

      <section style={{ padding: 'clamp(40px, 5vw, 64px) clamp(20px, 4vw, 48px) clamp(48px, 7vw, 96px)' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Search / filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 48, alignItems: 'center', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px', minWidth: 160 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ligas..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 14, outline: 'none', width: '100%' }} />
            </div>
            {inscriptionOptions.length > 1 && (
              <select value={inscription} onChange={e => setInscription(e.target.value)} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
                {inscriptionOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 24, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} liga{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>

          {!loaded ? (
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>
          ) : leagues.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', background: 'var(--grey-50)', padding: 'clamp(48px, 8vw, 88px) 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◐</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Aún no hay ligas públicas</h3>
              <p style={{ color: 'var(--grey-500)', fontSize: 14, margin: 0 }}>Sé el primero en crear una liga y competir por temporadas.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', background: 'var(--grey-50)', padding: 48, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
              Sin resultados para esa búsqueda.
            </div>
          ) : (
            /* Table */
            <div className="table-scroll" style={{ border: '1px solid var(--grey-200)' }}>
              <table className="rank-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>Liga</th>
                    <th>Organizador</th>
                    <th>Código</th>
                    <th>Miembros</th>
                    <th>Inscripción</th>
                    <th>Creada</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id}>
                      <td style={{ paddingLeft: 24, fontWeight: 600, fontSize: 15 }}>{l.name}</td>
                      <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{l.organizer || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.code || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textAlign: 'center' }}>{l.members}</td>
                      <td>
                        <span className="badge" style={{
                          background: l.isOpen ? 'var(--turf-green)' : '#f5f5f5',
                          color: l.isOpen ? '#fff' : 'var(--black)',
                          border: l.isOpen ? 'none' : '1px solid var(--grey-300)',
                        }}>
                          {l.isOpen ? 'Abierta' : 'Cerrada'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{l.createdAt ? new Date(l.createdAt).getFullYear() : '—'}</td>
                      <td><Link href={`/l/${l.code}`} className="btn btn-secondary btn-sm">Ver →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿TIENES UNA LIGA?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Gestiona temporadas largas, ascensos y descensos con tabla automática.</p>
          </div>
          <Link href="/signup?role=player" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Crear Liga</Link>
        </div>
      </section>
    </div>
  );
}
