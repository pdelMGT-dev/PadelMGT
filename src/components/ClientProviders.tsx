'use client';

import { useEffect } from 'react';
import { ToastProvider } from './ToastProvider';
import { purgeLegacyLocalData } from '@/lib/legacy-purge';
import { syncRankingConfigFromSupabase } from '@/lib/ranking-config-store';
import { syncMinorCategoriesFromSupabase } from '@/lib/minor-categories-store';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // One-time cleanup of demo/seed data left in this browser before the app
  // went Supabase-first. No-op after it has run once.
  useEffect(() => { purgeLegacyLocalData(); }, []);

  // Refresh the local cache of SA-configured ranking points / age categories
  // so gameplay math on this device reflects the latest platform_config,
  // not whatever was cached the last time this browser saved them itself.
  useEffect(() => {
    syncRankingConfigFromSupabase().catch(() => {});
    syncMinorCategoriesFromSupabase().catch(() => {});
  }, []);

  return <ToastProvider>{children}</ToastProvider>;
}
