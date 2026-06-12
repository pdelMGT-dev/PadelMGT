'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getClubReviews,
  getClubRating,
  getPlayerReview,
  submitClubReview,
  syncClubReviews,
  type ClubReview,
} from '@/lib/club-review-store';

function Stars({ value, size = 16, onSelect }: { value: number; size?: number; onSelect?: (v: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={onSelect ? () => onSelect(i) : undefined}
          style={{
            fontSize: size,
            color: i <= Math.round(value) ? '#f5a623' : 'var(--grey-200)',
            cursor: onSelect ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function ClubReviews({
  clubId,
  onRatingChange,
}: {
  clubId: string;
  onRatingChange?: (info: { avg: number; count: number }) => void;
}) {
  const { user } = useCurrentUser();
  const [reviews, setReviews] = useState<ClubReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function refresh() {
    setReviews(getClubReviews(clubId));
    onRatingChange?.(getClubRating(clubId));
  }

  useEffect(() => {
    refresh();
    syncClubReviews(clubId).then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    if (!user?.id) return;
    const mine = getPlayerReview(clubId, user.id);
    if (mine) {
      setMyRating(mine.rating);
      setMyComment(mine.comment ?? '');
      setSubmitted(true);
    }
  }, [user?.id, clubId]);

  const info = getClubRating(clubId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || myRating < 1) return;
    setSaving(true);
    await submitClubReview({
      clubId,
      playerId: user.id,
      playerName: user.name,
      rating: myRating,
      comment: myComment,
    });
    setSaving(false);
    setSubmitted(true);
    refresh();
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 8 }}>VALORACIONES</h2>

      {/* Aggregate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {info.count > 0 ? (
          <>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--black)' }}>{info.avg.toFixed(1)}</span>
            <Stars value={info.avg} size={20} />
            <span style={{ fontSize: 13, color: 'var(--grey-400)' }}>
              {info.count} jugador{info.count !== 1 ? 'es' : ''} votaron este club
            </span>
          </>
        ) : (
          <span style={{ fontSize: 14, color: 'var(--grey-400)' }}>
            Aún no hay valoraciones. ¡Sé el primero en votar!
          </span>
        )}
      </div>

      {/* Vote form */}
      <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: 24, marginBottom: 24 }}>
        {!user ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--grey-500)' }}>Iniciá sesión para valorar este club.</span>
            <Link href="/login" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 700, marginBottom: 10 }}>
              {submitted ? 'Tu valoración (podés cambiarla)' : '¿Qué te pareció este club?'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <Stars value={myRating} size={28} onSelect={v => { setMyRating(v); setSubmitted(false); }} />
            </div>
            <textarea
              value={myComment}
              onChange={e => { setMyComment(e.target.value); setSubmitted(false); }}
              rows={3}
              maxLength={500}
              placeholder="Comentario (opcional): canchas, instalaciones, ambiente…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: 14,
                border: '1px solid var(--grey-200)', outline: 'none', resize: 'vertical',
                fontFamily: 'var(--font-body)', marginBottom: 12, background: '#fff',
              }}
            />
            <button
              type="submit"
              disabled={myRating < 1 || saving || submitted}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 0, cursor: myRating < 1 || submitted ? 'default' : 'pointer', opacity: myRating < 1 ? 0.4 : 1 }}
            >
              {saving ? 'Enviando…' : submitted ? '✓ Valoración enviada' : 'Enviar valoración'}
            </button>
          </form>
        )}
      </div>

      {/* Comments list */}
      {reviews.filter(r => r.comment).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)', border: '1px solid var(--grey-200)' }}>
          {reviews.filter(r => r.comment).slice(0, 20).map(r => (
            <div key={`${r.clubId}|${r.playerId}`} style={{ background: '#fff', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--black)' }}>{r.playerName || 'Jugador'}</span>
                <Stars value={r.rating} size={13} />
                <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{r.createdAt.split('T')[0]}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.5 }}>{r.comment}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
