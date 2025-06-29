#!/bin/bash

# Script to set up pre-commit hooks for the OWL Evaluation project
# Run this from the git repository root: /Users/garyshincc/garyshin/owl-eval

echo "Setting up pre-commit hooks..."

# Check if we're in the correct directory (git root)
if [ ! -d ".git" ]; then
    echo "Error: This script must be run from the git repository root"
    echo "Please run from: /Users/garyshincc/garyshin/owl-eval"
    exit 1
fi

# Navigate to frontend directory for package.json operations
cd eval/frontend

# Initialize Husky
echo "Initializing Husky..."
npx husky init

# Create pre-commit hook
echo "Creating pre-commit hook..."
cat > ../../.husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit checks..."

# Navigate to frontend directory
cd eval/frontend

# Run tests
echo "Running tests..."
npm test -- --passWithNoTests --watchAll=false

# Run linting
echo "Running linter..."
npm run lint

# Check if tests and linting passed
if [ $? -eq 0 ]; then
    echo "✅ All pre-commit checks passed!"
else
    echo "❌ Pre-commit checks failed. Commit aborted."
    exit 1
fi
EOF

# Make the hook executable
chmod +x ../../.husky/pre-commit

# Set up lint-staged configuration
echo "Setting up lint-staged configuration..."
cat > .lintstagedrc.json << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "npm run lint --fix",
    "npm test -- --bail --findRelatedTests --passWithNoTests --watchAll=false"
  ]
}
EOF

echo "✅ Pre-commit hooks setup complete!"
echo ""
echo "The pre-commit hook will now:"
echo "  - Run all tests"
echo "  - Run the linter"
echo "  - Prevent commits if tests fail or linting errors exist"
echo ""
echo "To test the hook, try making a commit!"