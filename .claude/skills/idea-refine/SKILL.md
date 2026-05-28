---
name: idea-refine
description: Refines vague ideas into sharp, actionable concepts through structured divergent and convergent thinking. Use when an idea exists but scope, users, or tradeoffs are unclear. Triggers on "help me refine this idea", "ideate on [concept]", or "stress-test my plan".
---

# Idea Refine

## Overview

What people have is often a direction, not an idea. "Build a scheduling feature" is a direction. An idea answers who it's for, what success looks like, and what you're NOT doing. This skill closes the gap between direction and actionable concept.

## When to Use

- You have a rough concept and need to explore variations before committing
- The user asks for ideation, brainstorming, or stress-testing
- The scope, users, or constraints are underspecified
- Multiple approaches feel equally valid and you need a structured way to choose

**When NOT to use:** The ask is already concrete with clear success criteria → go to `spec-driven-development` instead.

## The Process

### Phase 1: Understand and Expand

1. Restate the idea as a "How Might We" problem statement
2. Ask sharpening questions — one at a time:
   - Who specifically is this for?
   - What does success look like in concrete terms?
   - What's the binding constraint (time, cost, complexity)?
3. Generate **5-8 variations** using lenses:
   - **Inversion** — What if we solved the opposite problem?
   - **Constraint removal** — What if cost/time/complexity weren't limits?
   - **Simplification** — What's the 1/10th version?
   - **Analogy** — How does another domain solve this?
   - **User extreme** — What does the power user need? The first-time user?

Generate quality variations (5-8), not quantity (20+). Each should be meaningfully different, not variations on the same theme.

### Phase 2: Evaluate and Converge

1. Cluster resonant ideas into 2-3 directions
2. Stress-test each direction against:
   - User value: does it solve a real problem for a real user?
   - Feasibility: can we build this?
   - Differentiation: is this obviously the right approach?
3. Surface hidden assumptions explicitly:
   ```
   ASSUMPTIONS IN THIS DIRECTION:
   1. [assumption]
   2. [assumption]
   → Which of these are you confident about?
   ```

### Phase 3: Sharpen and Ship

Produce a one-pager in `docs/ideas/[idea-name].md` containing:
- **Problem statement** — the "How Might We" framing
- **Recommended direction** — which variation and why
- **Key assumptions** — what must be true for this to work, and how to validate
- **MVP scope** — the smallest version that proves the concept
- **Not Doing** — explicit list of what's excluded

The "Not Doing" list is arguably the most valuable output. Half of misalignment is silent disagreement about scope.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I already know what to build" | If you can't write the target user and success metric in one line each, you don't know yet. |
| "More options is better" | 20 shallow options is worse than 5 considered ones. Diverge with intent, converge with criteria. |
| "We'll figure out scope later" | Scope clarity is what ideation produces. "Later" means during implementation, when changing course is expensive. |
| "The Not Doing list is obvious" | It never is. Write it explicitly. |

## Red Flags

- Generating options without first identifying the target user
- Accepting vague success criteria ("it should be good")
- Not surfacing assumptions before recommending a direction
- Skipping the "Not Doing" list
- Recommending a direction without stress-testing it

## Verification

After applying idea-refine:

- [ ] A "How Might We" problem statement was written
- [ ] Target user and success criteria are explicit
- [ ] 5-8 meaningfully different variations were generated
- [ ] Assumptions were surfaced and flagged for validation
- [ ] A recommended direction was chosen with reasoning
- [ ] A "Not Doing" list is included
- [ ] Output saved to `docs/ideas/[idea-name].md` (after user confirmation)
