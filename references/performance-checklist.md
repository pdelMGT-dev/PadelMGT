# Performance Checklist

Quick reference for web application performance. Use alongside the `performance-optimization` skill.

## Core Web Vitals Targets

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| **LCP** (Largest Contentful Paint) | ≤2.5s | 2.5-4.0s | >4.0s |
| **INP** (Interaction to Next Paint) | ≤200ms | 200-500ms | >500ms |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | 0.1-0.25 | >0.25 |

## Pre-Launch Performance Checks

### JavaScript

- [ ] Initial bundle ≤200KB gzipped
- [ ] Code splitting applied (route-based at minimum)
- [ ] Heavy dependencies lazy-loaded
- [ ] No unused imports in production build
- [ ] Tree-shaking enabled

### Images

- [ ] Images served in modern formats (WebP, AVIF)
- [ ] Images have explicit width and height (prevents CLS)
- [ ] Images below the fold are lazy-loaded
- [ ] Hero/LCP images have `priority` or `fetchpriority="high"`
- [ ] Responsive images with `srcset` for different viewports
- [ ] Large images compressed (target <100KB for most, <500KB for hero)

### Fonts

- [ ] System fonts used OR web fonts subset to used characters
- [ ] Font display strategy set (`font-display: swap` or `optional`)
- [ ] Fonts preloaded for above-the-fold content
- [ ] No more than 2 custom font families

### Database / API

- [ ] No N+1 queries in critical paths
- [ ] Indexes on all filtered and sorted columns
- [ ] List endpoints are paginated (never return unbounded results)
- [ ] Repeated queries cached appropriately
- [ ] API responses ≤200ms p95 for reads
- [ ] Expensive operations run async (background jobs)

### React / UI

- [ ] No unnecessary re-renders in hot paths
- [ ] `useCallback` used for stable function references passed as props
- [ ] `useMemo` used for expensive computations (only when measured as needed)
- [ ] Lists virtualized when >100 items (react-window or similar)
- [ ] Large component trees code-split

### Caching

- [ ] Static assets: long cache TTL with content hashing
- [ ] API responses: appropriate Cache-Control headers
- [ ] CDN configured for static assets

## Measurement Commands

```bash
# Lighthouse CI
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse.json

# Bundle analysis (Next.js)
ANALYZE=true npm run build

# Bundle analysis (Vite)
npx vite-bundle-visualizer

# Check specific Web Vitals in browser console
import { onLCP, onINP, onCLS } from 'web-vitals';
onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

## Common Performance Anti-Patterns

| Anti-Pattern | Impact | Fix |
|---|---|---|
| N+1 database queries | High latency | Use JOIN or include |
| Unbounded list queries | Memory, timeout | Add pagination |
| Missing DB indexes | Slow queries | Add index on filtered columns |
| Synchronous file I/O | Blocks event loop | Use async fs methods |
| Large initial JS bundle | Slow startup | Code split, lazy load |
| Images without dimensions | Layout shift (CLS) | Add width/height |
| Blocking third-party scripts | Delayed interactivity | defer/async, load lazily |
| `useEffect` for derived state | Extra render | Use `useMemo` |
| `React.memo` on everything | Premature optimization | Profile first, then apply |

## Performance Budget (CI Enforcement)

```javascript
// next.config.ts — fail build if budget exceeded
experimental: {
  bundleSizeMonitoring: {
    maxInitialSize: 200_000,   // 200KB gzipped for initial JS
  }
}
```

## Profiling Workflow

1. **Establish baseline** — run Lighthouse, record metrics
2. **Profile** — Chrome DevTools Performance tab, identify long tasks
3. **Identify bottleneck** — where is the time actually going?
4. **Fix** — address the specific bottleneck
5. **Re-measure** — confirm improvement, check for regressions
6. **Set up monitoring** — Real User Monitoring if available

**Never optimize without measuring first.**
