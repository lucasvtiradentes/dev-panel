#!/bin/bash

set -e

CURRENT_VERSION=$(node -p "require('./package.json').version")
TAG="v$CURRENT_VERSION"

git show HEAD~1:package.json > /tmp/prev_package.json 2>/dev/null || echo '{"version":"0.0.0"}' > /tmp/prev_package.json
PREVIOUS_VERSION=$(node -p "require('/tmp/prev_package.json').version")

echo "📋 Previous version: $PREVIOUS_VERSION"
echo "📋 Current version: $CURRENT_VERSION"
echo "📋 Tag: $TAG"
echo "📋 Commit: ${GITHUB_SHA:-$(git rev-parse HEAD)}"

if [ "$CURRENT_VERSION" = "$PREVIOUS_VERSION" ]; then
  echo "📋 Result: version not bumped → should_release=false"
  echo "should_release=false" >> $GITHUB_OUTPUT
  exit 0
fi

echo "📋 Version bumped from $PREVIOUS_VERSION to $CURRENT_VERSION"
echo "📋 Remote tags matching $TAG:"
git ls-remote --tags origin | grep "$TAG" || echo "  (none)"

if git ls-remote --tags origin | grep -q "refs/tags/$TAG$"; then
  echo "📋 Result: tag already exists → should_release=false"
  echo "should_release=false" >> $GITHUB_OUTPUT
else
  echo "📋 Result: version bumped + tag missing → should_release=true"
  echo "should_release=true" >> $GITHUB_OUTPUT
fi
