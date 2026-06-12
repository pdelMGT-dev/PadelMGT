'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ProfileError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[Profile]', error); }, [error]);
  return (
    <div style={{ padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 16 }}>
        No se pudo cargar el perfil
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={reset} style={{ padding: '10px 24px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          Reintentar
        </button>
        <Link href="/dashboard/player" style={{ padding: '10px 24px', border: '1px solid var(--grey-200)', color: 'var(--grey-500)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
