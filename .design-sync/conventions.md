## Conventions

**No provider or wrapper required.** Every component here is pure and presentational — no context, no data fetching, no routing. Compose them directly.

**Styling idiom: real class names, not utilities.** Every visual style comes from a fixed vocabulary of classNames baked into each component (from `styles.css`) plus a small set of CSS custom properties for anything that needs a color/tone choice. There is no utility-class system (no Tailwind-style `bg-*`/`gap-*`) — never invent a className.

Key class families actually shipped (see `styles.css` for the full, exact list):
- Buttons: `btn` + one of `btn-primary | btn-secondary | btn-on-dark | btn-neon | btn-outline-dark`, plus optional `btn-sm | btn-lg`. Applied automatically by `<Button variant="..." size="...">` — never write these classNames by hand, use the component.
- Pills: `badge` (small status label), `chip` (toggleable filter), `pill-tab` (tab switch, has `.active` state) — via `<Badge>`, `<Chip active>`, `<PillTab active>`.
- Headers: `page-header`/`page-title`/`page-sub` (public marketing hero) via `<PageHeader>`; `section-eyebrow`/`section-title`/`section-sub`/`section-header-row` (marketing section intro) via `<SectionHeader>`; the player dashboard page header has no dedicated CSS class, it's inline-styled — use `<DashboardPageHeader eyebrow title action?>`.
- Dashboard hero stats: `bs-tile`/`bs-tile-value`/`bs-tile-label`/`bs-tiles` via `<StatTile>` inside `<StatTileGrid>` — always compose 2-3 `StatTile`s inside one `StatTileGrid`, never a lone tile outside a dark hero background.
- `bs-avatar` via `<Avatar name photoUrl?>` (circular, falls back to initials).
- `event-pill` + `tournament|league|quick` modifier via `<EventPill kind>`.
- `card-image` via `<CardImage src alt>` (cropped, hover-zoom).
- `divider` via `<Divider>`.

**Color tone via CSS custom properties, not hex.** Never hardcode a hex value in new composition code — use the tokens (`--black`, `--court-blue`, `--court-blue-deep`, `--turf-green`, `--neon`, `--grey-50` … `--grey-900`, `--red-500`, `--green-500`, `--font-display`, `--font-body`). `Badge` already encodes the standard status palette via its `tone` prop (`neutral | success | warning | danger | info | primary | neon | outline`) — reuse those tones for any new status pill instead of picking new colors.

**Typography**: display/heading text (page titles, section titles, dashboard hero title, stat values) uses `var(--font-display)` (Oswald, condensed, uppercase, tight letter-spacing) — body text and UI copy uses `var(--font-body)` (Inter). `PageHeader`/`SectionHeader`/`DashboardPageHeader`/`StatTile` already apply this; don't override it.

**Where the truth lives**: `styles.css` (all classes + the `:root` token block) and each component's own `.tsx` file — read those before styling something new. `Card`'s `variant="dashed"` is the standard empty-state/placeholder look (also see `EmptyState`, which composes it).

**Build snippet** — a typical dashboard list page (mirrors the real "Mis Ligas" page):

```tsx
import { DashboardPageHeader, Button, Table, TableRow, Th, Td, Badge } from 'padelmgt-design-system';

<div>
  <DashboardPageHeader
    eyebrow="Competencias"
    title="Mis Ligas"
    action={<Button href="/leagues/create">+ Crear Liga</Button>}
  />
  <Table>
    <thead><tr><Th>Liga</Th><Th align="center">Miembros</Th><Th>Estado</Th></tr></thead>
    <tbody>
      <TableRow>
        <Td>Liga Vecinal</Td>
        <Td align="center">12</Td>
        <Td><Badge tone="success">Activa</Badge></Td>
      </TableRow>
    </tbody>
  </Table>
</div>
```
