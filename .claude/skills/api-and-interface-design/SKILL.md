---
name: api-and-interface-design
description: Designs stable, maintainable APIs and interfaces. Use when creating new API endpoints, designing module interfaces, or defining data contracts. Applies to REST, GraphQL, and internal module boundaries.
---

# API and Interface Design

## Overview

APIs are permanent. Once consumers depend on a behavior — including undocumented quirks, error message text, and response ordering — it becomes a de facto contract. Design with stability and clarity from the start.

> **Hyrum's Law:** With enough users, every observable behavior becomes depended on.

## When to Use

- Creating new API endpoints
- Designing module interfaces or type definitions
- Defining data contracts between frontend and backend
- Adding new fields to existing APIs

## Core Practices

### Contract-First Design

Define the interface before implementation. Both sides build against the contract:

```typescript
// Define the contract first
interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO 8601
}

interface CreateTaskResponse {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  status: 'pending';
  createdAt: string; // ISO 8601
}
```

### Prefer Addition over Modification

- Add optional fields rather than changing existing ones
- Deprecate before removing — never remove without a migration period
- Changing a field breaks consumers; adding a field doesn't

### Separate Input and Output Types

```typescript
// Input: user-provided data
interface CreateTaskInput {
  title: string;
  priority?: 'low' | 'medium' | 'high';
}

// Output: server-generated fields included
interface Task extends CreateTaskInput {
  id: string;
  status: 'pending' | 'complete';
  createdAt: string;
  updatedAt: string;
}
```

### Validate External Input, Trust Internal Code

- Validate all input at system boundaries (API routes, form handlers)
- Always treat third-party API responses as untrusted
- Don't validate data flowing between well-typed internal modules

## REST Conventions

### URL Patterns

```
GET    /api/tasks           — List tasks (paginated)
POST   /api/tasks           — Create task
GET    /api/tasks/:id       — Get single task
PATCH  /api/tasks/:id       — Partial update
DELETE /api/tasks/:id       — Delete task

# Use nouns, not verbs. Plural for collections.
# BAD:  POST /api/createTask
# GOOD: POST /api/tasks
```

### HTTP Status Codes

| Status | When |
|--------|------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | Success, no body (DELETE) |
| 400 | Malformed request |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 422 | Validation error (well-formed but invalid) |
| 500 | Internal server error |

### Consistent Error Format

```typescript
// All errors follow the same shape
interface ErrorResponse {
  error: {
    code: string;      // Machine-readable: 'VALIDATION_ERROR', 'NOT_FOUND'
    message: string;   // Human-readable
    details?: unknown; // Validation details, field errors, etc.
  };
}
```

### Pagination on List Endpoints

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}
```

Never return unbounded lists.

### Query Parameter Naming

Use camelCase for query parameters:

```
GET /api/tasks?pageSize=20&sortBy=createdAt&sortOrder=desc
```

## Module Interface Design

### Keep Interfaces Minimal

Export only what consumers need. Internal implementation details stay internal.

### One Version Rule

Avoid multiple versions of the same dependency. Diamond dependency problems compound quickly.

## Red Flags

- List endpoints with no pagination
- Inconsistent error formats across endpoints
- Verbs in REST URLs (`/createTask`, `/getUsers`)
- Unvalidated third-party API responses used directly in logic
- Breaking field changes without a migration period
- Exposing database IDs directly (use UUIDs or slugs)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll add pagination when we need it" | By then you have consumers depending on unbounded behavior. Add it from day one. |
| "This is internal, no need for a contract" | Internal APIs become external faster than expected. Contract-first costs nothing upfront. |
| "We'll fix the error format later" | Inconsistent error formats get hardcoded into consumers. Fix it now. |

## Verification

After designing an API:

- [ ] Contract defined before implementation
- [ ] All list endpoints have pagination
- [ ] Consistent error format across all endpoints
- [ ] HTTP status codes are semantically correct
- [ ] Third-party responses validated at the boundary
- [ ] No verbs in REST URLs
- [ ] Input and output types are separate
- [ ] Breaking changes avoided (addition, not modification)
