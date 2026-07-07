Badge from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.Badge` (bundle loaded from the root `_ds_bundle.js`).

Small uppercase pill label. Wraps the real `.badge` class from globals.css with a governed color palette.

## Props

```ts
interface BadgeProps {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "neon" | "outline";
  children: React.ReactNode;
  className?: string;
}
```
