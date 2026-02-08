#!/bin/bash
set -e

# Create databases and users for each service.
# Add new blocks here when scaffolding a new backend service.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    -- auth-api
    CREATE USER auth_user WITH PASSWORD 'auth_password';
    CREATE DATABASE auth_db OWNER auth_user;
    GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;

    -- product-api
    CREATE USER product_user WITH PASSWORD 'product_password';
    CREATE DATABASE product_db OWNER product_user;
    GRANT ALL PRIVILEGES ON DATABASE product_db TO product_user;

    -- inventory-api
    CREATE USER inventory_api_user WITH PASSWORD 'inventory_api_password';
    CREATE DATABASE inventory_api_db OWNER inventory_api_user;
    GRANT ALL PRIVILEGES ON DATABASE inventory_api_db TO inventory_api_user;
EOSQL
