SectionHeader from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.SectionHeader` (bundle loaded from the root `_ds_bundle.js`).

Marketing section header (eyebrow + big uppercase title + optional subtitle/action). Wraps `.section-*` classes from globals.css.

## Props

```ts
interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
```
