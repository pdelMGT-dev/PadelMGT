# PadelMGT — Handoff Document
_Last updated: 2026-05-31_

---

## Project Goal

PadelMGT is a SaaS platform for managing padel tournaments, quick games, clubs, and leagues — targeting Latin America and Spain. It allows players to register, join clubs, create/enter quick games and tournaments, track rankings, and manage friendships. Club admins and federation admins have dedicated dashboards. A superadmin panel manages all entities.

---

## Current State

- **Status:** Feature-complete demo / MVP. All pages render and most flows are functional end-to-end.
- **Data persistence:** 100% client-side via `localStorage`. A Supabase backend is wired up for players, clubs, tournaments, and quick games, but only syncs if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Without those env vars, `supabase.ts` exports `null` and every write silently no-ops to Supabase.
- **Auth:** Fake cookie-based auth. Login writes a cookie (`padelmgt_session`) so the Next.js middleware can gate routes. There is no JWT, no server-validated session, and no password hashing — passwords are stored in plaintext in localStorage.
- **Deployment:** Next.js 16.2.4 with Turbopack. `typescript.ignoreBuildErrors: true` in `next.config.ts` — TypeScript errors are suppressed at build time.

---

## Architecture Overview

```
src/
├── app/                          # Next.js App Router pages
│   ├── dashboard/                # Authenticated role dashboards
│   │   ├── player/               # Player-facing pages (15 pages)
│   │   ├── club/                 # Club admin pages (4 pages)
│   │   ├── league/               # League organizer pages (4 pages)
│   │   └── federation/           # Federation admin pages (4 pages)
│   ├── superadmin/               # Internal SA panel (9 pages)
│   └── (public)/                 # Landing, login, signup, tournaments, clubs, ranking...
├── components/                   # Shared UI components (8 components)
├── lib/                          # Data layer: stores + engines
│   ├── player-store.ts           # RegisteredPlayer CRUD + friendships
│   ├── game-store.ts             # ActiveGame CRUD + 13 seed games (762 lines)
│   ├── tournament-store.ts       # Tournament CRUD (mirrors game-store shape)
│   ├── club-membership-store.ts  # Club join/leave
│   ├── match-history.ts          # Derived match history from games/tournaments
│   ├── ranking-store.ts          # Ranking history
│   ├── game-engine.ts            # Pure business logic: round generation, standings
│   ├── tournament-engine.ts      # Tournament-specific engine (extends game-engine)
│   ├── superadmin-data.ts        # SA data + Supabase R/W for all entities (744 lines)
│   ├── supabase-sync.ts          # Pull-from-Supabase sync (runs on dashboard load, TTL 30s)
│   ├── supabase.ts               # createClient wrapper (null if env vars missing)
│   ├── superadmin-auth.ts        # sessionStorage-based SA login
│   ├── friend-request-store.ts   # Friend request lifecycle
│   ├── invitation-store.ts       # Game/tournament invitation management
│   ├── join-request-store.ts     # Club join request management
│   ├── league-membership-store.ts
│   ├── federation-membership-store.ts
│   ├── ranking-config-store.ts
│   ├── sanitize.ts
│   ├── data.ts                   # Static mock data (tournamentFormats, leagues, clubs, etc.)
│   └── types.ts                  # Shared TypeScript types (incomplete — not used consistently)
└── middleware.ts                 # Route protection + cross-role redirect
```

**Tech stack:** Next.js 16.2.4, React 19, TypeScript, Supabase JS client, Lucide React, qrcode.react, Stripe webhook handler (stub).

---

## Data Flow

```
User action (UI)
  → store function (src/lib/*.ts)   [localStorage read/write]
  → fire-and-forget upsert to Supabase (if configured)

Dashboard load (DashboardSidebar.tsx, once per 30s)
  → syncAllFromSupabase()           [pulls Supabase → localStorage]

SA Panel pages
  → getSAXxx() / saveSAXxx()        [localStorage primary + 5s polling from Supabase]
```

Two "player" models coexist:
- `RegisteredPlayer` (player-store.ts) — used by the player-facing app
- `SAPlayer` (superadmin-data.ts) — used by the SA panel

They are kept in sync via `saveSAPlayers` writing back to `padelmgt_registered_players` and `syncPlayers` in supabase-sync.ts merging them on load.

---

## Active Files (recently edited / highest churn)

Based on complexity and cross-cutting concerns:

| File | Lines | Notes |
|------|-------|-------|
| `src/app/dashboard/player/quick-game/page.tsx` | 1340 | Largest page — multi-step game creation + active game management |
| `src/app/superadmin/players/page.tsx` | 1486 | SA player management |
| `src/app/dashboard/player/tournaments/page.tsx` | 1626 | Tournament creation + management |
| `src/app/superadmin/clubs/page.tsx` | 1215 | SA club management |
| `src/app/superadmin/tournaments/page.tsx` | 816 | SA tournament table |
| `src/lib/game-store.ts` | 762 | 13 seed game objects + store |
| `src/lib/superadmin-data.ts` | 744 | All SA data + Supabase mappers |
| `src/app/superadmin/config/page.tsx` | 692 | SA config (Stripe, custom fields, admin users) |
| `src/app/superadmin/relations/page.tsx` | 703 | SA relationship viewer |

---

## Known Issues & Technical Debt

### Critical

1. **No real authentication** (`src/lib/superadmin-auth.ts`, `src/app/login/page.tsx`, `src/middleware.ts`)
   - Passwords stored in plaintext in `localStorage` (`player-store.ts` line 153: `password: params.password`).
   - The superadmin password is hardcoded in `superadmin-auth.ts` line 2: `password: 'PadelMGT2026!'`.
   - The middleware only checks for the *existence* of `padelmgt_session` cookie — any value passes. A malicious user can set the cookie manually.
   - The session cookie carries the user's role as a plain string (`padelmgt_session=super_admin`) — trivially forgeable.

2. **`typescript.ignoreBuildErrors: true`** (`next.config.ts` line 32)
   - TypeScript errors are silently swallowed at build time. Real type bugs can ship undetected. Should be removed once major type gaps are resolved.

3. **localStorage as primary database** (all `src/lib/*.ts` stores)
   - 5–10 MB browser cap. With 13 seeded games (each with full round/standings data), `padelmgt_games` alone can approach 500 KB.
   - Data is per-device: no cross-device sync without Supabase configured.
   - All stores are synchronous — no error boundary if quota is exceeded.

### High Priority

4. **Duplicated `padelmgt_user` read pattern** — 16 files copy-paste the same ~5-line block:
   ```ts
   const raw = localStorage.getItem('padelmgt_user');
   if (raw) { const u = JSON.parse(raw) as SomeLocalType; … }
   ```
   Files affected: all 13 `src/app/dashboard/player/**` pages, `src/app/quick-game/[code]/page.tsx`, `src/app/tournament/[code]/page.tsx`, `src/components/DashboardSidebar.tsx`.
   There is no shared `useCurrentUser` hook or session context.

5. **Scattered mock/seed data** mixed into store files
   - `MOCK_PLAYERS` (10 entries) and `MOCK_CLUBS` (5 entries): `src/lib/superadmin-data.ts` lines 106–125
   - `SEED_PLAYERS` (18 entries): `src/lib/player-store.ts` lines 26–45
   - `SEED_FRIENDSHIPS`: `src/lib/player-store.ts` lines 181–185
   - `SEED_REQUESTS` (3 entries): `src/lib/friend-request-store.ts` lines 22–27
   - 13 hard-coded seed games (`g1`–`g13`): `src/lib/game-store.ts` lines 101–573
   - Mock tournaments / mock games: `src/lib/superadmin-data.ts` lines 326–376
   All should live in `src/lib/seeds/` and be imported where needed.

6. **Two duplicate localStorage read/write helpers** in every store (`load`/`persist`, `isServer`, etc.) — identical pattern repeated across: `player-store.ts`, `game-store.ts`, `tournament-store.ts`, `club-membership-store.ts`, `friend-request-store.ts`, `invitation-store.ts`, `join-request-store.ts`, `league-membership-store.ts`, `federation-membership-store.ts`, `ranking-store.ts`.
   A single generic `localStore<T>(key, fallback)` utility would cut ~50 lines per file.

7. **Duplicate Supabase fetch patterns** — `getSAPlayersFromSupabase`, `getSAClubsFromSupabase`, `getSATournamentsFromSupabase`, `getSAGamesFromSupabase`, `getSAAdminUsersFromSupabase` all follow the exact same try/catch/null pattern in `superadmin-data.ts`. Could be extracted to a `supabaseFetch<T>` helper.

8. **`game-store.ts` is 762 lines** with 460 lines of inline seed data (g1–g13). The seed data should be split into `src/lib/seeds/games.ts`.

9. **Two `Tournament` types** — `src/lib/types.ts` exports a lightweight `Tournament` interface; `src/lib/tournament-store.ts` re-exports `ActiveGame` as `Tournament`. Components that import from both get incompatible shapes silently.

### Medium

10. **No shared form/input component** — inline style objects for `inp`, `sel`, `lbl`, `card`, `secTitle` are re-declared in multiple pages (`quick-game/page.tsx` lines 65–86, and similar patterns in superadmin pages). Each page maintains its own style system.

11. **`src/lib/data.ts`** contains static arrays for `tournamentFormats`, `leagues` (mock data), `clubs` (mock data), and `match` objects. These are used by public-facing pages (`/tournaments`, `/leagues`, `/clubs`) but are completely disconnected from the dynamic stores. New tournaments created in the app never appear on `/tournaments`.

12. **`src/lib/types.ts` is underused** — defines `User`, `Tournament`, `League`, `Club`, `Match`, `PlayerStats` types but most pages define their own inline types. Inconsistency makes cross-file refactors risky.

13. **`superadmin-data.ts` dual responsibility** — acts as both the type/model definition layer AND the Supabase integration layer. The file has grown to 744 lines. Should be split into `sa-types.ts` / `sa-local-store.ts` / `sa-supabase.ts`.

14. **Hardcoded stats in dashboard** — `src/app/dashboard/player/page.tsx` lines 228–231 uses hardcoded values (`'24'`, `'#47'`, `'1,840'`, `'+120 esta semana'`) for "Torneos jugados", "Ranking", and "Puntos" when the player has history. Only the "Wins" stat is actually computed from real data.

### Low / Nice to have

15. All inline `style={{}}` objects — no CSS-in-JS library, no CSS modules, no Tailwind. The design system exists only as CSS custom properties (`--neon`, `--black`, etc.) in `globals.css`. Large pages have hundreds of inline style objects, making visual consistency drift hard to catch.

16. **`src/app/superadmin/stripe/page.tsx`** and **`src/app/superadmin/config/page.tsx`** both manage `padelmgt_stripe_config` in localStorage — duplicated key, duplicated logic.

17. **Missing loading/error states** on Supabase operations — SA pages show a spinner while polling but don't surface fetch errors to the user.

18. **`src/middleware.ts`** role check logic can mismatch — role strings in the cookie (`player`, `super_admin`, `club_manager`) don't exactly match the keys in `ROLE_PATHS` (`club_manager` vs `club`). A `club_manager` cookie can access `/dashboard/club` correctly but the redirect fallback for a mis-matched role sends them to `/login` instead of their dashboard.

---

## What's Been Tried (that changed or was abandoned)

- **`padelmgt_tournaments_v2`** key (superadmin-data.ts line 296) — the `v2` suffix implies a schema migration happened. The original `padelmgt_tournaments` key is still used by `tournament-store.ts` for player-facing tournaments. These are two separate stores for the same concept; SA panel reads `_v2`, player dashboard reads the non-suffixed key.
- **`padelmgt_sa_players`** was added as a separate SA-specific copy of players on top of `padelmgt_registered_players`. The merge logic in `getSAPlayers` is complex because of this layering.
- The `Club` type in `types.ts` and the `SAClub` type in `superadmin-data.ts` are parallel definitions that grew independently.

---

## Pending Tasks

- [ ] Wire up real Supabase auth (replace cookie + localStorage session)
- [ ] Remove plaintext password storage
- [ ] Remove `typescript.ignoreBuildErrors: true`
- [ ] Connect public `/tournaments` page to real tournament store
- [ ] Implement actual Stripe billing (webhook route stub exists at `src/app/api/stripe/webhook/route.ts`)
- [ ] Build ranking calculation from actual match history (currently `rankingPoints` is manually adjusted)
- [ ] Add pagination to SA player/club/tournament tables (currently all data is loaded at once)
- [ ] Extract seed data into `src/lib/seeds/`
- [ ] Create a `useCurrentUser` hook to replace 16 copy-pasted `localStorage.getItem('padelmgt_user')` blocks
- [ ] Unify the two `Tournament` type definitions

---

## Next Steps (recommended order)

1. **Extract `useCurrentUser` hook** — highest ROI, removes 16 duplicated code blocks immediately, sets foundation for a real auth context.
2. **Move seed data to `src/lib/seeds/`** — decouples demo data from store logic; makes it easy to swap out or wipe seeds.
3. **Fix `typescript.ignoreBuildErrors`** — run `tsc --noEmit`, fix the reported errors, then remove the flag. Prevents silent type regressions.
4. **Unify the `Tournament` types** — `types.ts::Tournament` vs `tournament-store.ts::Tournament (= ActiveGame)` collision.
5. **Extract a `localStore<T>` helper** — eliminate duplicated load/persist/isServer pattern in all store files.
6. **Replace cookie auth with Supabase Auth** — prerequisite for any real production use.
7. **Split `superadmin-data.ts`** — types / local-store / supabase into 3 files.
8. **Split `game-store.ts`** — move seed games to `src/lib/seeds/games.ts`.

---

## File Map (key files)

| Purpose | File |
|---------|------|
| App entry / root layout | `src/app/layout.tsx` |
| Route protection | `src/middleware.ts` |
| Sidebar + sync trigger | `src/components/DashboardSidebar.tsx` |
| Player data + auth | `src/lib/player-store.ts` |
| Game logic (pure) | `src/lib/game-engine.ts` |
| Quick game storage | `src/lib/game-store.ts` |
| Tournament storage | `src/lib/tournament-store.ts` |
| SA data + Supabase | `src/lib/superadmin-data.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Supabase pull-sync | `src/lib/supabase-sync.ts` |
| SA auth | `src/lib/superadmin-auth.ts` |
| Shared types (underused) | `src/lib/types.ts` |
| Static mock data | `src/lib/data.ts` |
| Player dashboard home | `src/app/dashboard/player/page.tsx` |
| Quick game creation | `src/app/dashboard/player/quick-game/page.tsx` |
| Tournament creation | `src/app/dashboard/player/tournaments/page.tsx` |
| SA dashboard | `src/app/superadmin/dashboard/page.tsx` |
| SA players | `src/app/superadmin/players/page.tsx` |
| SA clubs | `src/app/superadmin/clubs/page.tsx` |
| Next.js config | `next.config.ts` |
| Client providers | `src/components/ClientProviders.tsx` |
