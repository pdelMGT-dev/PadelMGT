'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, Trophy, Medal, XCircle, CalendarClock, CalendarDays } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useTournamentNotificationCount,
  useTournamentNotifications,
} from '@/hooks/useTournamentNotifications';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

// Icon + accent per notification type.
function notifVisual(type: string): { icon: React.ReactNode; color: string } {
  switch (type) {
    case 'qualified':  return { icon: <Medal size={15} />, color: '#16a34a' };
    case 'advanced':   return { icon: <Trophy size={15} />, color: '#d6ff00' };
    case 'eliminated': return { icon: <XCircle size={15} />, color: '#ef4444' };
    case 'next_match': return { icon: <CalendarClock size={15} />, color: '#3b82f6' };
    default:           return { icon: <CalendarDays size={15} />, color: 'var(--grey-400)' };
  }
}

/**
 * Floating bell with an unread badge for tournament notifications (schedule changes + progression:
 * qualified / advanced / eliminated / next match). Players see this on every dashboard page;
 * opening it shows the list, marks unread items as read, and lets them jump to the tournament.
 */
export default function NotificationBell({ inline = false }: { inline?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPlayer = pathname?.startsWith('/dashboard/player') ?? false;
  const { user } = useCurrentUser();
  const { count, refresh } = useTournamentNotificationCount(user?.id);
  const { notifications, loading, load, markRead } = useTournamentNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  // Once the panel is open and notifications are loaded, mark any unread ones as read and
  // refresh the badge. markRead/refresh are async (no synchronous setState in the effect body).
  useEffect(() => {
    if (!open) return;
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length) { markRead(unread).then(() => refresh()); }
  }, [open, notifications, markRead, refresh]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void load();
  }

  // Don't render for logged-out visitors.
  if (!user?.id) return null;

  // Blue Spectrum styling for the player role; classic black/neon elsewhere.
  const bellBg   = isPlayer ? '#1a4ed8' : '#0a0a0a';
  const bellIcon = isPlayer ? '#fff' : 'var(--neon)';

  return (
    <div
      ref={ref}
      className={inline ? 'nb-inline' : 'nb-floating'}
      style={inline
        ? { position: 'relative', zIndex: 1000 }
        : { position: 'fixed', top: 14, right: 18, zIndex: 1000 }}
    >
      <button
        onClick={toggle}
        aria-label="Notificaciones"
        style={{
          position: 'relative', width: 40, height: 40, borderRadius: '50%',
          background: bellBg, color: bellIcon,
          border: isPlayer ? '1px solid rgba(111,163,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 100, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 48, right: 0, width: 340, maxHeight: 420, overflowY: 'auto',
          background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grey-100)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
            Notificaciones
          </div>
          {loading && notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--grey-400)' }}>Cargando…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--grey-400)' }}>No tenés notificaciones.</div>
          ) : (
            notifications.map(n => {
              const v = notifVisual(n.type);
              const clickable = !!n.link;
              return (
                <div
                  key={n.id}
                  onClick={clickable ? () => { setOpen(false); router.push(n.link!); } : undefined}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--grey-50, #f4f4f4)',
                    background: n.read ? '#fff' : 'rgba(214,255,0,0.06)', cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: '#0a0a0a', color: v.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    {v.icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--black)', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
