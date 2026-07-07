PillTab from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.PillTab` (bundle loaded from the root `_ds_bundle.js`).

Tab-style pill button, used for section/view switches. Wraps the real `.pill-tab` class from globals.css.

## Props

```ts
interface PillTabProps {
  id?: string;
  style?: CSSProperties;
  children: React.ReactNode;
  active?: boolean;
}
```
