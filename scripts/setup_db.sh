#!/bin/bash

# This script runs the database migration scripts inside the lms-backend container
# Usage: ./scripts/setup_db.sh

echo "------------------------------------------------"
echo "LMS 2.0 - Database Migration Utility (Docker)"
echo "------------------------------------------------"

# Check if the container is running
CONTAINER_NAME="lms-backend"

if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    echo "Error: Container '$CONTAINER_NAME' is not running."
    echo "Please ensure your docker containers are up: 'docker compose up -d'"
    exit 1
fi

# 1. Add Hidden Fields and Authorized Users
echo "[1/3] Updating letters table (is_hidden, authorized_users)..."
docker exec $CONTAINER_NAME node scripts/add_hidden_fields.js

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Error updating letters table."
    exit 1
fi

echo ""

# 2. Create Section Registry
echo "[2/3] Creating Section Registry tables..."
docker exec $CONTAINER_NAME node scripts/create_section_registry.js

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Error creating section registry."
    exit 1
fi

echo ""

# 3. Register System Pages
echo "[3/3] Registering System Pages (Section Registry)..."
docker exec $CONTAINER_NAME node scripts/register_pages.js

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Error registering system pages."
    exit 1
fi

echo "------------------------------------------------"
echo "All migrations completed successfully."
echo "------------------------------------------------"
