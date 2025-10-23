#!/bin/bash
set -e

# Navigate to project root (where package.json with workspaces is)
cd "$(dirname "$0")/.."

echo "Building from directory: $(pwd)"

# Run the build script
node scripts/build-vercel.js

