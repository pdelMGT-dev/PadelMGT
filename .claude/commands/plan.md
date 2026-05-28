# Plan

Break work into small, verifiable tasks with acceptance criteria and dependency ordering.

## Process

Apply the `planning-and-task-breakdown` skill:

1. **Enter read-only mode** — analyze the spec and codebase without writing code
2. **Map dependencies** — chart component relationships, identify what must come first
3. **Slice vertically** — structure tasks as complete feature paths (DB + API + UI + tests), not horizontal layers
4. **Write acceptance criteria** — measurable completion conditions and verification methods for each task
5. **Insert checkpoints** — explicit review gates between major phases

## Deliverables

- **`tasks/plan.md`** — detailed breakdown with dependencies and rationale
- **`tasks/todo.md`** — actionable task list ready for implementation

## Constraints

- No task should be XL-sized (>8 files, >500 lines) — break it down further
- Every task needs acceptance criteria and verification steps
- Human reviews the task list before implementation begins
- Implementation sequence must respect dependency order
