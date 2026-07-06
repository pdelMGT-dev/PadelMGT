'use client';

import { useEffect } from 'react';
import { ToastProvider } from './ToastProvider';
import { purgeLegacyLocalData } from '@/lib/legacy-purge';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // One-time cleanup of demo/seed data left in this browser before the app
  // went Supabase-first. No-op after it has run once.
  useEffect(() => { purgeLegacyLocalData(); }, []);

  return <ToastProvider>{children}</ToastProvider>;
}
