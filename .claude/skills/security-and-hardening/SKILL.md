---
name: security-and-hardening
description: Hardens code against vulnerabilities. Use when handling user input, authentication, data storage, or external integrations. Use when building any feature that accepts untrusted data, manages user sessions, or interacts with third-party services.
---

# Security and Hardening

## Overview

Security-first development practices for web applications. Treat every external input as hostile, every secret as sacred, and every authorization check as mandatory. Security isn't a phase — it's a constraint on every line of code that touches user data, authentication, or external systems.

## When to Use

- Building anything that accepts user input
- Implementing authentication or authorization
- Storing or transmitting sensitive data
- Integrating with external APIs or services
- Adding file uploads, webhooks, or callbacks
- Handling payment or PII data

## The Three-Tier Boundary System

### Always Do (No Exceptions)

- **Validate all external input** at the system boundary
- **Parameterize all database queries** — never concatenate user input into SQL
- **Encode output** to prevent XSS
- **Use HTTPS** for all external communication
- **Hash passwords** with bcrypt/scrypt/argon2 (never store plaintext)
- **Set security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Use httpOnly, secure, sameSite cookies** for sessions
- **Run `npm audit`** before every release

### Ask First (Requires Human Approval)

- Adding new authentication flows or changing auth logic
- Storing new categories of sensitive data (PII, payment info)
- Adding new external service integrations
- Changing CORS configuration
- Adding file upload handlers
- Modifying rate limiting or throttling

### Never Do

- **Never commit secrets** to version control
- **Never log sensitive data** (passwords, tokens, full credit card numbers)
- **Never trust client-side validation** as a security boundary
- **Never use `eval()` or `innerHTML`** with user-provided data
- **Never store sessions in localStorage** (auth tokens)
- **Never expose stack traces** to users

## OWASP Top 10 Prevention

### Injection (SQL, NoSQL, OS Command)

```typescript
// BAD: SQL injection
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: ORM
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Broken Authentication

```typescript
import { hash, compare } from 'bcrypt';
const SALT_ROUNDS = 12;
const hashedPassword = await hash(plaintext, SALT_ROUNDS);

app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400000 },
}));
```

### Cross-Site Scripting (XSS)

```typescript
// BAD: innerHTML with user input
element.innerHTML = userInput;

// GOOD: React auto-escapes by default
return <div>{userInput}</div>;

// If HTML rendering is required:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### Broken Access Control

```typescript
app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const task = await taskService.findById(req.params.id);
  if (task.ownerId !== req.user.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } });
  }
  const updated = await taskService.update(req.params.id, req.body);
  return res.json(updated);
});
```

## Input Validation at Boundaries

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.error.flatten() },
    });
  }
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // 10 attempts per 15 minutes on auth endpoints
}));
```

## Secrets Management

```
.env.example  → Committed (placeholder values only)
.env          → NOT committed (real secrets)
.env.local    → NOT committed (local overrides)

.gitignore must include: .env, .env.local, *.pem, *.key
```

## npm audit Decision Tree

```
npm audit reports a vulnerability
├── Severity: critical or high
│   ├── Reachable in production? → Fix immediately
│   └── Dev-only? → Fix soon, not a blocker
├── Severity: moderate
│   └── Fix in the next release cycle
└── Severity: low
    └── Fix during regular dependency updates
```

## Security Review Checklist

```markdown
### Authentication
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (salt rounds ≥ 12)
- [ ] Session cookies: httpOnly, secure, sameSite
- [ ] Login has rate limiting
- [ ] Password reset tokens expire

### Authorization
- [ ] Every protected endpoint checks user permissions
- [ ] Users can only access their own resources
- [ ] Admin actions require admin role verification

### Input
- [ ] All user input validated at the boundary
- [ ] SQL queries are parameterized
- [ ] HTML output is encoded/escaped

### Data
- [ ] No secrets in code or version control
- [ ] Sensitive fields excluded from API responses
- [ ] PII encrypted at rest (if applicable)

### Infrastructure
- [ ] Security headers configured (CSP, HSTS)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited (`npm audit`)
- [ ] Error messages don't expose internals
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is an internal tool, security doesn't matter" | Internal tools get compromised. Attackers target the weakest link. |
| "We'll add security later" | Security retrofitting is 10x harder than building it in. Add it now. |
| "The framework handles security" | Frameworks provide tools, not guarantees. You still need to use them correctly. |

## Red Flags

- User input passed directly to database queries, shell commands, or HTML rendering
- Secrets in source code or commit history
- API endpoints without auth checks
- Missing CORS configuration or wildcard (`*`) origins
- No rate limiting on auth endpoints
- Stack traces exposed to users
- Dependencies with known critical vulnerabilities

## Verification

After implementing security-relevant code:

- [ ] `npm audit` shows no critical or high vulnerabilities
- [ ] No secrets in source code or git history
- [ ] All user input validated at system boundaries
- [ ] Auth and authorization checked on every protected endpoint
- [ ] Security headers present (check with DevTools)
- [ ] Error responses don't expose internal details
- [ ] Rate limiting active on auth endpoints
