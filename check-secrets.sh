#!/bin/bash

# Script to check for sensitive information in the codebase

echo "Checking for potential sensitive information in the codebase..."
echo "==============================================================="

# Define patterns to search for
PATTERNS=(
  "API_KEY"
  "API_SECRET"
  "SECRET_KEY"
  "PASSWORD"
  "CLOUDINARY.*="
  "mongodb\+srv://"
  "mongodb:\/\/.*:.*@"
  "-----BEGIN PRIVATE KEY-----"
  "-----BEGIN RSA PRIVATE KEY-----"
  "-----BEGIN DSA PRIVATE KEY-----"
  "-----BEGIN EC PRIVATE KEY-----"
  "AKIA[0-9A-Z]{16}"  # AWS Access Key ID pattern
)

# Files and directories to exclude
EXCLUDE=(
  ".git"
  "node_modules"
  ".env"
  ".env.example"
  "check-secrets.sh"
  ".gitignore"
)

# Build exclude pattern
EXCLUDE_PATTERN=""
for item in "${EXCLUDE[@]}"; do
  EXCLUDE_PATTERN="$EXCLUDE_PATTERN --exclude-dir=$item"
done

# Check each pattern
for pattern in "${PATTERNS[@]}"; do
  echo "Checking for pattern: $pattern"
  result=$(grep -r "$pattern" $EXCLUDE_PATTERN --include="*.js" --include="*.html" --include="*.css" --include="*.json" --include="*.md" . 2>/dev/null)
  
  if [ -n "$result" ]; then
    echo "⚠️  POTENTIAL SENSITIVE INFORMATION FOUND:"
    echo "$result"
    echo ""
  else
    echo "✅ No matches found"
    echo ""
  fi
done

echo "==============================================================="
echo "Scan complete. Review any findings above."
echo "Remember to check your .env file to ensure it's properly configured and not committed to Git."
