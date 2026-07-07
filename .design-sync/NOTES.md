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

## Environment quirk: DesignSync tool permission prompts

`create_project` and `finalize_plan` calls in this session intermittently
failed with `Tool permission stream closed before response received` —
sometimes resolving on a retry (2-3 attempts), sometimes not resolving at
all within the session. This looks like an environment/UI issue delivering
the approval dialog in this remote/headless session, not a user rejection.
If a re-sync hits the same wall, tell the user plainly and offer: retry:
approve from a local interactive Claude Code session instead (where this
consistently worked); or hand them `ds-bundle/` + the exact upload commands
to run themselves.
