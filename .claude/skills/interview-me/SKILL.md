---
name: interview-me
description: Extracts what the user actually wants instead of what they think they should want. Achieves this through one-question-at-a-time interview until ~95% confidence about the underlying intent. Use when an ask is underspecified ("build me X" without "for whom" or "why now"), when the user explicitly invokes ("interview me", "grill me", "are we sure?", "stress-test my thinking"), or when you catch yourself silently filling in ambiguous requirements before any plan, spec, or code exists.
---

# Interview Me

## Overview

What people ask for and what they actually want are different things. They ask for "a dashboard" because that's what one asks for, not because a dashboard solves their problem. They say "make it faster" without a number to hit.

The cheapest moment to find this gap is before any plan, spec, or code exists. Once you've started building, switching costs are real, and the user will rationalize the wrong thing into a "good enough" thing. The misfit gets locked in.

This skill closes the gap before it costs anything.

## When to Use

Apply this skill when:

- The ask is missing at least one of: **who** the user is, **why** they want it, what **success** looks like, what the binding **constraint** is
- The request is conventional rather than specific ("build me X", "make it faster")
- You're tempted to start with assumptions you haven't surfaced
- The user explicitly invokes: "interview me", "grill me", "before we start, are we sure?", "stress-test my thinking"

**When NOT to use:**

- The ask is unambiguous and self-contained ("rename this variable", "fix this typo")
- The user has explicitly asked for speed over verification
- Pure information requests ("how does X work?")
- You already have ≥95% confidence

## The Process

### Step 1: Hypothesize, with a confidence number

Before asking anything, write down your current best read of what the user wants in **one sentence**, plus an honest confidence number (0–100%):

```
HYPOTHESIS: You want a way to answer "how are we doing?" in standup, and "dashboard" was the convention that came to mind.
CONFIDENCE: ~30% — missing: who it's for, what "metrics" means in context, and what success looks like
```

### Step 2: Ask one question at a time, each with a guess attached

Format:

```
Q: <one focused question>
GUESS: <your hypothesis for the answer, with the reasoning that produced it>
```

Wait for the user to react before asking the next question.

**Why one at a time:** The third question often depends on the answer to the first. Batches encourage skim-reading and surface answers.

**Why attach a guess:** The user reacts faster to a wrong guess than they generate an answer from scratch. It surfaces your assumptions, which is what the interview is meant to expose.

### Step 3: Listen for "want vs. should want"

Watch for answers that pattern-match best-practice talk without specifics:
- "I want it to be scalable"
- "The standard approach"
- "Good engineering practice says…"

When you hear these, ask: *"If you didn't have to justify this to anyone, what would you actually want?"*

### Step 4: Restate intent in the user's own words

When your confidence is high, write back what you now think the user wants:

```
Here's what I now think you want:

- Outcome:      <one line>
- User:         <one line — who benefits>
- Why now:      <one line — what changed>
- Success:      <one line — how we know it worked>
- Constraint:   <one line — the binding limit>
- Out of scope: <one line — what we're explicitly not doing>

Yes / no / refine?
```

Including "Out of scope" is non-negotiable. Half of misalignment is silent disagreement about what is *not* being built.

### Step 5: Confirm — explicit yes, not "whatever you think"

The gate is an explicit "yes." The following are **not** yes:

- "Whatever you think is best." → Re-ask with two concrete options framed as a choice.
- "Sounds good." → Ask: "Anything you'd refine?"
- Silence followed by "okay let's start." → Ask whether you've missed something.

### The 95% Confidence Stop

You're done when you can answer yes to: *Can I predict the user's reaction to the next three questions I would ask?*

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The ask is clear enough" | If you can't write the user's desired outcome in one sentence right now, the ask isn't clear. |
| "Asking too many questions wastes their time" | Time wasted by 4–6 targeted questions is small. Time wasted by building the wrong thing is enormous. |
| "I'll figure it out as I build" | Switching costs after code exists are 10x what they are now. |
| "They said 'whatever you think,' so I should just decide" | "Whatever you think" is delegation, not decision. Re-ask with two concrete options. |

## Red Flags

- Three or more questions in a single message
- A question without your hypothesis attached
- Accepting "whatever you think is best" as a terminal answer
- Producing a spec, plan, or task list before the user has confirmed your restate
- Skipping the "Out of scope" line in the restate

## Verification

After applying interview-me:

- [ ] An explicit hypothesis with a confidence number was stated in the first turn
- [ ] Questions were asked one at a time, each with the agent's guess attached
- [ ] A concrete restate (Outcome / User / Why now / Success / Constraint / Out of scope) was written back to the user
- [ ] The user confirmed the restate with an explicit yes
- [ ] At the stop point, the agent could predict reactions to the next three questions it would ask
