#!/bin/bash

# A safer Git workflow script to prevent accidental commits of sensitive information

# Step 1: Show what files would be added with 'git add .'
echo "Files that would be added with 'git add .':"
echo "=========================================="
git status --short | grep -v "^[[:space:]]*??" | grep -v "^[[:space:]]*D"
echo ""

# Step 2: Check for sensitive files
echo "Checking for sensitive files..."
echo "=============================="
SENSITIVE_FILES=$(git status --porcelain | grep -E "\.env$|\.env\.|demo\.env" | cut -c4-)

if [ -n "$SENSITIVE_FILES" ]; then
  echo "⚠️  WARNING: The following sensitive files were detected:"
  echo "$SENSITIVE_FILES"
  echo ""
  echo "These files may contain credentials and should not be committed."
  echo "If you need to proceed, use 'git add' with specific file names instead of 'git add .'"
  exit 1
fi

# Step 3: Run the secrets check script
echo "Running secrets check..."
echo "======================="
./check-secrets.sh

# Step 4: Ask for confirmation
echo ""
echo "Do you want to:"
echo "1) Add specific files (safer)"
echo "2) Add all files (not recommended)"
echo "3) Cancel"
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo "Enter the files to add (space-separated):"
    read -p "> " files_to_add
    git add $files_to_add
    echo "Files added. Run 'git status' to verify."
    ;;
  2)
    echo "⚠️  WARNING: Adding all files. This is not recommended."
    echo "Are you sure you want to continue? (y/n)"
    read -p "> " confirm
    if [ "$confirm" = "y" ]; then
      git add .
      echo "All files added. Run 'git status' to verify."
    else
      echo "Operation cancelled."
    fi
    ;;
  3)
    echo "Operation cancelled."
    ;;
  *)
    echo "Invalid choice. Operation cancelled."
    ;;
esac
