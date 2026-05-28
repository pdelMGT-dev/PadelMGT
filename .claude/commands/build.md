# Build

Pick one pending task from `tasks/todo.md` and implement it incrementally.

## Process

1. Read the task's acceptance criteria and verification steps
2. Gather relevant code context (affected files from the task description)
3. Follow `incremental-implementation` skill:
   - Write a failing test (RED phase)
   - Implement minimal code to pass (GREEN phase)
   - Run full test suite for regressions
   - Verify the build compiles
   - Commit with a descriptive message
4. Mark the task complete in `tasks/todo.md`
5. Advance to the next task

## Skills Applied

- `test-driven-development` — write tests first
- `incremental-implementation` — build in thin slices

## If You Hit an Obstacle

Apply `debugging-and-error-recovery`. Do not push past failing tests.
