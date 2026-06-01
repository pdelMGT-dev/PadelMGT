'use client';

/**
 * useCurrentUser — reads the current user session from localStorage.
 *
 * Replaces the 16+ copy-pasted blocks of:
 *   const raw = localStorage.getItem('padelmgt_user');
 *   if (raw) { const u = JSON.parse(raw) as …; … }
 *
 * Usage:
 *   const { user, setUser } = useCurrentUser();
 *
 * `setUser` writes the updated session back to localStorage so all callers
 * that re-mount after a navigation pick up the latest value automatically.
 */

import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'padelmgt_user';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  shortId?: string;
  role: string;
  /** Display sub-line (e.g. club name or short ID) */
  sub?: string;
  firstLogin?: boolean;
  rankingPoints?: number;
  ranking?: number;
}

function readSession(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: CurrentUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch { /* ignore quota errors */ }
}

export function useCurrentUser() {
  const [user, setUserState] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUserState(readSession());
  }, []);

  const setUser = useCallback((updated: CurrentUser | null) => {
    if (updated) writeSession(updated);
    setUserState(updated);
  }, []);

  /** Patch specific fields and persist. */
  const patchUser = useCallback(
    (fields: Partial<CurrentUser>) => {
      setUserState((prev: CurrentUser | null) => {
        if (!prev) return prev;
        const next = { ...prev, ...fields };
        writeSession(next);
        return next;
      });
    },
    [],
  );

  return { user, setUser, patchUser };
}
