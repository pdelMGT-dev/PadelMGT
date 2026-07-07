EventPill from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.EventPill` (bundle loaded from the root `_ds_bundle.js`).

Small colored calendar event label. Wraps `.event-pill` from globals.css.

## Props

```ts
interface EventPillProps {
  kind?: "tournament" | "league" | "quick";
  children: React.ReactNode;
}
```
