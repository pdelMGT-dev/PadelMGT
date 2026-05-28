---
name: source-driven-development
description: Verifies every framework-specific code decision against official documentation before implementing. Use when writing framework-specific code, following current best practices, or implementing features where the recommended approach matters (forms, routing, data fetching, state management, auth).
---

# Source-Driven Development

## Overview

Every framework-specific code decision must be backed by official documentation. Don't implement from memory — verify, cite, and let the user see your sources. Training data goes stale, APIs get deprecated, best practices evolve.

## When to Use

- Writing framework-specific code (React, Next.js, Prisma, etc.)
- Building boilerplate or patterns that will be copied across the project
- Implementing features where the framework's recommended approach matters
- Reviewing code that uses framework-specific patterns
- Any time you're about to write framework-specific code from memory

**When NOT to use:**

- Renaming variables, fixing typos, moving files
- Pure logic that works the same across all versions (loops, conditionals, data structures)
- The user explicitly wants speed over verification

## The Process

```
DETECT ──→ FETCH ──→ IMPLEMENT ──→ CITE
  │          │           │            │
  ▼          ▼           ▼            ▼
 What       Get the    Follow the   Show your
 stack?     relevant   documented   sources
            docs       patterns
```

### Step 1: Detect Stack and Versions

Read the project's dependency file to identify exact versions:

```
package.json    → Node/React/Vue/Angular/Next.js
requirements.txt / pyproject.toml → Python/Django/Flask
```

State what you found:

```
STACK DETECTED:
- React 19.1.0 (from package.json)
- Next.js 15.2.0
→ Fetching official docs for the relevant patterns.
```

If versions are missing or ambiguous, **ask the user**. Don't guess.

### Step 2: Fetch Official Documentation

Fetch the specific documentation page for the feature you're implementing. Not the homepage — the relevant page.

**Source hierarchy (in order of authority):**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Official documentation | react.dev, nextjs.org/docs |
| 2 | Official blog / changelog | react.dev/blog, nextjs.org/blog |
| 3 | Web standards | MDN, web.dev |
| 4 | Browser/runtime compatibility | caniuse.com |

**Not authoritative — never cite as primary sources:**

- Stack Overflow answers
- Blog posts or tutorials
- AI-generated documentation or summaries
- Your own training data

### Step 3: Implement Following Documented Patterns

- Use the API signatures from the docs, not from memory
- If the docs show a new way to do something, use the new way
- If the docs deprecate a pattern, don't use the deprecated version
- If the docs don't cover something, flag it as unverified

**When docs conflict with existing project code:**

```
CONFLICT DETECTED:
The existing codebase uses useState for form loading state,
but React 19 docs recommend useActionState for this pattern.
(Source: react.dev/reference/react/useActionState)

Options:
A) Use the modern pattern (useActionState) — consistent with current docs
B) Match existing code (useState) — consistent with codebase
→ Which approach do you prefer?
```

### Step 4: Cite Your Sources

Every framework-specific pattern gets a citation:

```typescript
// React 19 form handling with useActionState
// Source: https://react.dev/reference/react/useActionState#usage
const [state, formAction, isPending] = useActionState(submitOrder, initialState);
```

If you cannot find documentation for a pattern:

```
UNVERIFIED: I could not find official documentation for this pattern.
This is based on training data and may be outdated.
Verify before using in production.
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'm confident about this API" | Confidence is not evidence. Training data contains outdated patterns. Verify. |
| "Fetching docs wastes tokens" | Hallucinating an API wastes more. One fetch prevents hours of debugging. |
| "This is a simple task, no need to check" | Simple tasks with wrong patterns become templates copied across the codebase. |

## Red Flags

- Writing framework-specific code without checking the docs for that version
- Using "I believe" or "I think" about an API instead of citing the source
- Citing Stack Overflow or blog posts instead of official documentation
- Using deprecated APIs because they appear in training data
- Not reading `package.json` before implementing
- Delivering code without source citations for framework-specific decisions

## Verification

After implementing with source-driven development:

- [ ] Framework and library versions identified from the dependency file
- [ ] Official documentation fetched for framework-specific patterns
- [ ] All sources are official documentation, not blog posts or training data
- [ ] Code follows the patterns shown in the current version's documentation
- [ ] Non-trivial decisions include source citations with full URLs
- [ ] No deprecated APIs used
- [ ] Conflicts between docs and existing code surfaced to the user
- [ ] Anything that could not be verified is explicitly flagged as unverified
