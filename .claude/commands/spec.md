# Spec

Write a structured specification before writing any code.

## Process

Apply the `spec-driven-development` skill:

1. Surface assumptions before writing anything:
   ```
   ASSUMPTIONS I'M MAKING:
   1. [technology choice assumption]
   2. [platform/environment assumption]
   → Correct me now or I'll proceed with these.
   ```

2. Gather requirements by asking:
   - What problem are we solving, and who will use it?
   - What are the core features required?
   - What acceptance criteria define success?
   - What's your preferred tech stack?
   - What's explicitly out of scope?

3. Generate `docs/spec-[feature-name].md` covering:
   - **Objective** — clear purpose and success metrics
   - **Acceptance criteria** — testable conditions that define "done"
   - **Commands** — how to run, test, and build
   - **Project structure** — directory organization
   - **Code style** — conventions from the existing codebase
   - **Testing strategy** — what gets tested and how
   - **Boundaries** — Always do / Ask first / Never do

4. Review the spec together before proceeding to implementation.

## Gate

Do not write code until the spec is approved. The spec is the contract.
