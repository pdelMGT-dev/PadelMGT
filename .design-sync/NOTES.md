# PadelMGT Claude Design sync — notes

## Setup that differs from the skill's defaults

- **No npm workspace / no build pipeline for the DS.** `src/design-system/` lives
  inside the main Next.js app (not a separate published package). To satisfy the
  converter's requirement for a real `.d.ts` tree (component discovery reads
  shipped `.d.ts` exports, not raw `.tsx` — synth-entry mode only synthesizes the
  JS bundle entry, not types), it has its own local `package.json`
  (`name: padelmgt-design-system`, `types: dist-types/index.d.ts`) and
  `tsconfig.build.json` (declaration-only emit). Regenerate types before every
  build/re-sync: `cd src/design-system && npx tsc -p tsconfig.build.json`.
- **`--entry` points directly at real TS source**, not a `dist/` bundle:
  `--entry ./src/design-system/index.ts`. The walk-up from that path finds
  `src/design-system/package.json` first (has a `name`), so `PKG_DIR` = that
  directory — hence `cfg.srcDir: "."` and `cfg.cssEntry: "styles.css"` (both
  relative to `src/design-system/`, not the repo root).
- **`cfg.cssEntry` is inlined into `_ds_bundle.css` as raw text — its own
  `@import`s are never resolved/copied.** `styles.css` must be a single,
  fully self-contained file (no local `@import`s). It's a hand-kept-in-sync
  curated copy of the tokens/classes from `src/app/globals.css` that these
  primitives actually use — NOT an `@import '../app/globals.css'` (that
  failed `[CSS_IMPORT_MISSING]`: cssEntry is bounded to `PKG_DIR`, can't
  reach outside `src/design-system/`). **Re-sync risk**: if `globals.css`'s
  token values or the classes listed below change, `src/design-system/styles.css`
  will silently drift — no automated check catches this. Classes mirrored:
  `btn*`, `badge`, `chip`, `pill-tab`, `card-image`, `field`, `page-header*`,
  `section-*`, `divider`, `bs-tile*`, `bs-avatar`, `event-pill`.
- **Chromium version mismatch**: this environment's pre-installed Chromium
  (`/opt/pw-browsers/chromium-1194`) is older than what a freshly-installed
  `playwright` package pins (`browsers.json` wants build 1228). Validate with
  `DS_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node
  .ds-sync/package-validate.mjs ./ds-bundle` — `package-validate.mjs` already
  reads this env var.

## Known render warns (triaged, don't chase)

- None outstanding. `[GRID_OVERFLOW]` on `SectionHeader`'s `WithAction` story
  was fixed via `cfg.overrides.SectionHeader: {"cardMode": "column"}`.

## Accepted, not fixed

- **`[FONT_MISSING]` — Inter & Oswald.** The live app self-hosts both via
  `next/font/google` (see `src/app/layout.tsx`), which emits hashed `.woff2`
  files only inside `.next/` at build time — not a stable path to reference
  from `cfg.extraFonts`. Accepted system-font substitutes for now (non-blocking;
  `package-validate.mjs` still exits 0). **To actually fix**: download Inter
  and Oswald `.woff2` files directly from Google Fonts, commit them under
  `src/design-system/fonts/`, add a small `@font-face` CSS block to
  `styles.css`, and set `cfg.extraFonts` accordingly.
- **`PageHeader`'s background** (`.page-header-bg`) uses a gradient
  approximation (`linear-gradient(160deg, var(--court-blue-deep) 0%,
  var(--court-blue) 140%)`) instead of the real app's
  `url('/assets/court-bg.svg')` — that path is an absolute app URL the
  converter's sandboxed bundle can't resolve. Visually close, not pixel-identical.

## Preview authoring scope (first sync)

Authored real previews only for the 6 components the render check flagged
`[RENDER_THIN]` (floor-card text-only render): `DashboardPageHeader`,
`EmptyState`, `Field`, `PageHeader`, `SectionHeader`, `StatTile`. The
remaining 17 (`Avatar`, `Badge`, `Button`, `Card`, `CardImage`, `Chip`,
`Divider`, `EventPill`, `FieldInput`, `FieldSelect`, `FieldTextarea`,
`PillTab`, `Table`, `TableRow`, `Td`, `Th`, `StatTileGrid`) ship on the
floor card (they still render — a real, non-crashing container — just not a
rich authored example). This was a deliberate scope cut, not a shortfall:
authoring more previews is the standing offer on any future re-sync
(`.design-sync/previews/<Name>.tsx` — floor-card grades and files carry
forward, nothing is lost by doing this incrementally).

## Environment quirks hit during the first sync (resolved)

- **`create_project` permission prompts** intermittently failed with `Tool
  permission stream closed before response received` in this remote/headless
  session — resolved on retry (2-3 attempts). Looked like a UI delivery
  issue, not a user rejection.
- **`write_files` needs the FULL `/design-login` OAuth**, not just
  `/design-consent` (which is enough for `list_projects`/`create_project`/
  `finalize_plan`). `/design-login` requires a real interactive terminal
  with browser access — cannot run in this remote/headless environment at
  all, no amount of retrying fixes it. The actual upload had to be done from
  a genuinely local Claude Code session (Terminal, not the desktop app's
  "Code" tab — that also runs in the cloud sandbox). That local session
  didn't have the `/design-sync` skill's converter scripts available, so
  rather than reproducing them there, the already-built-and-validated
  `ds-bundle/` was committed to git as a one-time snapshot so the (locally
  authorized) session could upload it directly with no rebuild. That commit
  was removed again once the upload succeeded — don't expect to find it in
  history going forward; if a future re-sync hits this same wall, repeat the
  trick (temporarily `git add -f ds-bundle/...` the relevant paths, commit,
  push, have the authorized machine pull + upload, then revert the commit).
- **Wrong project type on first `create_project` call**: creating the
  project via the standalone `mcp__claude-design__create_project` tool (as
  opposed to `DesignSync`'s own `create_project` method) produced a project
  of type `PROJECT_TYPE_PROJECT`, not `PROJECT_TYPE_DESIGN_SYSTEM` — this
  wasn't caught until the upload step. Always `DesignSync(get_project)`
  right after creation and confirm `type: PROJECT_TYPE_DESIGN_SYSTEM` before
  proceeding. The wrong-type project (`07ecbe06-d143-42a5-a20d-8aa04fec5410`)
  was deleted; the real one is `356bff9f-056a-440c-a68a-516f990fa5b0`
  ("PadelMGT Design System") — already recorded as `projectId` in
  `.design-sync/config.json`.
