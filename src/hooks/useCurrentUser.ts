'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'padelmgt_user';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  shortId?: string;
  role: string;
  sub?: string;
  firstLogin?: boolean;
  rankingPoints?: number;
  ranking?: number;
  plan?: string;
}

function readSession(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Minimum shape validation
    if (typeof parsed.id !== 'string' || typeof parsed.name !== 'string') return null;
    return parsed as unknown as CurrentUser;
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

  // Initial read from localStorage
  useEffect(() => {
    setUserState(readSession());
  }, []);

  // Listen for Supabase Auth sign-out events and keep session in sync
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SESSION_KEY);
        setUserState(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const setUser = useCallback((updated: CurrentUser | null) => {
    if (updated) writeSession(updated);
    setUserState(updated);
  }, []);

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
