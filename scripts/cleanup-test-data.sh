#!/bin/bash
set -e

# Cleanup script for k6 load test data
# Targets records created with k6 prefixes

echo "🧹 Cleaning up k6 load test data..."

# auth_db: Delete test users (covering k6-test-, k6-std-, k6-flash-)
echo "  - Removing users from auth_db..."
docker exec nex-shop-postgres-1 psql -U auth_user -d auth_db -c "DELETE FROM users WHERE email LIKE 'k6-%';"

# order_api_db: Delete orders
echo "  - Removing orders from order_api_db..."
docker exec nex-shop-postgres-1 psql -U order_api_user -d order_api_db -c "DELETE FROM orders WHERE email LIKE 'k6-%';"

# cart_api_db: Remove converted/guest carts
echo "  - Removing converted/guest carts from cart_api_db..."
docker exec nex-shop-postgres-1 psql -U cart_api_user -d cart_api_db -c "DELETE FROM carts WHERE status = 'CONVERTED' OR status = 'EXPIRED';"

# product_db: Delete flash sales created by k6
# This will cascade delete flash_sale_items and flash_sale_purchases
echo "  - Removing flash sales from product_db..."
docker exec nex-shop-postgres-1 psql -U product_user -d product_db -c "DELETE FROM flash_sales WHERE name LIKE 'K6 Load Test Sale%';"

# inventory-api: Reset reservations
echo "  - Resetting inventory reservations..."
docker exec nex-shop-postgres-1 psql -U inventory_api_user -d inventory_api_db -c "UPDATE inventories SET reserved = 0;"

echo "✅ Cleanup complete!"
