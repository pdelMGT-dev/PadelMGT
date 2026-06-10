'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'padelmgt_install_dismissed';

/** Shows a subtle install banner when the browser fires beforeinstallprompt. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch { /* private mode */ }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  async function install() {
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    setDeferred(null);
  }

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 950,
      maxWidth: 420, margin: '0 auto',
      background: '#111', color: '#fff', padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    }}>
      <img src="/icons/icon-192.png" alt="" width={40} height={40} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Instalá PadelMGT</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Acceso rápido desde tu pantalla de inicio</div>
      </div>
      <button onClick={install}
        style={{ padding: '9px 16px', background: 'var(--neon)', color: '#111', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        Instalar
      </button>
      <button onClick={dismiss} aria-label="Cerrar"
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}
