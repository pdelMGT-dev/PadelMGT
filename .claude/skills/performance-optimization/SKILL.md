---
name: performance-optimization
description: Measures and improves application performance. Use when performance budgets are specified, users report sluggishness, Core Web Vitals fall below thresholds, or a recent change degraded performance. Measure before optimizing — performance work without measurement is guessing.
---

# Performance Optimization

## Overview

Measure before optimizing. Performance work without measurement is guessing. The wrong optimization adds complexity without delivering results.

**Golden rule:** Find the actual bottleneck through profiling. Don't optimize based on assumptions.

## When to Use

- Specifications include load time budgets or response time SLAs
- Users report sluggish behavior
- Core Web Vitals fall below acceptable thresholds
- A recent change is suspected to have degraded performance
- Building systems handling large datasets or high traffic

**When NOT to use:**

- No performance problem has been measured
- You're "pretty sure" something will be slow (measure it first)

## Core Web Vitals Targets

| Metric | Good | Needs Improvement |
|--------|------|------------------|
| **LCP** (Largest Contentful Paint) | ≤2.5s | 2.5s–4.0s |
| **INP** (Interaction to Next Paint) | ≤200ms | 200ms–500ms |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | 0.1–0.25 |

## The Five-Step Workflow

### Step 1: Measure

Establish a baseline with real data:

```bash
# Lighthouse CI
npx lighthouse http://localhost:3000 --output=json

# Chrome DevTools Performance tab
# → Record → Run interaction → Stop → Analyze
```

Use both:
- **Synthetic testing** (Lighthouse) — controlled, reproducible
- **Real user monitoring** (if available) — actual user experience

### Step 2: Identify the Bottleneck

Profile to find the actual problem. Common locations:

```
Frontend:
├── JavaScript bundle too large → Code splitting, lazy loading
├── Unoptimized images → WebP, srcset, lazy loading
├── Layout shifts → Reserve space for dynamic content
├── Too many re-renders → Stabilize references, memo
└── Blocking resources → Defer non-critical JS/CSS

Backend:
├── N+1 queries → Use joins or includes
├── Missing indexes → Add indexes on filtered/sorted columns
├── No caching → Cache repeated queries
└── Unbounded queries → Add pagination
```

### Step 3: Fix the Specific Issue

#### N+1 Queries

```typescript
// BAD: N+1 — one query per task
const tasks = await db.tasks.findAll();
for (const task of tasks) {
  task.assignee = await db.users.findById(task.assigneeId); // N queries
}

// GOOD: One query with join
const tasks = await db.tasks.findAll({
  include: [{ model: db.users, as: 'assignee' }]
});
```

#### Image Optimization

```tsx
// Use next/image for automatic optimization
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-the-fold images
/>
```

#### React Re-renders

```tsx
// Stabilize references that cause re-renders
const handleSubmit = useCallback(() => {
  // ...
}, [dependency]); // Only recreated when dependency changes

// Memoize expensive computations
const sortedTasks = useMemo(
  () => [...tasks].sort((a, b) => a.createdAt - b.createdAt),
  [tasks]
);
```

#### Code Splitting

```tsx
import dynamic from 'next/dynamic';

// Heavy component loaded only when needed
const DataGrid = dynamic(() => import('./DataGrid'), {
  loading: () => <Skeleton />,
});
```

### Step 4: Verify Improvement

Re-measure after fixing:

```bash
npx lighthouse http://localhost:3000 --output=json
```

Compare before/after metrics. If the metric didn't improve, the fix didn't address the actual bottleneck — go back to Step 2.

### Step 5: Guard Against Regression

Add a performance test or CI check:

```javascript
// Fail CI if bundle exceeds budget
// next.config.ts
experimental: {
  bundleSizeMonitoring: {
    maxInitialSize: 200_000, // 200KB gzipped
  }
}
```

## Performance Budget

```
JavaScript (initial): ≤200KB gzipped
CSS (initial):        ≤50KB gzipped
LCP:                  ≤2.5s
INP:                  ≤200ms
CLS:                  ≤0.1
API response (p95):   ≤200ms for reads, ≤500ms for writes
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This will obviously be slow" | Measure it. "Obvious" performance problems are often in the wrong place. |
| "Premature optimization is okay here" | Premature optimization adds complexity that must be maintained forever. Measure first. |
| "Caching will fix everything" | Caching hides problems. Fix the underlying query or computation first, then cache if needed. |

## Red Flags

- Optimizing without a measured baseline
- Adding caching without understanding what's being cached
- Using `React.memo` everywhere "just in case"
- Lazy-loading content that's above the fold
- Missing database indexes on filtered/sorted columns
- Unbounded list queries (no pagination)

## Verification

After performance optimization:

- [ ] Baseline measured before any changes
- [ ] Actual bottleneck identified through profiling (not assumption)
- [ ] Metric improved after fix (measured, not assumed)
- [ ] No regression in other metrics
- [ ] Performance budget enforced in CI
