'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getUnreadNotificationCount,
  getPlayerNotifications,
  markNotificationsRead,
  type TournamentNotification,
} from '@/lib/personalizado-store';

export function useTournamentNotificationCount(playerId: string | undefined) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!playerId) { setCount(0); return; }
    const n = await getUnreadNotificationCount(playerId);
    setCount(n);
  }, [playerId]);

  useEffect(() => {
    refresh();
    // Poll every 60 seconds so new notifications appear without a full page reload
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { count, refresh };
}

export function useTournamentNotifications(playerId: string | undefined) {
  const [notifications, setNotifications] = useState<TournamentNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    const data = await getPlayerNotifications(playerId);
    setNotifications(data);
    setLoading(false);
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback(async (ids: string[]) => {
    await markNotificationsRead(ids);
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
  }, []);

  return { notifications, loading, load, markRead };
}
