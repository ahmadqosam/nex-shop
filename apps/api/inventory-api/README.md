# Inventory API

Microservice for managing product inventory, stock levels, reservations, and adjustments.

## Features

- **Stock Management**: Track quantity and reserved stock by SKU
- **Adjustments**: Audit trail for stock changes (restock, sale, return, correction)
- **Reservations**: Reserve stock for pending orders
- **Low Stock Alerts**: Query items below defined thresholds
- **Redis Caching**: Fast access to stock levels
- **PostgreSQL**: Durable storage with Prisma ORM

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (Prisma)
- **Cache**: Redis
- **Testing**: Jest (Unit & E2E)

## Getting Started

### Prerequisites

Ensure the infrastructure is running:

```bash
pnpm infra:up
```

### Installation

```bash
pnpm install
```

### Database Setup

```bash
# Generate Prisma Client
pnpm prisma:generate

# Push Schema to DB
pnpm prisma:push

# Seed Data
pnpm prisma:seed
```

### Running the Service

```bash
# Development
pnpm dev

# Production
pnpm start:prod
```

## API Endpoints

Documentation is available at `/api/docs` when the service is running.

| Method  | Endpoint                  | Description                    |
| ------- | ------------------------- | ------------------------------ |
| `GET`   | `/api/docs`               | Swagger UI Documentation       |
| `GET`   | `/api/docs-json`          | OpenAPI 3.0 JSON Specification |
| `GET`   | `/inventory`              | List all inventory (paginated) |
| `GET`   | `/inventory/:sku`         | Get stock details for a SKU    |
| `POST`  | `/inventory`              | Create inventory for a SKU     |
| `PATCH` | `/inventory/:sku/adjust`  | Adjust stock (Restock/Sale)    |
| `POST`  | `/inventory/:sku/reserve` | Reserve stock quantity         |
| `POST`  | `/inventory/:sku/release` | Release reserved stock         |
| `GET`   | `/inventory/low-stock`    | List items below threshold     |

## Testing

```bash
# Unit Tests
pnpm test

# E2E Tests
pnpm test:e2e
```
