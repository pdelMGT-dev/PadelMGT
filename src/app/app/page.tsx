'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ── Platform detection ─────────────────────────────────────────────────────

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Shared step component ──────────────────────────────────────────────────

function Step({ n, title, detail, icon }: { n: number; title: string; detail: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: '50%',
        background: 'var(--black)', color: 'var(--neon)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
      }}>
        {n}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--black)', marginBottom: 4 }}>
          {title} {icon}
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.6 }}>{detail}</div>
      </div>
    </div>
  );
}

// ── Inline icons (match iOS / Android UI symbols) ──────────────────────────

const ShareIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 3v13" /><path d="m8 7 4-4 4 4" /><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
  </svg>
);

const DotsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a4ed8" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
  </svg>
);

// ── Page ───────────────────────────────────────────────────────────────────

const APP_URL = 'https://padelmgt.com/app';

export default function AppLandingPage() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [tab, setTab] = useState<'ios' | 'android'>('ios');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === 'android') setTab('android');

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard unavailable */ }
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'PadelMGT', text: 'Descargá la app de PadelMGT', url: APP_URL });
        return;
      } catch { /* user cancelled */ }
    }
    handleCopy();
  }

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--black)', color: '#fff', padding: '88px 24px 96px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          {/* App icon */}
          <img
            src="/icons/icon-192.png"
            alt="PadelMGT"
            width={96}
            height={96}
            style={{ borderRadius: 22, marginBottom: 28, boxShadow: '0 16px 48px rgba(214,255,0,0.18)' }}
          />

          <div style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 14 }}>
            La app oficial
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: '0 0 20px' }}>
            PadelMGT<br />en tu bolsillo
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 36px' }}>
            Torneos, juegos rápidos y tu ranking — directo desde la pantalla de inicio de tu celular. Sin App Store, sin descargas pesadas.
          </p>

          {/* Primary actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {deferred ? (
              <button onClick={handleInstall} style={{
                padding: '16px 40px', background: 'var(--neon)', color: 'var(--black)',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                Instalar ahora
              </button>
            ) : (
              <a href="#instalar" style={{
                padding: '16px 40px', background: 'var(--neon)', color: 'var(--black)',
                textDecoration: 'none', fontFamily: 'var(--font-display)',
                fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block',
              }}>
                Cómo instalarla
              </a>
            )}
            <button onClick={handleShare} style={{
              padding: '16px 40px', background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {copied ? '✓ Link copiado' : 'Compartir'}
            </button>
          </div>
        </div>
      </section>

      {/* ── QR + link card ───────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px', marginTop: -48 }}>
        <div style={{
          maxWidth: 720, margin: '0 auto', background: '#fff',
          border: '1px solid var(--grey-200)', boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
          padding: '36px 40px', display: 'flex', alignItems: 'center', gap: 36, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', padding: 12, border: '1px solid var(--grey-100)' }}>
            <QRCodeSVG value={APP_URL} size={148} level="M" fgColor="#111111" />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 8 }}>
              Escaneá y listo
            </div>
            <p style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Apuntá la cámara de tu celular al código QR, o compartí este link con tus compañeros de juego:
            </p>
            <button onClick={handleCopy} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', background: 'var(--grey-50)', border: '1px dashed var(--grey-300)',
              cursor: 'pointer', fontFamily: 'monospace', fontSize: 14, color: 'var(--black)',
            }}>
              padelmgt.com/app
              <span style={{ fontSize: 11, fontWeight: 700, color: copied ? 'var(--turf-green, #1eaa52)' : 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {copied ? '✓ Copiado' : 'Copiar'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Install instructions ─────────────────────────────────────────── */}
      <section id="instalar" style={{ padding: '88px 24px 64px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 10 }}>
              Instalación en 3 pasos
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--black)' }}>
              Agregala a tu pantalla
            </h2>
          </div>

          {/* Platform tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 1, background: 'var(--grey-200)', maxWidth: 360, margin: '0 auto 40px' }}>
            {([
              { id: 'ios' as const, label: ' iPhone / iPad' },
              { id: 'android' as const, label: '🤖 Android' },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '13px 20px', border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'var(--black)' : '#fff',
                color: tab === t.id ? '#fff' : 'var(--grey-500)',
                fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Steps card */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '40px 36px', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
            {tab === 'ios' ? (
              <>
                <Step n={1} title="Abrí padelmgt.com en Safari" detail="Importante: tiene que ser Safari — Chrome en iPhone no permite instalar apps." />
                <Step n={2} title="Tocá el botón Compartir" icon={ShareIcon} detail="Es el cuadrado con la flecha hacia arriba, en la barra inferior del navegador." />
                <Step n={3} title='Elegí "Añadir a pantalla de inicio"' detail='Deslizá hacia abajo en el menú, tocá "Añadir a pantalla de inicio" y confirmá. El ícono de PadelMGT aparece como cualquier otra app.' />
              </>
            ) : (
              <>
                <Step n={1} title="Abrí padelmgt.com en Chrome" detail="También funciona en Edge, Samsung Internet y Brave." />
                <Step n={2} title="Tocá el menú" icon={DotsIcon} detail="Los tres puntos verticales en la esquina superior derecha. En muchos casos Chrome te muestra el botón «Instalar» directamente." />
                <Step n={3} title='Elegí "Instalar aplicación"' detail="Confirmá y listo — PadelMGT se instala con su ícono, pantalla completa y acceso directo a tus torneos." />
              </>
            )}
          </div>

          {platform === 'desktop' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-400)', marginTop: 24 }}>
              ¿Estás en una computadora? Escaneá el QR de arriba con tu celular para instalarla ahí.
            </p>
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: 'var(--grey-200)', border: '1px solid var(--grey-200)' }}>
          {[
            { icon: '⚡', title: 'Acceso directo', text: 'Un toque y estás en tus torneos. Sin abrir el navegador ni escribir direcciones.' },
            { icon: '◎', title: 'Pantalla completa', text: 'Se abre como una app nativa, sin barras del navegador. Experiencia limpia.' },
            { icon: '◌', title: 'Funciona sin conexión', text: 'Tus datos quedan guardados. Consultá resultados aunque se corte el internet del club.' },
            { icon: '↻', title: 'Siempre actualizada', text: 'Sin updates manuales — cada mejora llega automáticamente al abrir la app.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#fff', padding: '32px 28px' }}>
              <div style={{ fontSize: 26, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 8 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.6 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
