'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSAClubs, getSAClubsFromSupabase, type SAClub } from '@/lib/superadmin-data';
import { isClubMember, joinClub, leaveClub } from '@/lib/club-membership-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            fontSize: 32, lineHeight: 1,
            color: star <= (hovered || value) ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.1s, transform 0.1s',
            transform: star <= (hovered || value) ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= Math.round(value) ? '#f59e0b' : '#e5e7eb', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free', basic: 'Basic', pro: 'Pro',
  club_starter: 'Club Starter', club_pro: 'Club Pro', club_liga: 'Club Liga',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { user } = useCurrentUser();

  const [club, setClub] = useState<SAClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [pendingRating, setPendingRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [memberState, setMemberState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const local = getSAClubs().find(c => c.id === clubId);
    if (local) { setClub(local); setLoading(false); }
    getSAClubsFromSupabase().then(all => {
      const found = all?.find(c => c.id === clubId);
      if (found) setClub(prev => prev ? { ...found, ...prev } : found);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [clubId]);

  useEffect(() => {
    if (user && club) setMemberState(isClubMember(user.id, club.id));
  }, [user, club]);

  useEffect(() => {
    const qs = `clubId=${encodeURIComponent(clubId)}${user?.id ? `&playerId=${encodeURIComponent(user.id)}` : ''}`;
    fetch(`/api/clubs/rating?${qs}`)
      .then(r => r.json())
      .then((d: { average?: number | null; userRating?: number | null; count?: number }) => {
        setAvgRating(d.average ?? null);
        setRatingCount(d.count ?? 0);
        const ur = (d.userRating as number | null) ?? 0;
        setUserRating(ur);
        setPendingRating(ur);
      })
      .catch(() => {});
  }, [clubId, user?.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function submitRating() {
    if (!user || !pendingRating) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clubs/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId, playerId: user.id, rating: pendingRating }),
      });
      const json = await res.json() as { ok?: boolean };
      if (json.ok) {
        setUserRating(pendingRating);
        showToast('¡Valoración guardada!');
        // Refresh average
        fetch(`/api/clubs/rating?clubId=${encodeURIComponent(clubId)}`)
          .then(r => r.json())
          .then((d: { average?: number | null; count?: number }) => {
            setAvgRating(d.average ?? null);
            setRatingCount(d.count ?? 0);
          })
          .catch(() => {});
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  function handleJoin() {
    if (!user || !club) return;
    joinClub(user.id, { id: club.id, name: club.name, city: club.city, country: club.country });
    setMemberState(true);
    showToast(`¡Te uniste a ${club.name}!`);
  }

  function handleLeave() {
    if (!user || !club) return;
    leaveClub(user.id, club.id);
    setMemberState(false);
    showToast('Saliste del club');
  }

  if (loading) {
    return (
      <div className="dash-page" style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
        Cargando club...
      </div>
    );
  }

  if (!club) {
    return (
      <div className="dash-page" style={{ padding: '40px' }}>
        <Link href="/dashboard/player/clubs" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          ← Mis Clubes
        </Link>
        <div style={{ marginTop: 48, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>Club no encontrado.</div>
      </div>
    );
  }

  return (
    <div className="dash-page" style={{ padding: '40px 40px 80px' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--black)', color: '#fff', padding: '12px 24px', fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none', borderLeft: '3px solid var(--court-blue)' }}>
          {toast}
        </div>
      )}

      <Link href="/dashboard/player/clubs" style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-block', marginBottom: 36 }}>
        ← Mis Clubes
      </Link>

      {/* Club header */}
      <div style={{ background: 'var(--black)', padding: '32px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {getInitials(club.name)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3.5vw, 44px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px', color: '#fff' }}>
            {club.name}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {club.city}{club.country ? ` · ${club.country}` : ''}{club.address ? ` · ${club.address}` : ''}
          </div>
          {avgRating !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <StarDisplay value={avgRating} size={16} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{avgRating.toFixed(1)} ({ratingCount})</span>
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {memberState ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--bs-light)', fontWeight: 700 }}>✓ Miembro</span>
              <button
                onClick={handleLeave}
                style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              style={{ padding: '11px 28px', background: 'var(--court-blue)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Unirse →
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Canchas', value: String(club.courts) },
          { label: 'Miembros', value: String(club.members) },
          { label: 'Tipo', value: club.clubType || '—' },
          { label: 'Plan', value: PLAN_LABEL[club.plan] ?? club.plan },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--black)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {club.description && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '22px 26px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>Descripción</div>
          <p style={{ fontSize: 14, color: 'var(--grey-600)', lineHeight: 1.7, margin: 0 }}>{club.description}</p>
        </div>
      )}

      {/* Court types + amenities */}
      {(club.courtTypes?.length > 0 || club.amenities?.length > 0) && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '22px 26px', marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {club.courtTypes?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>Tipos de cancha</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {club.courtTypes.map(t => (
                  <span key={t} style={{ fontSize: 12, background: 'var(--grey-100)', color: 'var(--grey-700)', padding: '5px 12px', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {club.amenities?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>Amenidades</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {club.amenities.map(a => (
                  <span key={a} style={{ fontSize: 12, background: 'var(--grey-100)', color: 'var(--grey-700)', padding: '5px 12px', fontWeight: 600 }}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maps */}
      {club.mapsUrl && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>Ubicación</div>
          <iframe
            src={club.mapsUrl}
            width="100%"
            height="320"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Rating section */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '28px 32px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 24 }}>Valoración de la comunidad</div>

        {/* Average display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid var(--grey-100)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>
            {avgRating !== null ? avgRating.toFixed(1) : '—'}
          </div>
          <div>
            <StarDisplay value={avgRating ?? 0} size={22} />
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginTop: 6 }}>
              {ratingCount === 0 ? 'Sin valoraciones aún' : `${ratingCount} ${ratingCount === 1 ? 'valoración' : 'valoraciones'}`}
            </div>
          </div>
        </div>

        {/* User rating input */}
        {user ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-700)', marginBottom: 14 }}>
              {userRating > 0 ? `Tu valoración actual: ${userRating} ★` : 'Valora este club:'}
            </div>
            <StarPicker value={pendingRating} onChange={setPendingRating} />
            {pendingRating > 0 && pendingRating !== userRating && (
              <button
                onClick={submitRating}
                disabled={saving}
                style={{ marginTop: 18, padding: '10px 28px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Guardando...' : 'Guardar valoración'}
              </button>
            )}
            {pendingRating > 0 && pendingRating === userRating && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--turf-green)', fontWeight: 600 }}>✓ Valoración guardada</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>
            <Link href="/login" style={{ color: 'var(--black)', fontWeight: 700 }}>Inicia sesión</Link> para valorar este club.
          </div>
        )}
      </div>
    </div>
  );
}
