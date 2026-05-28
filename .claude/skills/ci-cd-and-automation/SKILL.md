---
name: ci-cd-and-automation
description: Automates quality gates to prevent unverified code from reaching production. Use when setting up CI pipelines, adding new quality checks, or diagnosing CI failures. Shift left — catch problems in linting before they reach production.
---

# CI/CD and Automation

## Overview

Automate quality gates to prevent unverified code from reaching production. The fundamental principle is "shift left" — catching problems early in the pipeline where they're cheaper to fix.

A bug caught in linting costs minutes; the same bug caught in production costs hours.

## When to Use

- Setting up a new CI pipeline
- Adding new quality checks to an existing pipeline
- Diagnosing CI failures
- Adding deployment automation
- Setting up preview deployments for PRs

## The Quality Gate Pipeline

Every gate must pass in order — none can be skipped:

```
1. Lint (fast, syntax/style)
2. Type check (compilation)
3. Unit tests (fast, isolated)
4. Build (compilation artifacts)
5. Integration tests (cross-boundary)
6. E2E tests (critical paths, optional)
7. Security audit (npm audit)
8. Bundle size check (performance budget)
```

**Rules:** No gate can be skipped. Rules aren't disabled — code is fixed instead.

## GitHub Actions Implementation

### Standard Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Unit tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm audit --audit-level=high
```

### Integration Tests with Database

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### E2E Tests with Playwright

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: E2E tests
  run: npx playwright test

- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

## Deployment Safety

### Feature Flags

Decouple deployment from release:

```typescript
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';
```

This lets you ship code disabled and roll back without redeploying.

### Staged Rollouts

```
Staging → Canary (5%) → 25% → 50% → 100%
```

Advance only when error rate, latency, and user metrics are within thresholds.

### Rollback Plan

Every deployment needs a rollback plan:

```markdown
## Rollback Plan
### Trigger: Error rate > 2x baseline or P95 latency > 50% above baseline
### Steps:
1. Disable feature flag (< 1 minute)
   OR redeploy previous version (< 5 minutes)
2. Verify: health check, error monitoring
3. Communicate: notify team
```

## CI Feedback Loop with Agents

When CI fails:

```
CI failure → Agent receives failure output
          → Agent fixes locally before pushing
          → Fix: lint failure → npm run lint --fix
          → Fix: type error → correct at source
          → Fix: test failure → debug systematically
          → Push fix → CI re-runs
```

## Pipeline Optimization

If CI exceeds 10 minutes, apply in order of impact:

1. **Dependency caching** — cache `node_modules`
2. **Parallel jobs** — run lint, test, build in parallel
3. **Path-based filters** — skip jobs when unrelated files change
4. **Test optimization** — split test suite across workers
5. **Larger runners** — more CPU for compilation

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "CI is too slow" | Optimize it (caching, parallelism) — don't skip gates. |
| "This failure is unrelated to my change" | If CI is broken, fix it. A broken CI catches nothing. |
| "We'll add CI later" | Later is when a bug reaches production and causes an incident. |

## Red Flags

- No CI at all
- Ignoring CI failures ("it'll pass eventually")
- Disabling tests or lint rules to pass the pipeline
- Production deploys without staging validation
- No rollback mechanism
- Hardcoded secrets in CI config files

## Verification

After CI setup or changes:

- [ ] All gates run on every PR and push to main
- [ ] No gate can be bypassed
- [ ] Failures produce actionable output (not just "something failed")
- [ ] Secrets are in environment variables, not CI config
- [ ] Deploy only happens after all gates pass
- [ ] Rollback mechanism exists and has been tested
