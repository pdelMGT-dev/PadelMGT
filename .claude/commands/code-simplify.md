# Code Simplify

Simplify code for clarity and maintainability — reduce complexity without changing behavior.

## Process

1. Review project conventions via CLAUDE.md
2. Identify target code (recent changes or specified scope)
3. Examine purpose, callers, edge cases, and test coverage
4. Apply `code-simplification` skill:
   - Locate concrete opportunities (nesting, naming, duplication, dead code)
   - Apply changes one at a time with testing after each
   - Rollback any change that causes a test failure
5. Run `code-review-and-quality` on the final result

## Patterns to Target

- Deep nesting → guard clauses or extracted helpers
- Long functions → split by responsibility
- Nested ternaries → if/else or switch statements
- Unclear naming → descriptive alternatives
- Duplicated logic → shared functions
- Dead code → delete it

## Safety Measures

- Tests must pass after each individual change
- If tests fail, revert that change and reconsider
- Do not mix simplification with behavior changes
- Do not simplify code you don't understand (Chesterton's Fence)
