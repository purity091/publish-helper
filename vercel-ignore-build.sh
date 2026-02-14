#!/bin/bash

# Vercel "Ignored Build Step" script
# This script cancels builds on the 'main' branch (production)
# but allows builds on all other branches (preview/testing).

# Get the current commit branch from Vercel's environment variable
BRANCH=$VERCEL_GIT_COMMIT_REF

echo "Current branch: $BRANCH"

if [[ "$BRANCH" == "main" ]]; then
  # Exit with code 0 to CANCEL the build (ignore it)
  echo "🛑 Production build cancelled (main branch)."
  exit 0
else
  # Exit with code 1 to PROCEED with the build (allow it)
  echo "✅ Preview build proceeding ($BRANCH branch)."
  exit 1
fi
