# Cart API

Shopping cart management microservice for the Nex-Shop e-commerce platform.

## Features

- **Guest and Authenticated Carts**: Support for both session-based and user-based shopping carts.
- **Cart Merging**: Automatic merging of guest carts into user accounts upon login.
- **Price Snapshots**: Captures product prices at the time of adding to ensure price consistency.
- **Inventory Integration**: Real-time stock verification against the `inventory-api`.
- **Redis Caching**: High-performance cart retrieval using the cache-aside pattern.
- **Event-Driven Cleanup**: Processes payment events to convert or clear carts.
- **Serverless Ready**: Fully compatible with AWS Lambda and LocalStack.

## Tech Stack

- **Framework**: NestJS v11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (ioredis)
- **HTTP Client**: Axios (@nestjs/axios) for communication with Inventory API
- **Testing**: Jest, Testcontainers
- **API Docs**: Swagger / OpenAPI
- **Deployment**: Serverless Framework, AWS Lambda

## Architecture

### Module Structure

```
src/
├── cart/           # Core domain: controllers, services, DTOs
├── prisma/         # Prisma client and database service
├── cache/          # Redis caching implementation
├── config/         # Environment configuration and Joi validation
├── common/         # Shared filters and utilities
└── lambda-sqs.ts   # SQS event handler for payment/order events
```

### Database Schema

The service uses PostgreSQL via Prisma with the following primary models:

#### `carts`

| Field                   | Type      | Description                                  |
| ----------------------- | --------- | -------------------------------------------- |
| `id`                    | `uuid`    | Primary key                                  |
| `user_id`               | `varchar` | Associated user ID (for authenticated users) |
| `session_id`            | `varchar` | Associated session ID (for guest users)      |
| `status`                | `enum`    | `ACTIVE`, `MERGED`, `CONVERTED`, `ABANDONED` |
| `expires_at`            | `tz`      | TTL for guest cart cleanup                   |
| `createdAt`/`updatedAt` | `tz`      | Standard timestamps                          |

#### `cart_items`

| Field            | Type      | Description                        |
| ---------------- | --------- | ---------------------------------- |
| `id`             | `uuid`    | Primary key                        |
| `cart_id`        | `uuid`    | Foreign key to carts               |
| `variant_id`     | `varchar` | Unique product variant ID          |
| `sku`            | `varchar` | Stock keeping unit                 |
| `quantity`       | `int`     | Item quantity                      |
| `price_in_cents` | `int`     | Snapshot of price at time of entry |
| `product_name`   | `varchar` | Snapshot of product name           |

### Inter-Service Communication

| Service           | Role             | Description                                         |
| ----------------- | ---------------- | --------------------------------------------------- |
| **inventory-api** | Stock Validation | Validates stock availability before adding to cart. |
| **auth-api**      | User Context     | Provides user identity for cart merging.            |

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
```

### Running Locally

```bash
# Start development server
pnpm dev
```

The API will be available at [http://localhost:4004](http://localhost:4004).

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

| Method | Endpoint                      | Description                                                     |
| ------ | ----------------------------- | --------------------------------------------------------------- |
| GET    | `/cart`                       | Get/create cart (requires `x-user-id` or `x-session-id` header) |
| GET    | `/cart/:cartId`               | Get cart by ID                                                  |
| GET    | `/cart/:cartId/summary`       | Get cart totals                                                 |
| POST   | `/cart/:cartId/items`         | Add item to cart                                                |
| PUT    | `/cart/:cartId/items/:itemId` | Update item quantity                                            |
| DELETE | `/cart/:cartId/items/:itemId` | Remove item                                                     |
| DELETE | `/cart/:cartId`               | Clear all items                                                 |
| POST   | `/cart/merge`                 | Merge guest cart into user cart                                 |
| POST   | `/cart/:cartId/convert`       | Convert cart to order (status: CONVERTED)                       |

## 📝 License

UNLICENSED - Private project
