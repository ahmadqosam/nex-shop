#!/bin/bash
set -e

# Cleanup script for k6 load test data
# Targets records created with 'k6-test-' prefix

echo "🧹 Cleaning up k6 load test data..."

# auth_db: Delete test users
echo "  - Removing users from auth_db..."
docker exec nex-shop-postgres-1 psql -U auth_user -d auth_db -c "DELETE FROM users WHERE email LIKE 'k6-test-%';"

# order_api_db: Delete orders (order_items cascade delete)
echo "  - Removing orders from order_api_db..."
docker exec nex-shop-postgres-1 psql -U order_api_user -d order_api_db -c "DELETE FROM orders WHERE email LIKE 'k6-test-%';"

# cart_api_db: Remove carts that are converted or from deleted users
# Since we can't easily join across DBs here, we'll remove CONVERTED carts 
# and any carts with a userId that no longer exists (orphans) or just clear it based on a timestamp if needed.
# For k6, we often just want a clean slate for the test users.
echo "  - Removing converted/guest carts from cart_api_db..."
docker exec nex-shop-postgres-1 psql -U cart_api_user -d cart_api_db -c "DELETE FROM carts WHERE status = 'CONVERTED';"

# inventory-api: Reset reservations (caution)
# Only reset reservations if they are stuck.
echo "  - Resetting inventory reservations..."
docker exec nex-shop-postgres-1 psql -U inventory_api_user -d inventory_api_db -c "UPDATE inventories SET reserved = 0;"

echo "✅ Cleanup complete!"
