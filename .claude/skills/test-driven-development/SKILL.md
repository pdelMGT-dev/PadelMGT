---
name: test-driven-development
description: Writes a failing test before writing the code that makes it pass. Use when implementing logic, fixing bugs, or modifying any behavior. Tests are proof of correctness — intuition is not.
---

# Test-Driven Development

## Overview

Write a failing test before writing the code that makes it pass. Tests serve as proof of correctness — intuition isn't sufficient. Codebases with robust tests are powerful assets; those without represent significant risk.

## When to Use

- Implementing new business logic
- Fixing bugs (use the prove-it pattern)
- Modifying existing behavior
- Any time correctness matters

**When NOT to use:** Pure configuration, file moves, or renames where there is no behavior to test.

## The TDD Cycle

### RED → GREEN → REFACTOR

**RED:** Create a test that fails, proving the feature doesn't exist yet.

```typescript
it('creates a task with default pending status', () => {
  const task = createTask({ title: 'Buy groceries' });
  expect(task.status).toBe('pending');
});
// → Test fails: createTask is not implemented
```

**GREEN:** Write the minimum code to make the test pass.

```typescript
function createTask(input: { title: string }) {
  return { ...input, status: 'pending', id: generateId() };
}
// → Test passes
```

**REFACTOR:** Improve the implementation while keeping tests passing.

## Bug Fix Strategy: The Prove-It Pattern

Rather than attempting an immediate fix:

1. Write a test that **demonstrates the bug exists** (test fails)
2. Confirm the test fails
3. Implement the fix
4. Verify the test passes
5. Run the full suite to catch regressions

This guarantees fixes are validated and prevents future breakage.

## Test Quality Standards

### State over Interactions

Assert outcomes, not method calls:

```typescript
// BAD: Testing implementation
expect(mockDb.save).toHaveBeenCalledWith(task);

// GOOD: Testing behavior
const saved = await db.findById(task.id);
expect(saved.title).toBe(task.title);
```

### DAMP over DRY

Tests should be self-contained narratives, not abstracted:

```typescript
// Each test should read like a specification
it('rejects tasks with empty titles', async () => {
  // Arrange: everything needed is visible here
  const input = { title: '' };

  // Act
  const result = await createTask(input);

  // Assert
  expect(result.error.code).toBe('VALIDATION_ERROR');
});
```

### Real Implementations over Mocks

Prefer actual code over mocks when feasible. Mock only at system boundaries (database, HTTP, file system).

### Test Pyramid

```
E2E (5%)     — Critical user flows only, minutes to run
Integration (15%) — Crosses a module/service boundary, seconds to run
Unit (80%)    — Pure logic, milliseconds to run
```

## Test Naming

```typescript
// Pattern: [unit] [expected behavior] [condition]
describe('TaskService.createTask', () => {
  it('creates a task with default pending status', () => {});
  it('throws ValidationError when title is empty', () => {});
  it('trims whitespace from title', () => {});
  it('generates a unique ID for each task', () => {});
});
```

Every test name should read like a specification.

## Coverage Targets

Focus on critical paths, not line coverage percentages:

- All business logic functions: 100% branch coverage
- All API endpoints: happy path + 422 + 401 + 404
- All UI components: user interactions + error states

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is simple, it doesn't need tests" | Simple code becomes complex code. Tests protect the simple code from becoming complex incorrectly. |
| "I'll add tests after I get it working" | Tests added after implementation test the implementation, not the requirements. |
| "Tests slow me down" | Tests catch bugs before they reach production. Debugging production is 10x slower. |
| "I fixed the bug, no need for a test" | Without a test, the bug will come back. |

## Red Flags

- Fixing a bug without a regression test
- Tests that test method names instead of behavior
- Tests that can't fail (no assertions)
- Snapshot tests used for everything
- The entire test suite running in >5 minutes
- Mocking internal functions instead of boundaries

## Verification

After applying TDD:

- [ ] Every new behavior has a test that was written first (or simultaneously for bug fixes)
- [ ] Each test can fail independently
- [ ] Tests assert behavior, not implementation
- [ ] Bug fixes have regression tests
- [ ] Full test suite passes
- [ ] No tests were skipped or commented out
