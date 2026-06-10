'use client';

import { useEffect } from 'react';

/** Registers the service worker (production only). */
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW registration is progressive enhancement — ignore failures */
    });
  }, []);
  return null;
}
