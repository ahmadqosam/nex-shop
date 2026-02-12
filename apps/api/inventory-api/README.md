# Inventory API

Microservice for managing product inventory, stock levels, reservations, and adjustments within the Nex-Shop e-commerce platform.

## Features

- **Stock Management**: Track quantity and reserved stock by SKU.
- **Adjustments**: Audit trail for stock changes (restock, sale, return, correction).
- **Reservations**: Reserve stock for pending orders to prevent overselling.
- **Low Stock Alerts**: Query items below defined thresholds for reordering.
- **Event-Driven Sync**: Subscribes to order events via AWS SQS to finalize stock reservations.
- **Redis Caching**: Fast access to current stock levels with cache-aside pattern.
- **Serverless Ready**: Deploys to AWS Lambda via Serverless Framework.

## Tech Stack

- **Framework**: NestJS v11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (ioredis)
- **Messaging**: AWS SQS (for order event consumption)
- **Testing**: Jest, Testcontainers
- **API Docs**: Swagger / OpenAPI
- **Deployment**: Serverless Framework, AWS Lambda

## Architecture

### Module Structure

```
src/
├── inventory/      # Core domain: controllers, services, DTOs
├── prisma/         # Prisma client and database service
├── cache/          # Redis caching implementation
├── config/         # Environment configuration and Joi validation
├── common/         # Shared filters and utilities
└── lambda-sqs.ts   # SQS event handler for order events
```

### Database Schema

The service uses PostgreSQL via Prisma with the following primary models:

#### `inventories`

| Field               | Type      | Description                                     |
| ------------------- | --------- | ----------------------------------------------- |
| `id`                | `uuid`    | Primary key                                     |
| `sku`               | `varchar` | Unique SKU (references Product API)             |
| `quantity`          | `int`     | Total physical stock available                  |
| `reserved`          | `int`     | Stock held for pending/confirmed orders         |
| `lowStockThreshold` | `int`     | Threshold for low stock reporting (default: 10) |
| `warehouseCode`     | `varchar` | Optional warehouse identifier                   |
| `createdAt`         | `tz`      | Record creation time                            |
| `updatedAt`         | `tz`      | Last update time                                |

#### `inventory_adjustments`

| Field            | Type     | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `id`             | `uuid`   | Primary key                                     |
| `inventoryId`    | `uuid`   | Foreign key to inventories                      |
| `adjustmentType` | `string` | Type: `restock`, `sale`, `return`, `correction` |
| `quantity`       | `int`    | Adjustment amount (+/-)                         |
| `reason`         | `text`   | Optional reason for adjustment                  |
| `createdAt`      | `tz`     | Adjustment timestamp                            |

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for local infrastructure)

### Installation

```bash
pnpm install
```

### Infrastructure Setup

```bash
# Start PostgreSQL, Redis, and LocalStack
docker compose up -d

# Generate Prisma client
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# Seed initial inventory data
pnpm prisma:seed
```

### Running Locally

```bash
# Start development server
pnpm dev
```

The API will be available at [http://localhost:4002](http://localhost:4002).

## Testing

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:cov
```

### Coverage Thresholds

- **Statements/Functions/Lines**: 100%
- **Branches**: 75%

## Deployment

### Serverless (AWS Lambda)

```bash
# Build for Lambda
pnpm build:lambda

# Deploy to LocalStack
pnpm deploy:local

# Deploy to AWS
serverless deploy --stage production
```

## API Endpoints

| Method  | Endpoint                  | Description                    |
| ------- | ------------------------- | ------------------------------ |
| `GET`   | `/api/docs`               | Swagger UI Documentation       |
| `GET`   | `/inventory`              | List all inventory (paginated) |
| `GET`   | `/inventory/:sku`         | Get stock details for a SKU    |
| `POST`  | `/inventory`              | Create inventory for a SKU     |
| `PATCH` | `/inventory/:sku/adjust`  | Adjust stock (Restock/Sale)    |
| `POST`  | `/inventory/:sku/reserve` | Reserve stock quantity         |
| `POST`  | `/inventory/:sku/release` | Release reserved stock         |
| `GET`   | `/inventory/low-stock`    | List items below threshold     |

## 📝 License

UNLICENSED - Private project
