'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
  warning: '!',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#1eaa52', border: '#17923f', icon: '#fff' },
  error:   { bg: '#ee0005', border: '#cc0004', icon: '#fff' },
  info:    { bg: '#1a4ed8', border: '#1540b8', icon: '#fff' },
  warning: { bg: '#d6ff00', border: '#b8db00', icon: '#111' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    const timer = setTimeout(() => removeToast(id), 4000);
    timers.current.set(id, timer);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(toast => {
          const c = COLORS[toast.type];
          return (
            <div
              key={toast.id}
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                padding: '10px 16px 10px 12px',
                minWidth: 220,
                maxWidth: 360,
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                pointerEvents: 'all',
                animation: 'toastIn 200ms cubic-bezier(0.4,0,0.2,1)',
                cursor: 'pointer',
              }}
              onClick={() => removeToast(toast.id)}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: c.icon,
                  flexShrink: 0,
                }}
              >
                {ICONS[toast.type]}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: toast.type === 'warning' ? '#111' : '#fff',
                  lineHeight: 1.4,
                }}
              >
                {toast.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
