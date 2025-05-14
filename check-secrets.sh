#!/bin/bash

# Script to check for sensitive information in the codebase
# Enhanced version with Cloudinary-specific checks

echo "Checking for potential sensitive information in the codebase..."
echo "==============================================================="

# Define patterns to search for
PATTERNS=(
  "API_KEY"
  "API_SECRET"
  "SECRET_KEY"
  "PASSWORD"
  "CLOUDINARY.*="
  "cloudinary\.config"
  "api\.cloudinary\.com"
  "cloudName"
  "cloud_name"
  "dtzhskby3"  # Specific Cloudinary cloud name
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
  "setup-cloudinary.js"  # Exclude our helper script
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
echo ""
echo "Cloudinary Security Recommendations:"
echo "1. Revoke any exposed API keys immediately at https://cloudinary.com/console/settings/security"
echo "2. Generate new API keys and update your .env file"
echo "3. Use the setup-cloudinary.js script to verify your configuration:"
echo "   $ node setup-cloudinary.js"
echo "4. Make sure your .env file is in .gitignore to prevent accidental commits"
echo "5. Consider using unsigned upload presets for client-side uploads instead of API keys"
