# Ship

Pre-launch parallel review orchestrator. Spawns three specialist reviewers simultaneously, synthesizes their findings into a go/no-go decision with rollback procedures.

## Process

### Phase A — Concurrent Specialist Review

Run three reviewers in parallel (not sequentially):

1. **code-reviewer** (`agents/code-reviewer.md`): Correctness, readability, architecture, security, and performance across staged changes
2. **security-auditor** (`agents/security-auditor.md`): Vulnerability assessment — OWASP Top 10, secrets, authentication/authorization, dependency CVEs
3. **test-engineer** (`agents/test-engineer.md`): Test coverage gaps — happy paths, edge cases, error handling, concurrency

### Phase B — Synthesis

The main context aggregates all three reports and evaluates:

- Code quality (blocker: Critical or Important unresolved issues)
- Security findings (blocker: Critical or High severity)
- Test coverage (blocker: missing critical path tests)
- Performance metrics within budget
- Accessibility compliance
- Infrastructure readiness
- Documentation completeness

### Phase C — Decision and Rollback

Output:

```markdown
## Ship Decision: GO | NO-GO

### Blockers (must fix before shipping)
- [Critical finding from any reviewer]

### Recommended Fixes (should fix)
- [Important finding from any reviewer]

### Acknowledged Risks
- [Accepted trade-offs with rationale]

### Rollback Plan
- Trigger: [conditions that trigger rollback]
- Steps: [specific rollback procedure]
- Time to rollback: [estimate]
```

## Rules

- Reviewers run independently — no shared state, no ordering
- Subagents cannot delegate to other subagents
- Critical findings default to NO-GO unless explicitly accepted by the user
- Rollback plan is mandatory before any GO decision

## Skip Fan-Out When

All of these are true: ≤2 files touched, <50 line diff, and no auth/payment/data-access/config changes.
