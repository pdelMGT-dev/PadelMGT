Button from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.Button` (bundle loaded from the root `_ds_bundle.js`).

Pill-shaped call-to-action button. Wraps the real `.btn` / `.btn-*` classes from globals.css.

## Props

```ts
interface ButtonProps {
  variant?: "primary" | "neon" | "secondary" | "on-dark" | "outline-dark";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
  href?: string;
}
```
