#!/bin/bash

# This script runs the database migration scripts
# Usage: ./scripts/setup_db.sh

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "------------------------------------------------"
echo "LMS 2.0 - Database Migration Utility"
echo "------------------------------------------------"

# 1. Add Hidden Fields and Authorized Users
echo "[1/2] Updating letters table (is_hidden, authorized_users)..."
node "$PROJECT_ROOT/scripts/add_hidden_fields.js"

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Error updating letters table."
    exit 1
fi

echo ""

# 2. Create Section Registry
echo "[2/2] Creating Section Registry tables..."
node "$PROJECT_ROOT/scripts/create_section_registry.js"

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Error creating section registry."
    exit 1
fi

echo "------------------------------------------------"
echo "All migrations completed successfully."
echo "------------------------------------------------"
