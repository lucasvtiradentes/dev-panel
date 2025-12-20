#!/bin/bash
echo "📊 Project Stats"
echo ""
echo "=== Files ==="
echo "TypeScript files: $(find src -name '*.ts' | wc -l)"
echo "Total src files: $(find src -type f | wc -l)"
echo ""
echo "=== Lines of Code ==="
find src -name '*.ts' -exec cat {} \; | wc -l | xargs echo "Total lines:"
echo ""
echo "=== Package Info ==="
jq -r '"Name: \(.name)\nVersion: \(.version)"' package.json
