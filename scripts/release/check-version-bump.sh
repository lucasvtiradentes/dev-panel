#!/bin/bash

set -e

CURRENT_VERSION=$(node -p "require('./package.json').version")

git show HEAD~1:package.json > /tmp/prev_package.json 2>/dev/null || echo '{"version":"0.0.0"}' > /tmp/prev_package.json
PREVIOUS_VERSION=$(node -p "require('/tmp/prev_package.json').version")

echo "Previous version: $PREVIOUS_VERSION"
echo "Current version: $CURRENT_VERSION"

if [ "$CURRENT_VERSION" != "$PREVIOUS_VERSION" ]; then
  echo "Version bumped from $PREVIOUS_VERSION to $CURRENT_VERSION"
  echo "should_release=true" >> $GITHUB_OUTPUT
else
  echo "No version change detected"
  echo "should_release=false" >> $GITHUB_OUTPUT
fi
