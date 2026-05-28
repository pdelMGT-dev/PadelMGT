---
name: frontend-ui-engineering
description: Builds production-quality user interfaces. Use when building or modifying any UI component, page, or user-facing feature. Avoids common AI-generated design pitfalls and enforces accessibility, responsive design, and design system adherence.
---

# Frontend UI Engineering

## Overview

Build UI that looks like a senior engineer built it, not an AI. Avoid generic patterns, enforce accessibility, follow the project's actual design system, and handle all states (loading, error, empty).

## When to Use

- Building or modifying any UI component
- Designing page layouts or navigation
- Implementing forms, modals, or interactive elements
- Any user-facing feature

## Component Structure

### Colocation

Keep related files together:

```
src/components/TaskCard/
  TaskCard.tsx          ← Component
  TaskCard.test.tsx     ← Tests
  TaskCard.types.ts     ← Types
  useTaskCard.ts        ← Custom hook (if needed)
  index.ts              ← Public export
```

### Composition over Configuration

```typescript
// GOOD: Composable
<Button variant="primary" size="md" onClick={handleSubmit}>
  Create Task
</Button>

// AVOID: Config-driven with many props
<Button
  text="Create Task"
  color="#6366f1"
  textSize={14}
  paddingX={16}
  paddingY={8}
  rounded={true}
  shadow={true}
/>
```

## State Management

Match complexity to solution:

| Scope | Solution |
|-------|----------|
| Component-local | `useState` |
| App-wide read-heavy (theme, auth) | Context |
| Shareable UI state | URL params |
| Remote data | Server state library (React Query, SWR) |
| Complex local interactions | `useReducer` |

## Design System Adherence

### Anti-AI Patterns to Avoid

```
✗ Purple/indigo everything
✗ Excessive gradients
✗ Maximum border-radius on everything
✗ Oversized padding (48px gaps, giant cards)
✗ Shadow on every element
✗ Generic sans-serif "clean" typography
```

### Use the Project's Actual Design System

- Use the project's actual color palette and tokens
- Use consistent spacing scales, not arbitrary pixel values
- Use semantic color tokens (not `text-blue-500` but `text-primary`)
- Check `tailwind.config.ts` or CSS variables before adding new values

## Accessibility Requirements (WCAG 2.1 AA)

### Keyboard Navigation

- All interactive elements focusable via Tab
- Focus order follows visual/logical order
- Focus is visible (never `outline: none` without alternative)
- Custom widgets have keyboard support (Enter to activate, Escape to close)
- No keyboard traps

### Screen Reader Support

```tsx
// Icon-only button needs aria-label
<button aria-label="Delete task">
  <TrashIcon />
</button>

// Form inputs need associated labels
<label htmlFor="title">Task title</label>
<input id="title" type="text" required />

// Dynamic content changes announced
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

### Color Contrast

- Text ≥ 4.5:1 against background
- UI components ≥ 3:1 against background
- Color is never the only way to convey information

## Handle All States

Every data-driven component must handle:

```tsx
// Loading state
if (isLoading) return <Skeleton />;

// Error state
if (error) return <ErrorMessage error={error} onRetry={refetch} />;

// Empty state
if (tasks.length === 0) return <EmptyState message="No tasks yet. Create one to get started." />;

// Data state
return <TaskList tasks={tasks} />;
```

## Responsive Design

Build mobile-first. Standard breakpoints:

```
320px  — Small mobile
768px  — Tablet (md:)
1024px — Desktop (lg:)
1440px — Wide desktop (xl:)
```

## Component Quality Checklist

Before marking a component complete:

- [ ] No console errors or warnings
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces content correctly
- [ ] All states handled: loading, error, empty, data
- [ ] Responsive at 320px, 768px, 1024px, 1440px
- [ ] Design system tokens used (no arbitrary values)
- [ ] No AI aesthetic patterns (excessive gradients, purple everything)
- [ ] Component ≤200 lines (split if larger)

## Red Flags

- Components exceeding 200 lines
- Inline styles or arbitrary pixel values
- Missing loading, error, or empty states
- `div` or `span` used as buttons
- Missing `alt` text on images
- Focus outline removed without alternative
- Color alone used to indicate state

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Accessibility can wait" | Accessibility is a legal requirement and engineering quality standard, not optional polish. |
| "It looks fine on desktop" | 50%+ of traffic is mobile. Test on 320px. |
| "The design system is too restrictive" | The design system exists to prevent exactly the kind of inconsistency that AI tools naturally produce. |

## Verification

After building a UI component:

- [ ] No console errors
- [ ] Tab through all interactive elements — focus visible and logical
- [ ] Screen reader announces content and state changes
- [ ] All states (loading, error, empty, data) render correctly
- [ ] Responsive at mobile, tablet, and desktop
- [ ] Design system compliance (no arbitrary values)
