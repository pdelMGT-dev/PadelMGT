Chip from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.Chip` (bundle loaded from the root `_ds_bundle.js`).

Small toggleable pill, used for filters. Wraps the real `.chip` class from globals.css.

## Props

```ts
interface ChipProps {
  id?: string;
  style?: CSSProperties;
  children: React.ReactNode;
  active?: boolean;
}
```
