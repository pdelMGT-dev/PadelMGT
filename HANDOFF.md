# HANDOFF — PadelMGT Development Session

**Fecha:** 2026-06-17  
**Rama activa:** `claude/build-padel-website-lhdAK`  
**Último commit:** `c002e52`

---

## Objetivo general

Construir la plataforma completa de gestión de pádel PadelMGT para LATAM, con foco en:
1. **Torneo Personalizado** — formato 100% configurable por el organizador
2. **Sistema de Familia** — menores pueden inscribirse bajo cuenta de un adulto responsable
3. **UX pública** — landing page y páginas de torneos que expliquen los productos
4. **Mis Clubes** — ver detalle de cada club y valorarlo con estrellas

---

## Estado actual del código

### Torneo Personalizado — COMPLETO

El flujo completo existe y funciona:

- **Creación**: wizard en `/dashboard/player/tournaments/page.tsx` (>2000 líneas)
- **Panel de control** (`/dashboard/player/tournaments/personalizado/[id]/control/page.tsx`): segmentos 1-5, co-creadores, toggle `isChildTournament`
- **Programación** (`/dashboard/player/tournaments/personalizado/[id]/schedule/page.tsx`): grupos round-robin + eliminatoria
- **Detalle** (`/dashboard/player/tournaments/personalizado/[id]/page.tsx`): vista pública del torneo
- **Inscripción pública** (`/app/inscripcion/[code]/page.tsx`): link de inscripción por código, soporta miembros de familia

### Sistema de Familia — COMPLETO (fases 1-4)

- `src/lib/family-store.ts` — CRUD de `FamilyMember` y `FamilyLink`
- `src/lib/family-approval-store.ts` — aprobaciones pendientes del responsable
- `src/app/dashboard/player/profile/page.tsx` — sección "Mi Familia" con añadir/invitar/editar
- `src/app/api/family/member/route.ts`, `link/route.ts`, `lookup/route.ts`, `migrate-history/route.ts`
- Badge en sidebar "Mi Perfil" muestra conteo de aprobaciones + links pendientes
- Cuando un FM-id se enlaza a una cuenta real, se migra el historial de torneos

### Seguridad del Panel de Control — COMPLETO

- `canManagePersonalizado(t, userId)` — creator O co-creator tienen acceso
- Pantalla "Acceso denegado" en control, schedule y detail pages
- API `/api/personalizado/save` verifica `requesterId` contra DB (403 si no autorizado)
- Co-creadores NO pueden modificar `coCreatorIds`

### Validación de edad servidor — COMPLETO

- `/api/personalizado/register/route.ts` valida regla Jan-1 (`ageOnJan1`, `isEligibleForMaxAge`)
- Frontend envía `player1BirthDate` y `player2BirthDate` al registrar
- Badge "MENORES DE X" visible en selector de categorías de la inscripción pública

### Banner Torneo Personalizado — COMPLETO (commit c002e52)

- `src/app/page.tsx` — banner hero full-width entre formato grid y live matches
- `src/app/tournaments/page.tsx` — banner entre formato grid y torneos activos
- Tabla de precios: $9 / $19 / $29 / $49 por tramos de equipos
- Diseño: fondo oscuro con cancha semitransparente, headline + CTA + price table

### Mis Clubes — Detalle y Rating (commit c002e52)

- `src/app/dashboard/player/clubs/page.tsx` — botón "Ver detalles →" en cards y filas
- `src/app/dashboard/player/clubs/[clubId]/page.tsx` — página nueva con:
  - Cabecera oscura con iniciales, nombre, rating promedio
  - Stats: canchas, miembros, tipo, plan
  - Descripción, tipos de cancha, amenidades
  - Embed Google Maps (si mapsUrl existe)
  - Valoración comunitaria: promedio global + picker de estrellas interactivo (1-5)
  - Botón Unirse/Salir inline
- `src/app/api/clubs/rating/route.ts` — GET (promedio + rating del usuario) / POST (upsert)

---

## Archivos clave activos

| Archivo | Propósito |
|---------|-----------|
| `src/app/page.tsx` | Landing pública — banner personalizado añadido |
| `src/app/tournaments/page.tsx` | Torneos públicos — banner personalizado añadido |
| `src/app/dashboard/player/clubs/page.tsx` | Mis Clubes — botón ver detalles añadido |
| `src/app/dashboard/player/clubs/[clubId]/page.tsx` | **NUEVO** — Detalle de club + rating |
| `src/app/api/clubs/rating/route.ts` | **NUEVO** — API de ratings (Supabase) |
| `src/lib/personalizado-store.ts` | Store principal del torneo personalizado |
| `src/lib/family-store.ts` | Store de miembros y links de familia |
| `src/app/api/personalizado/save/route.ts` | Guarda config, verifica autorización |
| `src/app/api/personalizado/register/route.ts` | Registro de equipos con validación de edad |
| `src/components/DashboardSidebar.tsx` | Sidebar con badge de familia pendiente |
| `src/app/superadmin/relations/page.tsx` | Superadmin con tab "Familia" |
| `src/app/api/family/migrate-history/route.ts` | Migra historial FM-id → player real |

---

## Lo que se intentó y falló

### `useEffect` + `setState` para guards de acceso
- **Problema**: El linter custom `set-state-in-effect` bloqueaba `useEffect(() => setAccessDenied(...))`.
- **Solución aplicada**: Convertir a valor derivado: `const accessDenied = !!tournament && !canManagePersonalizado(tournament, currentUser?.id)` — sin estado, sin efecto.

### Importación duplicada de `Link` en tournaments/page.tsx
- Al añadir el banner, el archivo ya tenía `Link` importado. Se generó una línea en blanco extra entre imports, corregida inmediatamente con un segundo Edit.

---

## Pendiente / próximos pasos sugeridos

### 1. Crear tabla Supabase `club_ratings` (BLOQUEANTE para ratings)
La API existe pero la tabla no. Ejecutar en Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS club_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     text NOT NULL,
  player_id   text NOT NULL,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (club_id, player_id)
);
```

### 2. Mostrar rating promedio en las cards de Mis Clubes
Actualmente el rating sólo se ve en la página de detalle. Para mostrarlo en el listado habría que:
- Cargar ratings de todos los clubes del jugador en batch (un endpoint `/api/clubs/ratings-bulk`)
- O almacenar un promedio denormalizado en la tabla de clubes

### 3. Widget de Torneo Personalizado en el home del dashboard
`/dashboard/player` (el home del jugador logueado) podría tener un acceso rápido al Torneo Personalizado, similar al banner público.

### 4. Notificaciones de links de familia por email
`requestFamilyLink` llama a la API cuando Supabase está configurado, pero el envío de email (Resend) no está implementado en la ruta `/api/family/link`. Habría que añadirlo similar a cómo se hace en `/api/email/send`.

### 5. Flujo de aprobación del responsable en Torneo Personalizado
El responsable (guardian) debe estar logueado él mismo para inscribir a sus menores. No existe invitación cruzada entre guardians dentro de un torneo personalizado. Si se quiere ese flujo, habría que diseñarlo desde cero.

### 6. Tests E2E
No hay tests automatizados. Prioridad alta para:
- Flujo inscripción con menor (age validation)
- Acceso co-creator vs no-autorizado al panel de control
- Upsert de rating de club

---

## Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # para serviceClient() en API routes
RESEND_API_KEY=...              # para emails de invitación de familia
```

---

## Notas de arquitectura

- **localStorage-first**: toda escritura va primero a localStorage, luego fire-and-forget a Supabase. Las lecturas usan localStorage como caché y Supabase como fuente de verdad cuando está configurado.
- **`serviceClient()`** en `src/lib/supabase-server.ts` — cliente server-side con service role, sólo para API routes.
- **`next.config`** tiene `typescript: { ignoreBuildErrors: true }` — hay errores TS preexistentes en el proyecto que no bloquean el build.
- **Params asíncronos Next.js 16**: todos los `[id]` pages usan `use(params)` en lugar de acceso directo.
- **IDs de miembros de familia**: formato `FM-XXXX-1234` (TEXT, sin FK en el schema de Supabase).
