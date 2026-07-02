'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { LayoutGrid, List } from 'lucide-react';
import { getSAClubs, getSAClubsFromSupabase, type SAClub } from '@/lib/superadmin-data';
import {
  joinClub, leaveClub, isClubMember, getPlayerClubs,
  type ClubMembership,
} from '@/lib/club-membership-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface GeoLocation { country: string; city: string; }

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const COURT_TYPE_LABEL: Record<string, string> = {
  Cristal: 'Cristal', Muro: 'Muro', 'Hierba Artificial': 'Hierba',
};

const PLAN_LABEL: Record<string, string> = { free: 'Gratis', basic: 'Basic', pro: 'Pro' };

function MiniStars({ value, count }: { value: number | null; count: number }) {
  if (value === null || count === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: 11, color: s <= Math.round(value) ? '#f59e0b' : '#e5e7eb', lineHeight: 1 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 2 }}>{value.toFixed(1)}</span>
    </div>
  );
}

function MiniStarsLight({ value, count }: { value: number | null; count: number }) {
  if (value === null || count === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: 10, color: s <= Math.round(value) ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}>★</span>
      ))}
      <span style={{ fontSize: 10, color: 'var(--grey-400)', marginLeft: 2 }}>{value.toFixed(1)}</span>
    </span>
  );
}

function ClubCard({
  club,
  memberId,
  onJoin,
  onLeave,
  badge,
  ratingAvg,
  ratingCount,
}: {
  club: SAClub;
  memberId: string | null;
  onJoin: (club: SAClub) => void;
  onLeave: (clubId: string) => void;
  badge?: string;
  ratingAvg?: number | null;
  ratingCount?: number;
}) {
  const joined = memberId ? isClubMember(memberId, club.id) : false;

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--grey-200)',
      display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden',
    }}>
      {/* Color header */}
      <div style={{
        background: 'var(--black)', padding: '20px 20px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'var(--court-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {getInitials(club.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {club.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            {club.city}{club.country ? ` · ${club.country}` : ''}
          </div>
          <MiniStars value={ratingAvg ?? null} count={ratingCount ?? 0} />
        </div>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', background: 'var(--court-blue)', color: '#fff', padding: '3px 8px', flexShrink: 0, textTransform: 'uppercase' }}>
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 20px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12, color: 'var(--grey-500)' }}>
          <span>🏟 {club.courts} canchas</span>
          <span>👥 {club.members} miembros</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {PLAN_LABEL[club.plan] ?? club.plan}
          </span>
        </div>
        {club.courtTypes?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {club.courtTypes.map(t => (
              <span key={t} style={{ fontSize: 10, background: 'var(--grey-100)', color: 'var(--grey-600)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                {COURT_TYPE_LABEL[t] ?? t}
              </span>
            ))}
          </div>
        )}
        {club.description && (
          <p style={{ fontSize: 12, color: 'var(--grey-500)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {club.description}
          </p>
        )}
      </div>

      {/* Maps embed */}
      {club.mapsUrl && (
        <div style={{ padding: '0 20px 14px' }}>
          <iframe
            src={club.mapsUrl}
            width="100%"
            height="160"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--grey-100)' }}>
        {joined ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href={`/dashboard/player/clubs/${club.id}`}
              style={{ flex: 1, fontSize: 12, color: 'var(--black)', fontWeight: 700, textDecoration: 'none' }}
            >
              Ver detalles →
            </Link>
            <button
              onClick={() => memberId && onLeave(club.id)}
              style={{ fontSize: 11, color: 'var(--grey-400)', background: 'none', border: '1px solid var(--grey-200)', padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}
            >
              Salir
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href={`/dashboard/player/clubs/${club.id}`}
              style={{ flex: 1, padding: '10px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', color: 'var(--grey-700)', letterSpacing: '0.02em' }}
            >
              Ver detalles
            </Link>
            <button
              onClick={() => onJoin(club)}
              style={{
                flex: 2, padding: '10px', background: 'var(--black)', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              Unirse →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ClubListRow({
  club,
  memberId,
  onJoin,
  onLeave,
  badge,
  ratingAvg,
  ratingCount,
}: {
  club: SAClub;
  memberId: string | null;
  onJoin: (club: SAClub) => void;
  onLeave: (clubId: string) => void;
  badge?: string;
  ratingAvg?: number | null;
  ratingCount?: number;
}) {
  const joined = memberId ? isClubMember(memberId, club.id) : false;
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--grey-200)',
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: 'var(--black)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {getInitials(club.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {club.name}
          {badge && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, background: 'var(--court-blue)', color: '#fff', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{badge}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 1 }}>
          {club.city}{club.country ? ` · ${club.country}` : ''} &nbsp;·&nbsp; {club.courts} canchas &nbsp;·&nbsp; {club.members} miembros
          {club.mapsUrl && (
            <a
              href={club.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ marginLeft: 8, color: 'var(--turf-green)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}
            >
              📍 Ver mapa
            </a>
          )}
          {ratingAvg !== null && ratingAvg !== undefined && (ratingCount ?? 0) > 0 && (
            <span style={{ marginLeft: 8 }}><MiniStarsLight value={ratingAvg} count={ratingCount ?? 0} /></span>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link
          href={`/dashboard/player/clubs/${club.id}`}
          style={{ padding: '6px 14px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, color: 'var(--grey-600)', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Ver →
        </Link>
        {joined ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--turf-green)', fontWeight: 700 }}>✓ Miembro</span>
            <button
              onClick={() => memberId && onLeave(club.id)}
              style={{ fontSize: 11, color: 'var(--grey-400)', background: 'none', border: '1px solid var(--grey-200)', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
            >
              Salir
            </button>
          </div>
        ) : (
          <button
            onClick={() => onJoin(club)}
            style={{
              padding: '7px 16px', background: 'var(--black)', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}
          >
            Unirse →
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerClubsPage() {
  const { user } = useCurrentUser();
  const [allClubs, setAllClubs] = useState<SAClub[]>([]);
  const [myMemberships, setMyMemberships] = useState<ClubMembership[]>([]);
  const [geo, setGeo] = useState<GeoLocation | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return (localStorage.getItem('padelmgt_clubs_view') as 'cards' | 'list') ?? 'cards';
  });
  const [toast, setToast] = useState<string | null>(null);
  const [clubRatings, setClubRatings] = useState<Record<string, { average: number | null; count: number }>>({});

  useEffect(() => {
    // Load from localStorage first (instant), then fetch Supabase to get all SA-registered clubs
    const localActive = getSAClubs().filter(c => c.status === 'active');
    setAllClubs(localActive);

    getSAClubsFromSupabase().then(sbClubs => {
      if (!sbClubs || sbClubs.length === 0) return;
      const active = sbClubs.filter(c => c.status === 'active');
      if (active.length === 0) return;
      // Merge: local fills in rich fields (description, courtTypes, mapsUrl...),
      // Supabase is the source of truth for which clubs exist and their status.
      const localMap = Object.fromEntries(localActive.map(c => [c.id, c]));
      const merged = active.map(sb => ({ ...sb, ...(localMap[sb.id] ?? {}) } as SAClub));
      setAllClubs(merged);
      // Fetch bulk ratings
      const ids = merged.map(c => c.id).join(',');
      if (ids) {
        fetch(`/api/clubs/ratings-bulk?clubIds=${encodeURIComponent(ids)}`)
          .then(r => r.json())
          .then((d: Record<string, { average: number | null; count: number }>) => setClubRatings(d))
          .catch(() => {});
      }
    }).catch(() => { /* keep local fallback */ });

    // IP geolocation
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        const country = (d.country_name as string) || (d.country as string) || '';
        const city = (d.city as string) || '';
        setGeo({ country, city });
      })
      .catch(() => setGeo(null))
      .finally(() => setGeoLoading(false));
  }, []);

  useEffect(() => {
    if (user) setMyMemberships(getPlayerClubs(user.id));
  }, [user]);

  function refreshMemberships() {
    if (user) setMyMemberships(getPlayerClubs(user.id));
  }

  function handleJoin(club: SAClub) {
    if (!user) return;
    joinClub(user.id, { id: club.id, name: club.name, city: club.city, country: club.country });
    refreshMemberships();
    showToast(`¡Te uniste a ${club.name}!`);
  }

  function handleLeave(clubId: string) {
    if (!user) return;
    leaveClub(user.id, clubId);
    refreshMemberships();
    showToast('Saliste del club');
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Clubs the player is NOT a member of (for browsing)
  const memberClubIds = new Set(myMemberships.map(m => m.clubId));

  // Recommended: same country as IP, not already member
  const recommended = useMemo(() => {
    if (!geo?.country) return [];
    const geoCountry = geo.country.toLowerCase();
    return allClubs.filter(c =>
      !memberClubIds.has(c.id) &&
      (c.country?.toLowerCase().includes(geoCountry) || geoCountry.includes(c.country?.toLowerCase() ?? ''))
    );
  }, [allClubs, geo, myMemberships]);

  // Filtered results
  const filtered = useMemo(() => {
    let list = allClubs.filter(c => !memberClubIds.has(c.id));
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q));
    }
    if (searchCountry.trim()) {
      const q = searchCountry.trim().toLowerCase();
      list = list.filter(c => c.country?.toLowerCase().includes(q));
    }
    if (searchCity.trim()) {
      const q = searchCity.trim().toLowerCase();
      list = list.filter(c => c.city?.toLowerCase().includes(q));
    }
    return list;
  }, [allClubs, searchName, searchCountry, searchCity, myMemberships]);

  const hasSearch = searchName.trim() || searchCountry.trim() || searchCity.trim();

  // My club details
  const myClubDetails = myMemberships.map(m => allClubs.find(c => c.id === m.clubId)).filter(Boolean) as SAClub[];

  return (
    <div className="dash-page" style={{ padding: '40px 40px 80px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--black)', color: '#fff', padding: '12px 24px', fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none', borderLeft: '3px solid var(--court-blue)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Membresías activas</div>
          <h1 className="dash-h1 bs-h1" style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS CLUBES</h1>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--grey-200)', overflow: 'hidden' }}>
          {(['cards', 'list'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                localStorage.setItem('padelmgt_clubs_view', mode);
              }}
              title={mode === 'cards' ? 'Vista tarjetas' : 'Vista lista'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, cursor: 'pointer', border: 'none',
                background: viewMode === mode ? 'var(--black)' : '#fff',
                color: viewMode === mode ? '#fff' : 'var(--grey-400)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {mode === 'cards' ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* My clubs */}
      {myClubDetails.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', marginBottom: 14 }}>
            Mis clubes ({myClubDetails.length})
          </div>
          {viewMode === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {myClubDetails.map(club => (
                <ClubCard key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myClubDetails.map(club => (
                <ClubListRow key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', marginBottom: 14 }}>
          Buscar clubes
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Nombre del club</label>
            <input
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="ej. Club Padel Madrid..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>País</label>
            <input
              value={searchCountry}
              onChange={e => setSearchCountry(e.target.value)}
              placeholder="ej. Argentina..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Ciudad</label>
            <input
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              placeholder="ej. Buenos Aires..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          {hasSearch && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => { setSearchName(''); setSearchCountry(''); setSearchCity(''); }}
                style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search results */}
      {hasSearch && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', marginBottom: 14 }}>
            Resultados ({filtered.length})
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: 'var(--grey-50)', border: '1px dashed var(--grey-300)' }}>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>No se encontraron clubes con esos criterios.</div>
            </div>
          ) : viewMode === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filtered.map(club => (
                <ClubCard key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(club => (
                <ClubListRow key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommended */}
      {!hasSearch && (
        <>
          {geoLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              Detectando tu ubicación...
            </div>
          ) : recommended.length > 0 ? (
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
                  Recomendados cerca tuyo
                </div>
                {geo && (
                  <span style={{ fontSize: 11, color: 'var(--grey-400)', background: 'var(--grey-100)', padding: '2px 8px', borderRadius: 10 }}>
                    📍 {geo.city ? `${geo.city}, ` : ''}{geo.country}
                  </span>
                )}
              </div>
              {viewMode === 'cards' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {recommended.map(club => (
                    <ClubCard key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} badge="Cerca tuyo" ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recommended.map(club => (
                    <ClubListRow key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} badge="Cerca tuyo" ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* All clubs (not yet member, not in recommended) */}
          {(() => {
            const recIds = new Set(recommended.map(c => c.id));
            const rest = allClubs.filter(c => !memberClubIds.has(c.id) && !recIds.has(c.id));
            if (rest.length === 0 && recommended.length === 0 && myClubDetails.length === 0) {
              return (
                <div style={{ padding: '64px 40px', textAlign: 'center', border: '1px dashed var(--grey-300)', background: 'var(--grey-50)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--grey-300)', marginBottom: 12 }}>
                    No hay clubes disponibles aún
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>
                    Los clubes aparecerán aquí una vez que sean aprobados por el administrador.
                  </div>
                </div>
              );
            }
            if (rest.length === 0) return null;
            return (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', marginBottom: 14 }}>
                  Todos los clubes ({rest.length})
                </div>
                {viewMode === 'cards' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {rest.map(club => (
                      <ClubCard key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rest.map(club => (
                      <ClubListRow key={club.id} club={club} memberId={user?.id ?? null} onJoin={handleJoin} onLeave={handleLeave} ratingAvg={clubRatings[club.id]?.average} ratingCount={clubRatings[club.id]?.count} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
