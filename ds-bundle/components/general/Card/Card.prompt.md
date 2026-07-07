Card from padelmgt-design-system. Use via `window.PadelMGTDesignSystem.Card` (bundle loaded from the root `_ds_bundle.js`).

Bordered content container. Matches the border pattern reused across dashboard tables, panels and empty states.

## Props

```ts
interface CardProps {
  id?: string;
  children: React.ReactNode;
  /** 'solid' matches bordered containers (tables, list wrappers). 'dashed' matches empty-state placeholders. */
  variant?: "solid" | "dashed";
  padding?: string | number;
  style?: CSSProperties;
}
```

## Related

`CardImage`
