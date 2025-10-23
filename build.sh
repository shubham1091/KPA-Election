#!/bin/bash
set -e

# Ensure we're in the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Building KPA-Election from: $PROJECT_ROOT"

# Run the Node.js build script
node scripts/build-vercel.js

