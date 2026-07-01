# 🚀 PadelMGT — Checklist de lanzamiento (padelmgt.com / padelmgt.net)

**Estado al 2026-06-30:** todo el código está en producción (seguridad, RLS, SEO).
Lo que queda es **configuración de dashboards**. Seguí los pasos en orden.

Leyenda: ⛔ = bloqueante para el go-live · 🟡 = recomendado · ✅ = ya hecho esta sesión

---

## Fase 0 — Pre-requisitos (ya hecho ✅)

- [x] Fixes de seguridad S1–S5 en producción (PR #25)
- [x] RLS seguro aplicado (migración 015)
- [x] SEO: robots.txt, sitemap.xml, OpenGraph/Twitter (PR #26)
- [x] `padelmgt.net` apuntado en Vercel
- [x] Build verde (127 páginas) y sitio sirviendo 200

---

## Fase 1 — Variables de entorno en Vercel ⛔

**Dónde:** vercel.com → proyecto **padel-mgt** → **Settings → Environment Variables** →
entorno **Production**. Tras agregarlas, **Redeploy** (Deployments → ⋯ → Redeploy) para que tomen efecto.

### Críticas (sin esto se rompe algo)
- [ ] ⛔ `SA_SESSION_SECRET` → string aleatorio largo. Generalo con:
      `openssl rand -base64 48`. *(Sin esto, el login de superadmin usa la service-role key como
      fallback; mejor uno dedicado.)*
- [ ] ⛔ `NEXT_PUBLIC_APP_URL` = `https://padelmgt.com`  *(define el dominio canónico para
      checkout de Stripe, emails y QR)*
- [ ] ⛔ `SUPABASE_SERVICE_ROLE_KEY` *(confirmar que está)*
- [ ] ⛔ `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(confirmar)*
- [ ] ⛔ `STRIPE_SECRET_KEY` *(clave LIVE `sk_live_…`, no test)*
- [ ] ⛔ `STRIPE_WEBHOOK_SECRET` *(se obtiene en la Fase 3, paso webhook)*

### Stripe price IDs (los 8) — para que los planes cobren
- [ ] ⛔ `STRIPE_PRICE_PLAYER_PRO_MONTHLY`
- [ ] ⛔ `STRIPE_PRICE_PLAYER_PRO_YEARLY`
- [ ] ⛔ `STRIPE_PRICE_LIGA_BASIC_MONTHLY`
- [ ] ⛔ `STRIPE_PRICE_LIGA_PRO_MONTHLY`
- [ ] ⛔ `STRIPE_PRICE_LIGA_UNLIMITED_MONTHLY`
- [ ] ⛔ `STRIPE_PRICE_CLUB_STARTER_MONTHLY`
- [ ] ⛔ `STRIPE_PRICE_CLUB_PRO_MONTHLY`
- [ ] ⛔ `STRIPE_PRICE_CLUB_LIGA_MONTHLY`

### Email + superadmin
- [ ] ⛔ `RESEND_API_KEY`
- [ ] ⛔ `RESEND_FROM_EMAIL` = p. ej. `PadelMGT <no-reply@padelmgt.com>` *(el dominio debe estar
      verificado en Resend — ver Fase 4)*
- [ ] ⛔ `SA_ADMIN_EMAIL` = el email del superadmin
- [ ] ⛔ `SA_ADMIN_PASSWORD` = contraseña fuerte del superadmin
- [ ] 🟡 `STRIPE_DEV_MODE` = `false` (o no definir) en producción
- [ ] 🟡 `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS` = `false` en producción

---

## Fase 2 — Dominios y DNS en Vercel ⛔

**Dónde:** proyecto padel-mgt → **Settings → Domains**.

- [ ] ⛔ **Agregar `padelmgt.com`** (hoy solo está `padelmgt.net`).
- [ ] ⛔ Configurar el DNS según lo que indique Vercel:
      - Apex (`padelmgt.com`): registro **A** → `76.76.21.21` (o el que muestre Vercel), o **ALIAS/ANAME** si tu registrador lo soporta.
      - `www.padelmgt.com`: **CNAME** → `cname.vercel-dns.com`.
- [ ] ⛔ **Elegir el dominio canónico** (recomendado: `padelmgt.com`) y poner el otro
      (`padelmgt.net` + ambos `www`) como **Redirect** al canónico en la misma pantalla de Domains.
- [ ] Esperar a que Vercel emita el certificado SSL (estado **Valid Configuration** con candado).
- [ ] Verificar que `https://padelmgt.com` y `https://padelmgt.net` cargan y que `.net` redirige a `.com`.

---

## Fase 3 — Stripe (LIVE) ⛔

**Dónde:** dashboard.stripe.com en modo **Live** (toggle arriba a la derecha).

- [ ] ⛔ Confirmar que la cuenta está activada para cobros en vivo (no solo test).
- [ ] ⛔ **Crear el webhook:** Developers → **Webhooks → Add endpoint**:
      - URL: `https://padelmgt.com/api/stripe/webhook`
      - Eventos: como mínimo `checkout.session.completed`,
        `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`.
      - Copiar el **Signing secret** (`whsec_…`) → pegarlo en Vercel como `STRIPE_WEBHOOK_SECRET` (Fase 1).
- [ ] ⛔ Verificar los **8 price IDs** (`price_…`) en Products → pegarlos en Vercel (Fase 1).
- [ ] 🟡 **Ojo doble webhook:** existe también la ruta `/api/webhooks/stripe` (cuenta usos de promo
      en el Torneo Personalizado). Si usás promos en TP, crear **otro** endpoint apuntando a
      `https://padelmgt.com/api/webhooks/stripe` con su propio signing secret. Si no, ignorar.
- [ ] 🟡 La ruta legacy `/api/stripe/webhook` tiene un bug `.catch()` (líneas ~159/190); no rompe el
      cobro pero conviene revisarla post-launch.

---

## Fase 4 — Supabase ⛔

**Dónde:** supabase.com → proyecto `asgafvrufdxzkjhjlapi`.

- [ ] ⛔ **Auth → URL Configuration:**
      - **Site URL** = `https://padelmgt.com`
      - **Redirect URLs**: agregar `https://padelmgt.com/**` y `https://padelmgt.net/**`.
- [ ] 🟡 **Auth → Providers → Email:** activar **Leaked password protection** (1 clic; lo marcó el advisor).
- [ ] ✅ RLS ya habilitado en las 19 tablas; migración 015 aplicada.
- [ ] 🟡 **(Resend) Verificar el dominio de envío:** en resend.com agregar `padelmgt.com` y
      publicar los registros DKIM/SPF en el DNS, para que los emails no caigan en spam.

---

## Fase 5 — Deploy final y smoke test ⛔

- [ ] ⛔ **Redeploy** en Vercel después de cargar todas las env vars (Deployments → ⋯ → Redeploy,
      sin caché).
- [ ] ⛔ Probar en `https://padelmgt.com` (no en la URL `*.vercel.app`):
  - [ ] Home carga, navbar y links OK.
  - [ ] **Signup + login** de un jugador nuevo (confirma email vía Resend).
  - [ ] **Crear un Torneo Personalizado** y abrir inscripción.
  - [ ] **Inscripción pública** por link/QR con un segundo usuario.
  - [ ] **Checkout de Stripe** (TP de pago) → pago de prueba real pequeño → verificar que el
        webhook marca el torneo como pagado.
  - [ ] **Registrar un score** → ver bracket progresivo + llegada de **notificación** en la campana.
  - [ ] **Login de superadmin** (`/superadmin`) con `SA_ADMIN_EMAIL`/`SA_ADMIN_PASSWORD`.
  - [ ] `GET https://padelmgt.com/api/sa/promos` sin sesión → **401** (control de seguridad).
- [ ] ⛔ Revisar **Vercel → Logs / Runtime** durante el smoke test: sin 500s.

---

## Fase 6 — SEO e indexación 🟡 (primeras 48 h)

- [ ] Verificar `https://padelmgt.com/robots.txt` y `/sitemap.xml`.
- [ ] **Google Search Console:** agregar la propiedad `padelmgt.com`, verificarla y enviar el sitemap.
- [ ] Probar el preview con el **Sharing Debugger de Facebook** y el **Card Validator de X/Twitter**
      (deben mostrar la tarjeta OG 1200×630).
- [ ] 🟡 Crear un favicon/OG definitivos de marca si se quiere reemplazar los actuales.

---

## Fase 7 — Post-launch (deuda técnica, no bloquea)

- [ ] **Rediseño mobile "Blue Spectrum"** (proyecto aparte, decidido post-launch 2026-07-01):
      nueva paleta de 3 azules (`#0a1638 / #1a4ed8 / #6fa3ff`) + íconos sólidos, reemplaza la
      identidad neon actual. **Solo existe como imagen/mockup** — no hay HTML fuente en el repo
      (`design-mobile-concepts.html` es la versión neon, distinta). Alcance real: rediseñar TODAS
      las pantallas del dashboard del jugador (`src/app/dashboard/player/**`), no solo el home,
      para mantener coherencia. Estimar como sprint de diseño→implementación→QA, no como parche.
- [ ] Datos legacy (quick-games / torneos clásicos): split-brain y links no cross-device — arreglar
      antes de promover esos formatos. Lanzar primero apoyado en **Torneo Personalizado**.
- [ ] RLS restante: rutar escrituras client-side a endpoints service-role y luego restringir
      `clubs`, `club_reviews`, `join_requests`, `quick_games`, `score_corrections`,
      `tournament_notifications`, `tournaments`, `personalizado_*`.
- [ ] Renombrar `src/middleware.ts` → `proxy.ts` (deprecación Next 16).
- [ ] Rate limiters (`sa/login`, `email/send`) → store compartido (Upstash/Redis).
- [ ] Limpiar SVGs de plantilla en `public/`.

---

### Referencias
- Supabase project: `asgafvrufdxzkjhjlapi`
- Vercel Team: `team_UYyq39ZSJrJ3zg5Nte9SHbq0` · Project: `prj_kszOXvVyLZD5zDxlOW0mFg6mWr1w`
- Rama producción: `claude/build-padel-website-lhdAK` · dev: `claude/stoic-cray-vyzzbi`
- Detalle técnico completo: ver `handoff.md`
