'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlayerByEmail } from '@/lib/player-store';

export default function PlayerRankingPage() {
  const [pts, setPts] = useState<number>(0);
  const [rank, setRank] = useState<number | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const u = JSON.parse(raw) as { email?: string; name?: string; rankingPoints?: number; ranking?: number };
        const full = u.email ? getPlayerByEmail(u.email) : null;
        setPts(full?.rankingPoints ?? u.rankingPoints ?? 0);
        setRank(full?.ranking ?? u.ranking ?? null);
        setName(full?.name ?? u.name ?? '');
      }
    } catch { /* silent */ }
  }, []);

  const hasData = pts > 0;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Posición actual</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MI RANKING</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        <div style={{ background: 'var(--black)', padding: '40px 36px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 8 }}>Ranking General</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 600, letterSpacing: '-0.05em', color: hasData ? '#fff' : 'rgba(255,255,255,0.2)', lineHeight: 0.85, marginBottom: 12 }}>
            {hasData && rank ? `#${rank}` : '—'}
          </div>
          {!hasData && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Sin torneos jugados aún</div>
          )}
        </div>
        <div style={{ background: '#fff', padding: '40px 32px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 8 }}>Puntos Totales</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', color: hasData ? 'var(--black)' : 'var(--grey-300)', lineHeight: 0.9, marginBottom: 12 }}>
            {pts.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
            {hasData ? 'acumulados en torneos' : 'Jugá torneos para sumar puntos'}
          </div>
        </div>
        <div style={{ background: '#fff', padding: '40px 32px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 8 }}>Jugador</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--black)', lineHeight: 1.1, marginBottom: 12 }}>
            {name || '—'}
          </div>
          <Link href="/dashboard/player/profile" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
            Ver perfil →
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div style={{ border: '1px dashed var(--grey-300)', padding: '48px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 12 }}>
            Aún no tenés puntos de ranking
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-400)', marginBottom: 24 }}>
            Participá en torneos para empezar a acumular puntos y aparecer en el ranking.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/player/quick-game" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
              Crear Juego Rápido →
            </Link>
            <Link href="/dashboard/player/tournaments" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>
              Ver Torneos →
            </Link>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, padding: '16px 24px', background: '#fff', border: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>Consultá la tabla de ranking global de la plataforma</div>
        <Link href="/ranking" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver ranking completo →</Link>
      </div>
    </div>
  );
}
