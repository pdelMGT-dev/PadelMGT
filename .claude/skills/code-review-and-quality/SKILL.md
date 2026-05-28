---
name: code-review-and-quality
description: Multi-dimensional code review with quality gates. Use before merging any PR or change, after completing a feature, or when another agent produced code you need to evaluate. Reviews cover five axes: correctness, readability, architecture, security, and performance.
---

# Code Review and Quality

## Overview

Multi-dimensional code review with quality gates. Every change gets reviewed before merge — no exceptions. Review covers five axes: correctness, readability, architecture, security, and performance.

**The approval standard:** Approve a change when it definitely improves overall code health, even if it isn't perfect. Don't block a change because it isn't exactly how you would have written it.

## When to Use

- Before merging any PR or change
- After completing a feature implementation
- When another agent or model produced code you need to evaluate
- After any bug fix (review both the fix and the regression test)

## The Five-Axis Review

### 1. Correctness

- Does the code match the spec or task requirements?
- Are edge cases handled (null, empty, boundary values)?
- Are error paths handled (not just the happy path)?
- Do tests actually test the right things?
- Any off-by-one errors, race conditions, or state inconsistencies?

### 2. Readability & Simplicity

- Can another engineer understand this without the author explaining it?
- Are names descriptive and consistent with project conventions?
- Is control flow straightforward?
- Could this be done in fewer lines?
- Are abstractions earning their complexity?
- Any dead code artifacts (`_unused` variables, `// removed` comments)?

### 3. Architecture

- Does the change follow existing patterns or introduce a new one?
- Does it maintain clean module boundaries?
- Is there code duplication that should be shared?
- Is the abstraction level appropriate?

### 4. Security

- Is user input validated and sanitized?
- Are secrets kept out of code, logs, and version control?
- Is authentication/authorization checked where needed?
- Are SQL queries parameterized?
- Are outputs encoded to prevent XSS?
- Is data from external sources treated as untrusted?

### 5. Performance

- Any N+1 query patterns?
- Any unbounded loops or unconstrained data fetching?
- Any synchronous operations that should be async?
- Any unnecessary re-renders?
- Any missing pagination on list endpoints?

## Change Sizing

```
~100 lines changed   → Good. Reviewable in one sitting.
~300 lines changed   → Acceptable for a single logical change.
~1000 lines changed  → Too large. Split it.
```

## Review Process

### Step 1: Understand the Context

- What is this change trying to accomplish?
- What spec or task does it implement?

### Step 2: Review the Tests First

- Do tests exist for the change?
- Do they test behavior (not implementation details)?
- Are edge cases covered?

### Step 3: Review the Implementation

Walk through the code with the five axes in mind.

### Step 4: Categorize Findings

| Prefix | Meaning | Author Action |
|--------|---------|---------------|
| *(no prefix)* | Required change | Must address before merge |
| **Critical:** | Blocks merge | Security vulnerability, data loss, broken functionality |
| **Nit:** | Minor, optional | Author may ignore |
| **Optional:** / **Consider:** | Suggestion | Worth considering but not required |
| **FYI** | Informational | No action needed |

### Step 5: Verify the Verification

- What tests were run?
- Did the build pass?
- Was the change tested manually?
- Are there screenshots for UI changes?

## Dead Code Hygiene

After any refactoring, check for orphaned code:

```
DEAD CODE IDENTIFIED:
- formatLegacyDate() in src/utils/date.ts — replaced by formatDate()
- OldTaskCard component — replaced by TaskCard
→ Safe to remove these?
```

Don't leave dead code lying around. Don't silently delete things you're not sure about — ask first.

## Honesty in Review

- **Don't rubber-stamp.** "LGTM" without evidence of review helps no one.
- **Don't soften real issues.** "This might be a minor concern" when it's a production bug is dishonest.
- **Quantify problems when possible.** "This N+1 query will add ~50ms per item" beats "this could be slow."
- **Push back on approaches with clear problems.**

## The Review Checklist

```markdown
## Review: [PR/Change title]

### Correctness
- [ ] Change matches spec/task requirements
- [ ] Edge cases handled
- [ ] Tests cover the change adequately

### Readability
- [ ] Names are clear and consistent
- [ ] No unnecessary complexity

### Architecture
- [ ] Follows existing patterns
- [ ] No unnecessary coupling

### Security
- [ ] No secrets in code
- [ ] Input validated at boundaries
- [ ] Auth checks in place
- [ ] External data treated as untrusted

### Performance
- [ ] No N+1 patterns
- [ ] Pagination on list endpoints

### Verification
- [ ] Tests pass
- [ ] Build succeeds

### Verdict
- [ ] Approve
- [ ] Request changes
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works, that's good enough" | Working code that's unreadable, insecure, or architecturally wrong creates debt that compounds. |
| "AI-generated code is probably fine" | AI code needs more scrutiny, not less. It's confident and plausible, even when wrong. |
| "The tests pass, so it's good" | Tests are necessary but not sufficient. They don't catch architecture, security, or readability issues. |

## Red Flags

- PRs merged without any review
- Review that only checks if tests pass
- "LGTM" without evidence of actual review
- Security-sensitive changes without security review
- Large PRs "too big to review properly"
- No regression tests with bug fix PRs

## Verification

After review is complete:

- [ ] All Critical issues are resolved
- [ ] All Important issues are resolved or deferred with justification
- [ ] Tests pass
- [ ] Build succeeds
