---
name: planning-and-task-breakdown
description: Decomposes work into small, verifiable tasks with explicit acceptance criteria. Use when you have a spec and need an implementable task list, when a task feels too large to begin, or when work needs to be parallelized.
---

# Planning and Task Breakdown

## Overview

Decompose work into small, verifiable tasks with explicit acceptance criteria. Good task breakdown prevents tangled implementations and enables reliable completion.

## When to Use

- You have a spec requiring implementable units
- A task feels too large or ambiguous to begin
- Work needs parallelization across multiple agents
- You must communicate scope to stakeholders
- Implementation sequence isn't immediately clear

**When NOT to use:** Single-file changes with obvious scope.

## The Planning Process

### Step 1: Enter Plan Mode (Read-Only)

Read specs and codebase in read-only mode. Map patterns, dependencies, and risks. **Do not write code in this step.**

### Step 2: Identify Dependencies

Create a dependency graph showing what builds on what. Implementation follows foundations-first order.

```
[Database schema] ──→ [API endpoints] ──→ [UI components]
        └──────────────────────────→ [Tests]
```

### Step 3: Slice Vertically

Build complete feature paths end-to-end rather than all database then all API then all UI. Each slice delivers working functionality.

**Vertical (good):**
```
Task 1: User can create a task (DB + API + UI + tests)
Task 2: User can list tasks (DB + API + UI + tests)
Task 3: User can delete a task (DB + API + UI + tests)
```

**Horizontal (avoid):**
```
Task 1: All database schemas
Task 2: All API endpoints
Task 3: All UI components
```

### Step 4: Structure Each Task

Every task must include:

```markdown
## Task: [Name]

**Description:** What this task accomplishes

**Acceptance criteria:**
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]

**Verification steps:**
1. Run `npm test -- --grep "[test name]"`
2. Verify [specific behavior] in [specific context]

**Dependencies:** [Task X, Task Y must be complete first]

**Affected files:**
- `src/[file1.ts]` — [what changes]
- `src/[file2.ts]` — [what changes]

**Estimated scope:** XS / S / M / L
```

### Step 5: Order and Checkpoint

- Order so dependencies are satisfied
- System stays working throughout
- Insert explicit checkpoints after every 2-3 tasks

## Task Size Guidelines

| Size | Files | Lines | When |
|------|-------|-------|------|
| XS | 1 | <30 | Rename, config change |
| S | 1-2 | 30-100 | Single component, single endpoint |
| M | 2-4 | 100-300 | Feature slice with tests |
| L | 4-8 | 300-500 | Full feature with integration |
| **XL** | **8+** | **500+** | **Must break down further** |

**If a task is XL-sized: decompose it.** An XL task is a signal that scope is too large, not that the task is valid.

## Deliverables

Produce two artifacts:
- **`tasks/plan.md`** — Full breakdown with dependencies and rationale
- **`tasks/todo.md`** — Actionable checklist ready for assignment

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure out the tasks as I go" | Discovering tasks during implementation means discovering scope during implementation — the most expensive time. |
| "The dependencies are obvious" | Write them down. Obvious dependencies get violated when tasks are parallelized or handed off. |
| "This task is small enough as-is" | If a task has multiple acceptance criteria that test different behaviors, it's two tasks. |

## Red Flags

- Beginning implementation without written task lists
- Tasks lacking specific acceptance criteria
- All tasks being XL-sized
- Missing checkpoints between phases
- Ignoring dependency order

## Verification

Before starting implementation:

- [ ] Every task has acceptance criteria (testable, not vague)
- [ ] Every task has verification steps
- [ ] Every task has identified dependencies
- [ ] No XL-sized tasks (all broken down further)
- [ ] Human has approved the task list
- [ ] Checkpoints are scheduled between major phases
