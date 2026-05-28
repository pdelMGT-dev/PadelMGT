# Test

Write tests that prove the code works and guard against regressions.

## Process

Apply the `test-driven-development` skill:

### For New Features

1. Write tests that describe the expected behavior (they should FAIL)
2. Implement code to pass those tests
3. Refactor while maintaining passing tests

### For Bug Fixes (Prove-It Pattern)

1. Write a failing test that demonstrates the bug exists
2. Confirm the test fails
3. Apply the fix
4. Verify the test now passes
5. Run the complete test suite to catch regressions

## Supporting Skills

- `test-driven-development` — for implementation
- `browser-testing-with-devtools` — when addressing browser-specific issues (requires Chrome DevTools MCP)

## Quality Standards

- Test behavior, not implementation
- Name tests as specifications: `it('creates a task with default pending status', ...)`
- Arrange-Act-Assert structure
- Mock only at system boundaries (DB, HTTP, file system)
- 80% unit / 15% integration / 5% E2E distribution

## What Every Test Suite Should Cover

- Happy path (normal input, expected output)
- Empty/null inputs
- Boundary values (min, max)
- Error conditions (invalid input, missing data)
- Authentication/authorization (for API tests)
