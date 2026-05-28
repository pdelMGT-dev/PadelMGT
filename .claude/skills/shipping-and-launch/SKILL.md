---
name: shipping-and-launch
description: Ships with confidence. Use when deploying a feature to production for the first time, releasing a significant change, migrating data or infrastructure, or any deployment that carries risk (all of them). Every launch should be reversible, observable, and incremental.
---

# Shipping and Launch

## Overview

Ship with confidence. The goal is not just to deploy — it's to deploy safely, with monitoring in place, a rollback plan ready, and a clear understanding of what success looks like. Every launch should be reversible, observable, and incremental.

## Pre-Launch Checklist

### Code Quality

- [ ] All tests pass (unit, integration, e2e)
- [ ] Build succeeds with no warnings
- [ ] Lint and type checking pass
- [ ] Code reviewed and approved
- [ ] No `console.log` debugging statements in production code
- [ ] Error handling covers expected failure modes

### Security

- [ ] No secrets in code or version control
- [ ] `npm audit` shows no critical or high vulnerabilities
- [ ] Input validation on all user-facing endpoints
- [ ] Authentication and authorization checks in place
- [ ] Security headers configured (CSP, HSTS)
- [ ] Rate limiting on authentication endpoints
- [ ] CORS configured to specific origins (not wildcard)

### Performance

- [ ] Core Web Vitals within "Good" thresholds
- [ ] No N+1 queries in critical paths
- [ ] Images optimized
- [ ] Bundle size within budget
- [ ] Database queries have appropriate indexes
- [ ] Caching configured for static assets and repeated queries

### Accessibility

- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader can convey page content and structure
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- [ ] Focus management correct for modals and dynamic content
- [ ] Error messages are descriptive and associated with form fields

### Infrastructure

- [ ] Environment variables set in production
- [ ] Database migrations applied (or ready to apply)
- [ ] DNS and SSL configured
- [ ] Logging and error reporting configured
- [ ] Health check endpoint exists and responds

## Feature Flag Strategy

Ship behind feature flags to decouple deployment from release:

```typescript
const flags = await getFeatureFlags(userId);

if (flags.taskSharing) {
  return <TaskSharingPanel task={task} />;
}
return null;
```

**Feature flag lifecycle:**

```
1. DEPLOY with flag OFF     → Code is in production but inactive
2. ENABLE for team/beta     → Internal testing in production environment
3. GRADUAL ROLLOUT          → 5% → 25% → 50% → 100% of users
4. MONITOR at each stage    → Watch error rates, performance, user feedback
5. CLEAN UP                 → Remove flag and dead code path after full rollout
```

## Staged Rollout

### The Rollout Sequence

```
1. DEPLOY to staging
   └── Full test suite + manual smoke test

2. DEPLOY to production (feature flag OFF)
   └── Verify deployment, check error monitoring

3. ENABLE for team (flag ON for internal users)
   └── Team uses feature in production, 24-hour monitoring

4. CANARY rollout (5% of users)
   └── Monitor 24-48 hours, compare with baseline

5. GRADUAL increase (25% → 50% → 100%)
   └── Same monitoring at each step

6. FULL rollout
   └── Monitor for 1 week, then clean up feature flag
```

### Rollout Decision Thresholds

| Metric | Advance | Hold | Roll Back |
|--------|---------|------|-----------|
| Error rate | Within 10% of baseline | 10-100% above | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above | >50% above |
| Client JS errors | No new error types | New errors <0.1% of sessions | New errors >0.1% |

### When to Roll Back Immediately

- Error rate increases by more than 2x baseline
- P95 latency increases by more than 50%
- Data integrity issues detected
- Security vulnerability discovered

## Rollback Plan

Every deployment needs a rollback plan before it happens:

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms

### Rollback Steps
1. Disable feature flag (< 1 minute)
   OR deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team

### Database Considerations
- Migration [X] has a rollback: `npx prisma migrate rollback`

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
```

## Post-Launch Verification

In the first hour after launch:

```
1. Check health endpoint returns 200
2. Check error monitoring (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works in staging, it'll work in production" | Production has different data, traffic, and edge cases. Monitor after deploy. |
| "We don't need feature flags for this" | Every feature benefits from a kill switch. Even "simple" changes can break things. |
| "Monitoring is overhead" | Not having monitoring means you discover problems from user complaints instead of dashboards. |
| "Rolling back is admitting failure" | Rolling back is responsible engineering. Shipping a broken feature is the failure. |

## Red Flags

- Deploying without a rollback plan
- No monitoring or error reporting in production
- Big-bang releases (everything at once, no staging)
- Feature flags with no expiration or owner
- No one monitoring the deploy for the first hour
- "It's Friday afternoon, let's ship it"

## Verification

Before deploying:

- [ ] Pre-launch checklist completed (all sections green)
- [ ] Feature flag configured (if applicable)
- [ ] Rollback plan documented
- [ ] Monitoring dashboards set up
- [ ] Team notified of deployment

After deploying:

- [ ] Health check returns 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
