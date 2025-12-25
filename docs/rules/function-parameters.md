# Function Parameters Rule

## Rule

Functions with more than 2 parameters MUST use an options object instead.

## Rationale

- Improves readability at call site
- Makes parameters self-documenting
- Easier to add/remove parameters without breaking changes
- Prevents parameter order mistakes

## Examples

### ❌ Bad

```typescript
function buildMilestoneChildren(
  milestone: MilestoneNode,
  showOnlyTodo: boolean,
  activeFilters: TaskFilter,
  grouped: boolean,
): BranchTaskItem[] {
  // ...
}

// Hard to understand what each parameter does
buildMilestoneChildren(milestone, true, filters, false);
```

### ✅ Good

```typescript
type BuildMilestoneOptions = {
  milestone: MilestoneNode;
  showOnlyTodo: boolean;
  activeFilters: TaskFilter;
  grouped: boolean;
};

function buildMilestoneChildren(options: BuildMilestoneOptions): BranchTaskItem[] {
  const { milestone, showOnlyTodo, activeFilters, grouped } = options;
  // ...
}

// Self-documenting
buildMilestoneChildren({
  milestone,
  showOnlyTodo: true,
  activeFilters: filters,
  grouped: false,
});
```

## Exceptions

- Widely recognized patterns (e.g., `Array.slice(start, end)`)
- Callbacks following established conventions (e.g., `(error, data) => {}`)
