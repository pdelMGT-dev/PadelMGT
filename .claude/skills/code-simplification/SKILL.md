---
name: code-simplification
description: Reduces complexity without changing behavior. Use when code is unnecessarily complex, when a review flagged complexity, or after completing an implementation to ask "could this be simpler?" Separate from feature work — never mix refactoring with behavior changes.
---

# Code Simplification

## Overview

Preserve behavior exactly while reducing unnecessary complexity. Simpler code is easier to read, test, maintain, and modify. But simplification that changes behavior is a bug, and simplification that makes code harder to understand is not simplification.

## When to Use

- Code is unnecessarily complex (deep nesting, long functions, nested ternaries)
- A code review flagged complexity
- After completing an implementation: "could this be simpler?"
- Names are generic and obscure intent
- Duplicated logic exists across multiple places

**When NOT to use:**

- Complexity that exists for a reason you don't understand (Chesterton's Fence)
- Mixing simplification with behavior changes — that's two PRs
- Code that you haven't understood yet — understand first, then simplify

## Chesterton's Fence

Before simplifying, ask: **why does this code exist?**

If you see a fence across a road and don't understand why it's there, don't tear it down. Understand it first. Complex code is often complex for a reason — an edge case, a performance constraint, a historical accident. Know the reason before changing it.

## The Process

### Step 1: Understand the Code

Read the code, its tests, and its callers. Don't start simplifying until you understand:
- What does this code do?
- Why does it do it this way?
- What edge cases does it handle?
- What tests cover it?

### Step 2: Identify Opportunities

| Signal | Pattern | Simplification |
|--------|---------|----------------|
| Deep nesting | `if (a) { if (b) { if (c) { ... } } }` | Guard clauses, extract helpers |
| Long functions | 50+ line functions | Split by responsibility |
| Nested ternaries | `a ? b ? c : d : e` | `if/else` or `switch` |
| Repeated conditionals | Same `if` in 3 places | Extract to function or constant |
| Generic names | `data`, `temp`, `result`, `val` | Descriptive names |
| Duplicated logic | Same code in 2+ places | Extract shared function |
| Dead code | Unreachable, unused, commented-out | Delete |

### Step 3: Apply Incrementally

Change one thing at a time, test after each change:

```
Change one pattern
  → Run tests
  → Tests pass? Continue
  → Tests fail? Revert and reconsider
```

If a simplification causes a test to fail, that's information — either the simplification changed behavior (revert it) or the test was testing implementation details (evaluate carefully before changing the test).

### Step 4: Verify

The result must be:
1. Behaviorally identical (all tests pass)
2. Easier to understand for a fresh reader
3. Not just shorter — shorter is a means, not an end

## Key Rules

### Separate Refactoring from Feature Work

A PR that refactors and adds a feature is two PRs. Submit them separately. This makes each easier to review, revert, and understand in history.

### Scope to Recent Changes

Simplify what you're working on, not the entire codebase. Unsolicited renovation of adjacent code is noise.

### Large Refactors Need Automation

If the simplification touches >500 lines, it warrants automation (codemods, sed, language-specific refactoring tools) rather than manual editing.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is simpler" | If it fails a test, it's not simpler — it's different. |
| "Fewer lines is better" | Comprehension is the goal, not line count. One cryptic line beats two clear ones only if both readers agree on "cryptic." |
| "I'll simplify this while adding the feature" | That's two changes. Submit them separately. |
| "This complexity is obvious" | Read it again with fresh eyes or show it to someone else. |

## Red Flags

- Simplifying code you don't fully understand yet
- Tests failing after "simplification"
- Mixing simplification with new behavior in the same commit
- Removing code you don't understand (Chesterton's Fence)
- Scope expanding to the entire file or module

## Verification

After simplification:

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Each simplification was applied incrementally (one change at a time)
- [ ] No behavior was changed — only structure
- [ ] The result is easier to understand than the original
- [ ] Simplification is a separate commit/PR from any feature work
