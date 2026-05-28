'use client';

import { ToastProvider } from './ToastProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
