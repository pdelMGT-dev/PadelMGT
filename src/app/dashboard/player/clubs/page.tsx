'use client';

import Link from 'next/link';

export default function PlayerClubsPage() {
  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Membresías activas</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS CLUBES</h1>
      </div>

      {/* Empty state */}
      <div style={{ border: '1px dashed var(--grey-300)', padding: '64px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Todavía no pertenecés a ningún club
        </div>
        <div style={{ fontSize: 14, color: 'var(--grey-400)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
          Buscá clubes y ligas cerca tuyo para unirte y participar en sus torneos y rankings.
        </div>
        <Link href="/clubs" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
          Explorar clubes y ligas →
        </Link>
      </div>
    </div>
  );
}
