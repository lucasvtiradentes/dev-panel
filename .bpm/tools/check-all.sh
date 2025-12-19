#!/bin/bash
echo "🔍 Running all quality checks..."
echo ""
echo "=== TypeScript ==="
pnpm run typecheck
echo ""
echo "=== Lint ==="
pnpm run lint
echo ""
echo "✅ All checks complete!"
