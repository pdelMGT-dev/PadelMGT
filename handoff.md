# HANDOFF — PadelMGT (sesión: Supabase-como-fuente-de-verdad)

**Fecha:** 2026-07-07
**Rama de desarrollo:** `claude/stoic-cray-vyzzbi`
**Rama de producción (Vercel):** `claude/build-padel-website-lhdAK` → auto-deploy a **padelmgt.com**
**Último commit (ambas ramas, en sync):** `b517bcb`
**Working tree:** limpio, nada a medio editar.

> Continúa el `handoff.md` del 2026-06-30 (auditoría pre-lanzamiento). Esa sesión dejó la app
> **lanzada** (seguridad, RLS básico, SEO, dominios, Stripe conectado). Esta sesión arrancó
> **después del lanzamiento real** con usuarios de prueba (amigos del dueño) y se dedicó casi
> enteramente a un problema de arquitectura de fondo: la app guardaba casi todo en
> `localStorage` del navegador en vez de Supabase, causando datos fantasma, falta de
> sincronización entre dispositivos, y features rotas (amistades, ligas). El contenido viejo
> del handoff anterior (§Stripe env vars, dominios, RLS inicial) sigue siendo válido como
> contexto histórico pero ya no es el frente de trabajo activo — se resume abajo en «Contexto
> esencial» y no se repite en detalle.

---

## 1. Objetivo de esta sesión

El dueño lanzó la app entre amigos y reportó 5 síntomas concretos:

1. Acciones de usuario (crear juegos, torneos, solicitudes de amistad, ligas, editar perfil)
   se quedaban en `localStorage` y no llegaban a Supabase → otros usuarios/dispositivos/SA no
   las veían.
2. Páginas públicas mostraban datos de demo hardcodeados en vez de datos reales.
3. Las solicitudes de amistad no funcionaban entre usuarios.
4. La cuenta del dueño (`luisgongra@gmail.com`, `player-00119`) mostraba juegos/torneos
   fantasma que ya no existían.
5. El panel SA (Super Admin) mostraba datos de prueba/mock que debían estar limpios.

**Meta explícita del dueño:** "que no exista nada en localStorage... Supabase debe ser la
única fuente de verdad, para el usuario y para que el SA vea todo al instante."

---

## 2. Estado actual del código

**Build:** `npm run build` pasa limpio (`✓ Compiled successfully`). Typecheck (`tsc --noEmit`)
tiene ~10 errores **pre-existentes** (no introducidos esta sesión, ya estaban antes de tocar
nada): `src/app/leagues/page.tsx` (campos SATournament inexistentes — código legacy no tocado
esta sesión salvo el público que sí se arregló), `src/lib/data.ts` (labels en inglés vs
español), `src/components/PlanUsageBanner.tsx` / `SubscriptionSuccessBanner.tsx` (falta
`player_basic`/`player_unlimited` en un `Record<PlanId,...>`), `src/app/dashboard/player/profile/page.tsx:370`
(`RankingEntry.points` no existe), `src/app/api/stripe/webhook/route.ts` (tipos de Stripe SDK),
mobile/. Ninguno bloquea el build de Next (`ignoreBuildErrors` sigue activo) ni es parte del
alcance de esta sesión.

**Producción:** desplegada y funcionando. Los 5 síntomas reportados están **arreglados y
verificados con datos reales de Supabase** (ver §6 para el bug de perfil, el más reciente,
que quedó pendiente de que el usuario re-pruebe).

**Supabase (`asgafvrufdxzkjhjlapi`) — tablas actuales (26):**
```
admin_users, club_memberships*, club_ratings, club_reviews, clubs, email_templates,
friend_requests*, game_invitations*, join_requests, league_join_requests*, league_members*,
league_seasons*, personalizado_teams, personalizado_tournaments, platform_config,
player_field_definitions, player_leagues*, player_relationships (huérfana, sin uso),
players, promo_codes, promo_redemptions, quick_games, score_corrections, subscriptions,
tournament_notifications, tournaments
```
`*` = tablas nuevas creadas esta sesión. Todas con RLS: **lectura pública, escritura solo
service-role** (ningún cliente escribe con anon-key directo a estas tablas nuevas — todo pasa
por endpoints `/api/...`).

---

## 3. Qué se cambió (por fases, cada una commiteada y desplegada por separado)

### Fase 0 — Reparación de registro de usuarios (antes de las fases numeradas)
Causa raíz de "mis amigos no aparecen en ningún lado": el `id`/`shortId` de cada jugador se
calculaba **en el navegador** contando desde una lista semilla que terminaba en `#00118` — cada
navegador nuevo también calculaba `#00119` para su primer registro, chocando contra la cuenta
real del dueño. El servidor rechazaba el insert (protegiendo la fila existente) y el error se
tragaba en silencio → el usuario quedaba con cuenta de Auth pero sin fila de jugador.
- `src/app/api/player/register/route.ts` *(nuevo)* — el **servidor** asigna el id/shortId desde
  lo que realmente existe en Supabase, idempotente por email, con reintento ante colisiones.
- Auto-reparación al login y en `/auth/callback`: un usuario de Auth confirmado sin fila de
  jugador se crea al vuelo (`ensurePlayerRowForAuthUser` en `src/lib/supabase.ts`).
- Migración de ids locales (`migrateLocalPlayerId` en `player-league-store.ts`) cuando el id de
  sesión de un dispositivo cambia al canónico.
- `/api/leagues` con lógica de "claim": ligas creadas bajo un id local viejo se reasignan al
  id canónico del usuario autenticado al sincronizar.

### Fase 1 — Matar todo el demo/semilla + purga automática + páginas públicas
- `src/lib/seeds/players.ts`, `src/lib/seeds/games.ts` — `SEED_PLAYERS`, `SEED_FRIENDSHIPS`,
  `SEED_FRIEND_REQUESTS`, `INITIAL_GAMES` vaciados. Todo arranca vacío, se llena solo de Supabase.
- `src/lib/superadmin-data.ts` — quitados los fallbacks `MOCK_PLAYERS`/`MOCK_CLUBS`/
  `MOCK_TOURNAMENTS`/`MOCK_GAMES` que rellenaban el panel SA cuando el caché local estaba vacío.
- `src/lib/legacy-purge.ts` *(nuevo)* — `purgeLegacyLocalData()`, corre una vez por navegador
  (flag versionado `padelmgt_purge_version`), limpia claves fantasma de localStorage. Enganchado
  en `src/components/ClientProviders.tsx`.
- Páginas públicas corregidas para confiar en `null` (fetch falló) vs `[]` (de verdad vacío) en
  vez de caer a datos hardcodeados cuando Supabase devolvía cero filas:
  `src/app/page.tsx` (home), `src/app/calendar/page.tsx` (el peor: siempre concatenaba 12
  eventos falsos), `src/app/ranking/page.tsx`, `src/app/live-scores/page.tsx`,
  `src/app/leagues/page.tsx` (reescrita para leer `player_leagues` real en vez del dataset
  demo — hecho por un subagente).

### Fase 2 — Amistades reales (tabla `friend_requests` nueva)
El código anterior escribía a una tabla `friend_requests` que **no existía** en Supabase, con
el error tragado en `.catch(() => {})`, y nada leía de vuelta — por eso nunca funcionaban entre
usuarios.
- Tabla `friend_requests` (migración vía `apply_migration`).
- `src/app/api/friends/route.ts` *(nuevo)* — GET (incoming/sent/friends del caller) + POST
  (`send`/`accept`/`reject`/`cancel`/`remove`), autorizado contra `getCallerPlayerIds`.
- `src/lib/friend-request-store.ts` — nuevas funciones Supabase-first (`fetchFriendData`,
  `sendFriendRequestSB`, etc.); las funciones viejas de localStorage quedan como fallback.
- `src/app/dashboard/player/friends/page.tsx` — reescrita para buscar jugadores reales de
  Supabase y leer/escribir solicitudes vía el endpoint nuevo.
- `src/app/dashboard/player/page.tsx`, `src/components/DashboardSidebar.tsx` — widget de
  solicitudes pendientes y badge del sidebar leen del endpoint nuevo.

### Fase 3 — Juegos y torneos: reconciliación real (no solo agregar)
`syncUserGames`/`syncUserTournaments` antes solo agregaban/actualizaban filas de Supabase al
caché local, nunca quitaban las borradas en el servidor → un juego borrado en un dispositivo
seguía apareciendo en otro (síntoma #4 del dueño).
- `src/lib/game-store.ts` → `reconcileCreatorGames()`, `src/lib/tournament-store.ts` →
  `reconcileCreatorTournaments()` (+ `deleteTournament()`, que no existía).
- `src/lib/supabase-sync.ts` — las dos funciones ahora **reemplazan** el set de entidades del
  creador con lo que responde el servidor (confiando en `null`=falló vs `[]`=vacío de verdad).

### Fase 4a — Invitaciones a juegos (tabla `game_invitations` nueva)
Mismo patrón que amistades: invitaciones directas a juegos eran 100% localStorage.
- Tabla `game_invitations` + `src/app/api/invitations/route.ts` *(nuevo)*.
- `src/lib/invitation-store.ts` — mantiene su API síncrona (usada en 6 archivos) pero cada
  mutación empuja a Supabase; `syncMyInvitations()` nuevo para reconciliar al cargar.

### Fase 4b — Membresías de club (tabla `club_memberships` nueva)
- Tabla `club_memberships` + `src/app/api/club-memberships/route.ts` *(nuevo)*.
- `src/lib/club-membership-store.ts` — `joinClub`/`leaveClub` empujan a Supabase;
  `syncMyClubs()` nuevo.

### Limpieza de código muerto — rol Liga/Federación
Confirmado en Supabase (`auth.users`, `players`) que **cero usuarios reales** tenían los roles
`league_organizer`/`federation` (solo cuentas demo, gateadas por env flag). Borrado seguro:
- Borrados: `src/app/dashboard/league/**` (4 páginas), `src/app/dashboard/federation/**`
  (4 páginas), `src/hooks/useLeague.ts`, `src/lib/league-season-store.ts`,
  `src/lib/league-match-store.ts`, `src/lib/team-store.ts`.
- Editados (quitar el rol, no las features vivas): `src/proxy.ts`, `src/app/login/page.tsx`,
  `src/app/signup/page.tsx`, `src/app/auth/callback/page.tsx`, `src/lib/types.ts`,
  `src/lib/plan-config.ts`, `src/components/DashboardSidebar.tsx`,
  `src/components/PlanUsageBanner.tsx`, `src/app/api/stripe/create-checkout-session/route.ts`.
- **Importante — NO se tocó** (parecían muertos por el nombre pero están vivos):
  `src/lib/league-store.ts` (es la feature real de "Mis Ligas", Supabase-backed),
  `src/lib/league-membership-store.ts` y `src/lib/federation-membership-store.ts` (usados
  solo por el panel SA → Relaciones, vivo).

### Fase 4c — Catálogo de planes del SA (tabla nueva, vía `platform_config`)
`/pricing` público ya leía de Supabase (`platform_config.published_plans`, flujo de "Publicar").
El gap era el **borrador de trabajo** del SA (crear/editar/borrar planes en
`/superadmin/plans`), que vivía solo en localStorage.
- `src/app/api/sa/plan-catalog/route.ts` *(nuevo)* — mismo patrón `platform_config` que ya usa
  Torneo Personalizado, bajo la key `sa_plan_catalog`.
- `src/lib/plan-store.ts` — `updatePlan`/`addPlan`/`deletePlan` empujan a Supabase;
  `syncPlansFromSupabase()` nuevo. Enganchado en `src/app/superadmin/plans/page.tsx` y
  `src/app/superadmin/players/page.tsx` (dropdown de plan).

### Fix más reciente — guardado de perfil se perdía en silencio
Reportado por el dueño probando en vivo con su propia cuenta: cambió sexo/nivel en su perfil,
la UI decía "¡Perfil actualizado!" pero el panel SA seguía mostrando los valores viejos.
Confirmado con SQL directo: `custom_fields.sex` quedó como `"masculino"` (formato crudo, no
`'M'`) y `level` nunca cambió de `"1.0"`.
- **Causa raíz:** `updatePlayer()` en `src/lib/player-store.ts` buscaba al jugador en el caché
  local (`padelmgt_registered_players`) **primero**, y si no lo encontraba ahí (caché vacío/
  desincronizado — muy probable dado todo el trabajo de purga de esta sesión), **retornaba
  `null` sin llamar nunca a Supabase**. Sin error visible para el usuario.
- Fix: `src/app/dashboard/player/profile/page.tsx` ahora "siembra" el caché local
  (`seedLocalPlayer`, nuevo en `player-store.ts`) con el registro fresco que ya trae de
  Supabase al montar la página, y pasa `email` explícito en cada llamada a `updatePlayer`.
  `updatePlayer()` ya no aborta en silencio: si no hay fila local, arma una con los campos
  recibidos y **siempre** intenta el push (solo se niega si de verdad no hay email disponible).
- **Este es el commit más reciente (`b0ceddb`), ya desplegado, pero el dueño todavía no lo
  volvió a probar en vivo.** Ver §6 "próximo paso inmediato".

---

## 4. Qué se intentó y no aplicó / quedó fuera de alcance

- **Sincronizar TODOS los stores locales restantes:** el dueño eligió explícitamente
  "Catálogo de planes a Supabase" + "Borrar código muerto" como las dos prioridades de la
  última ronda (no "todo lo demás"). Quedan sin sincronizar (ver §7 pendientes) varios stores
  de menor impacto — la mayoría son o bien config de un solo admin, o herramientas internas SA,
  no datos de usuario cross-device críticos.
- **No se reparó manualmente el registro de Luis Gonzalez en la DB** (el `sex: "masculino"`
  corrupto) — decisión deliberada: mejor que el propio flujo arreglado lo re-escriba
  correctamente al volver a guardar, como verificación end-to-end real del fix, en vez de un
  parche SQL que oculte si el fix realmente funciona.
- **No se investigó a fondo** si hay más lugares con el mismo patrón "busca en caché local
  primero, aborta en silencio si no está" que el que causó el bug de perfil. Es plausible que
  exista en otros stores viejos no tocados esta sesión (revisar si aparecen más síntomas
  similares — guardados que "parecen" funcionar en la UI pero no llegan a Supabase).
- **Nada falló de forma irrecuperable.** Todos los intentos de esta sesión llegaron a build
  verde y se desplegaron; no hubo rollbacks.

---

## 5. Contexto esencial del proyecto (para no repetir preguntas en una sesión nueva)

- **Stack:** Next.js 16 (App Router, Turbopack) + TypeScript + Supabase (Postgres/Auth) +
  Vercel + Stripe. PWA con manifest.
- **Arquitectura histórica (la que se está migrando fuera):** "localStorage-first" — casi todo
  store en `src/lib/*-store.ts` usa `createLocalStore()` (`src/lib/local-store.ts`) para cachear
  en el navegador, con sync opcional a Supabase. El patrón correcto que esta sesión estableció
  para cualquier store nuevo/arreglado es: **Supabase es la fuente de verdad, localStorage es
  solo caché de pintado instantáneo**, con:
  1. Endpoint `/api/<recurso>/route.ts` service-role (usa `serviceClient()` +
     `getCallerPlayerIds(request)` de `src/lib/supabase-server.ts` para autorizar).
  2. Cada mutación del store empuja al endpoint (fire-and-forget está bien para UX, pero debe
     intentarse SIEMPRE, nunca condicionado a que el caché local tenga la fila — ese fue
     justamente el bug de perfil).
  3. Una función `syncXFromSupabase()`/`fetchX()` que se llama al montar la página relevante y
     **reemplaza** (no solo mezcla) el caché local con lo que responde el servidor, tratando
     `null` (fetch falló) distinto de `[]` (de verdad no hay datos).
- **Ramas:** desarrollar SIEMPRE en `claude/stoic-cray-vyzzbi`; mergear a
  `claude/build-padel-website-lhdAK` para deploy a producción (Vercel hace auto-deploy de esa
  rama). Patrón usado toda la sesión: commit en dev → push → `git checkout -B
  claude/build-padel-website-lhdAK origin/claude/build-padel-website-lhdAK` → `git merge --no-ff`
  → push → volver a dev.
- **Nunca** correr `next lint`/`tsc` como gate de bloqueo total — hay ~10 errores TS
  pre-existentes sin relación con el trabajo en curso (ver §2); usar `npm run build` como
  verificación real (usa `ignoreBuildErrors`).
- **SA (Super Admin):** login separado en `/superadmin/login`, sesión firmada
  (`SA_SESSION_SECRET`), NO usa el mismo sistema de auth que jugadores. Endpoints SA-only usan
  `requireSARequest(request)` + `saUnauthorized()` de `src/lib/sa-session.ts`.
- **Planes:** ladder unificado de 4 planes de jugador (Free, Player Basic, Player Pro, Player
  Ilimitado) — las ligas son una feature de jugador, no un plan separado (rol Liga deprecado y
  borrado esta sesión). `infinity` es un plan especial solo asignable desde SA, no vendible.
- **Referencias:**
  - Supabase project id: `asgafvrufdxzkjhjlapi`
  - Vercel Team: `team_UYyq39ZSJrJ3zg5Nte9SHbq0` · Project: `prj_kszOXvVyLZD5zDxlOW0mFg6mWr1w`
  - Dominio canónico: `padelmgt.com` (con `www`), `.net` redirige.
  - Dueño del proyecto: Luis Gonzalez (`luisgongra@gmail.com`), cuenta de prueba principal =
    `player-00119`, plan `infinity`. **No resetear su plan** al hacer limpiezas de datos.

---

## 6. Próximo paso inmediato

1. **Verificar el fix de guardado de perfil (`b0ceddb`) con el dueño.** Pedirle que vuelva a
   entrar a `/dashboard/player/profile`, cambie sexo y/o nivel, guarde, y confirmar con SQL
   directo (`SELECT custom_fields FROM players WHERE id = 'player-00119'`) que ahora sí llega
   `sex: "M"` y el nivel correcto — y que el panel SA → Jugadores lo refleja.
2. Si el fix funciona, preguntar si quiere seguir con el resto de Fase 4 (stores restantes) o
   dar por cerrado el frente de "Supabase como fuente de verdad".
3. Si aparecen más síntomas de "se ve guardado en la UI pero no llega a Supabase", sospechar
   primero del mismo patrón que causó el bug de perfil (función local que aborta en silencio
   cuando el caché no tiene la fila) antes de asumir otra causa.

---

## 7. Tareas — completadas y pendientes

### Completadas esta sesión (todas desplegadas a producción)
- [x] Reparación de registro server-first (id/shortId asignado por Supabase, no por el navegador)
- [x] Auto-reparación de fila de jugador al login / auth callback
- [x] Migración de ids locales + "claim" de ligas huérfanas
- [x] Fase 1: eliminación de datos demo/semilla + purga automática + páginas públicas reales
- [x] Fase 2: amistades reales cross-usuario (tabla `friend_requests`)
- [x] Fase 3: juegos/torneos con reconciliación real (borrados se propagan)
- [x] Fase 4a: invitaciones a juegos cross-device (tabla `game_invitations`)
- [x] Fase 4b: membresías de club cross-device (tabla `club_memberships`)
- [x] Borrado de código muerto del rol Liga/Federación (verificado 0 usuarios reales afectados)
- [x] Fase 4c: catálogo de planes del SA en Supabase (tabla vía `platform_config`)
- [x] Fix: guardado de perfil (sexo/nivel/etc.) que se perdía en silencio — **pendiente de
      re-verificación en vivo por el dueño**

### Pendientes (no iniciadas, requieren decisión del dueño sobre alcance)
- [ ] **Stores locales restantes sin sincronizar a Supabase** (impacto real, por prioridad):
  - `src/lib/ranking-store.ts` — historial de ranking por partido (los puntos totales YA
    sincronizan vía `players.ranking_points`; falta el detalle "+X pts en partido Y").
  - Config de un solo admin (bajo impacto, no bloquea nada): `src/lib/ranking-config-store.ts`,
    `src/lib/minor-categories-store.ts`.
  - Herramientas internas SA (bajo impacto): `src/lib/audit-log-store.ts` (`padelmgt_sa_audit`),
    `src/lib/sa-notes-store.ts`.
  - `src/lib/friends-ranking-store.ts` — snapshots, sin escritura activa detectada, revisar si
    sigue en uso antes de decidir.
- [ ] Confirmar que no queden más casos del patrón "aborta en silencio si el caché local no
      tiene la fila" en otros stores viejos no tocados esta sesión.
- [ ] Repasar la deuda técnica **anterior** a esta sesión (ver handoff 2026-06-30, §5 "Deuda
      técnica"): split-brain de quick-games/torneos legacy, RLS restante en tablas
      client-write, renombrar `middleware.ts`→`proxy.ts` (¡ya está como `proxy.ts`, revisar si
      esto ya se hizo y actualizar esa nota vieja!), limpiar SVGs de plantilla, rate limiters en
      memoria → store compartido.

---

## 8. Agentes / herramientas recomendadas para continuar

- **Antes de borrar o refactorizar cualquier store/página que "parezca" código muerto**: usar
  un agente `Explore` (o `general-purpose` en modo solo-lectura) para mapear el grafo de imports
  real primero — esta sesión encontró dos veces que nombres engañosos (`league-store.ts`,
  `league-membership-store.ts`) en realidad eran features vivas. No confiar en el nombre del
  archivo ni en suposiciones.
- **Antes de borrar filas o roles "sin uso"**: verificar con SQL directo en Supabase
  (`auth.users`, `players`) que no hay usuarios reales afectados — se hizo así para el borrado
  del rol Liga/Federación y evitó un posible incidente.
- **Para trabajo mecánico y bien acotado en paralelo** (arreglar 4-5 páginas con el mismo patrón
  de bug, por ejemplo): lanzar varios agentes `general-purpose` en paralelo, uno por archivo/
  página, con instrucciones muy específicas (el patrón exacto a buscar y el fix exacto a
  aplicar) — usado para las páginas públicas de la Fase 1 y para `/leagues`.
- **Para cualquier cambio de schema o dato en Supabase**: usar las tools `mcp__Supabase__*`
  directo (`apply_migration` para DDL, `execute_sql` para verificar/reparar datos) — no asumir,
  siempre confirmar con una consulta real antes y después de cualquier fix.
- Build de verificación real: `npm run build` (no solo `tsc --noEmit`, que tiene ruido
  pre-existente — ver §2).
