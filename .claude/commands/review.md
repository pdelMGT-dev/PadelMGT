# Review

Review staged or recent changes across five axes: correctness, readability, architecture, security, and performance.

## Process

Apply the `code-review-and-quality` skill:

1. Read the spec or task description to understand intent
2. Review tests first — they reveal intent and coverage
3. Walk through the implementation across all five axes
4. Categorize every finding by severity

## Finding Severity

| Prefix | Meaning |
|--------|---------|
| **Critical:** | Must fix before merge — security vulnerability, data loss, broken functionality |
| **Important:** | Should fix — missing test, wrong abstraction, poor error handling |
| **Nit:** | Optional — minor style or naming preferences |
| **FYI** | Informational — no action needed |

## Output Format

```markdown
## Review Summary

**Verdict:** APPROVE | REQUEST CHANGES

**Overview:** [1-2 sentences]

### Critical Issues
- [File:line] [Description and recommended fix]

### Important Issues
- [File:line] [Description and recommended fix]

### Suggestions
- [File:line] [Description]

### What's Done Well
- [At least one positive observation]
```

## Security Focus

For security-sensitive changes, also apply `security-and-hardening` patterns from `references/security-checklist.md`.
