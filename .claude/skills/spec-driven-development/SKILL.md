---
name: spec-driven-development
description: Writes a structured specification before writing any code. Use when starting a new project, feature, or significant change. Use when requirements are ambiguous or multi-file changes are involved. Skip for simple single-line fixes.
---

# Spec-Driven Development

## Overview

Write a structured specification before writing any code. The spec is the shared source of truth between you and the human engineer — it defines what we're building, why, and how we'll know it's done.

Without a spec, you build against assumptions. The spec makes those assumptions explicit and reviewable before any code is written.

## When to Use

- New projects or significant new features
- Ambiguous requirements where multiple interpretations exist
- Multi-file changes or architectural decisions
- Any work likely to take more than 30 minutes
- When `interview-me` has produced a confirmed intent document

**When NOT to use:**

- Simple bug fixes with obvious scope
- Single-line or single-file changes that are unambiguous

## Four-Phase Workflow (Gated)

### Phase 1: Specify

Surface assumptions immediately — before writing spec content:

```
ASSUMPTIONS I'M MAKING:
1. [technology choice assumption]
2. [platform/environment assumption]
3. [scope assumption]
→ Correct me now or I'll proceed with these.
```

Write a complete spec covering:

1. **Objective** — What we're building and why
2. **Acceptance criteria** — Testable conditions that define "done"
3. **Executable commands** — How to run, test, and build
4. **Directory structure** — Where things go
5. **Code style** — Conventions and examples from the existing codebase
6. **Testing approach** — What gets tested and how
7. **Operational boundaries** — Always do / Ask first / Never do

Save spec to `docs/spec-[feature-name].md`.

**Gate:** Human reviews and approves the spec before proceeding.

### Phase 2: Plan

Create the technical implementation strategy:
- Identify affected files and modules
- Map dependencies between components
- Identify risks and unknowns
- Propose the implementation sequence

**Gate:** Human reviews the plan before proceeding.

### Phase 3: Tasks

Break the plan into discrete, reviewable units:
- Each task has a description, acceptance criteria, and verification steps
- Tasks are ordered by dependency
- Each task is XS–Large (never XL — if XL, break it down further)

**Gate:** Human reviews the task list before proceeding.

### Phase 4: Implement

Execute with test-driven development practices:
- Follow `incremental-implementation` for each task
- Follow `test-driven-development` for writing tests
- Update the spec when decisions change

## The Living Document

The spec stays active throughout development. Update it when:
- Decisions change
- Scope expands or contracts
- New constraints surface
- Architecture evolves

A stale spec is worse than no spec — keep it current.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The requirements are obvious" | Write them down. Obvious requirements have a way of being interpreted differently by different people. |
| "A spec slows us down" | The slowdown is up front, where it's cheap. Without a spec, slowdown happens during implementation, where it's expensive. |
| "We'll spec it as we go" | "As we go" means after assumptions have solidified into code that's expensive to change. |

## Red Flags

- Starting implementation without a written spec
- Spec that doesn't include acceptance criteria
- Spec that omits the "Never do" boundary
- Updating the spec after the fact to match implementation decisions
- Skipping human review gates

## Verification

After spec-driven development:

- [ ] Spec written before any code
- [ ] Assumptions surfaced and acknowledged by the user
- [ ] Acceptance criteria are testable (not vague)
- [ ] Human approved spec, plan, and task list before implementation started
- [ ] Spec updated when decisions changed during implementation
