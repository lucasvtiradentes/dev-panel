#!/bin/bash

SELECTED_ENV="$1"

echo "Selected environment: $SELECTED_ENV"

case "$SELECTED_ENV" in
  "local")
    echo "Setting up local environment..."
    ;;
  "local-staging")
    echo "Setting up local-staging environment..."
    ;;
  "local-prod")
    echo "Setting up local-prod environment..."
    ;;
  "staging")
    echo "Setting up staging environment..."
    ;;
  "prod")
    echo "Setting up prod environment..."
    ;;
  *)
    echo "Unknown environment: $SELECTED_ENV"
    exit 1
    ;;
esac

echo "Done!"
