# Orchestration Patterns Reference

Guidance for composing skills and personas into larger workflows. Use when designing multi-step agent workflows or when a slash command spawns multiple reviewers.

## Core Rule

**The user (or a slash command) is the orchestrator. Personas do not invoke other personas.**

A persona calling another persona creates nested orchestration that:
- Makes failures hard to diagnose
- Duplicates context unnecessarily
- Creates infinite regress risk
- Violates the single-responsibility principle of each persona

## Endorsed Patterns

### Pattern 1: Direct Invocation

User invokes a skill or persona directly for a focused task:

```
User → code-reviewer
User → security-and-hardening skill
User → debugging-and-error-recovery skill
```

**When to use:** Single-concern tasks. The user knows which skill applies.

### Pattern 2: Single-Persona Slash Command

A slash command runs one skill or persona with focused scope:

```
/review → code-reviewer (single perspective)
/test   → test-driven-development skill
/spec   → spec-driven-development skill
/build  → incremental-implementation skill
```

**When to use:** Common workflows that always invoke the same skill.

### Pattern 3: Parallel Fan-Out

A slash command spawns multiple personas simultaneously, synthesizes results in the main context:

```
/ship → [code-reviewer + security-auditor + test-engineer] (parallel)
      → Main context synthesizes → GO/NO-GO decision
```

**Rules:**
- All subagents run simultaneously, not sequentially
- Subagents receive only what they need (artifact + contract)
- Subagents report findings — they do not make the final decision
- Main context makes the synthesis and decision
- Subagents do not spawn further subagents

**When to use:** Pre-ship review where multiple independent perspectives are valuable.

### Pattern 4: Sequential User-Driven Workflow

The user drives a multi-step workflow by invoking skills in sequence:

```
User: /spec → reviews spec
User: /plan → reviews task list
User: /build → implements task 1
User: /review → reviews implementation
User: /ship → final pre-ship review
```

**When to use:** Feature development where the user wants checkpoints between phases.

### Pattern 5: Research Isolation

A subagent is spawned with a focused research task to protect the main context:

```
Main context → Subagent: "Read these 5 files and summarize the auth patterns"
             ← Subagent: Returns summary
Main context continues with the summary
```

**When to use:** The main context is getting long; the research task is well-defined and can be summarized back.

## Anti-Patterns

### Anti-Pattern A: Sequential Persona Chain

```
code-reviewer → invokes → security-auditor → invokes → test-engineer
```

**Problem:** Creates a chain where each persona waits on the previous, losing the parallelism benefit and creating orchestration complexity inside a subagent.

**Fix:** Use parallel fan-out from the slash command instead.

### Anti-Pattern B: Persona Invokes Another Persona

```
Inside code-reviewer: "I'll now run the security-auditor on this code..."
```

**Problem:** Personas are specialists, not orchestrators. A persona invoking another creates nested delegation that breaks context isolation.

**Fix:** The code-reviewer surfaces security concerns as findings in its report. The slash command (/ship) handles orchestration.

### Anti-Pattern C: Unbounded Escalation

```
Main context → Subagent 1 → Subagent 2 → Subagent 3 → ...
```

**Problem:** Nesting subagents amplifies cost, latency, and failure surface. Deep nesting makes failures impossible to debug.

**Fix:** Keep orchestration to a single level. The main context orchestrates; subagents execute.

### Anti-Pattern D: Vague Subagent Prompts

```
Subagent prompt: "Review this code and tell me if it's good."
```

**Problem:** Vague prompts produce vague results. The subagent doesn't know what "good" means in context.

**Fix:** Give subagents the artifact, the contract, and specific criteria:
```
"Review this API endpoint for OWASP Top 10 vulnerabilities.
ARTIFACT: [paste endpoint code]
CONTRACT: [what it must do]
Report findings as Critical/High/Medium/Low."
```

## Decision Flow for New Workflows

When designing a new workflow:

1. **Single concern?** → Direct invocation or single-persona slash command
2. **Multiple independent perspectives needed?** → Parallel fan-out from slash command
3. **Sequential phases with human checkpoints?** → User-driven sequential workflow
4. **Research that would bloat main context?** → Research isolation subagent

If none of these fit, the workflow may be too complex. Decompose it.
