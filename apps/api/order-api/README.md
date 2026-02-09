# Order API

A production-ready order management microservice built with NestJS, featuring order lifecycle management, inter-service communication with Cart and Inventory APIs, Redis caching, and state machine-based status transitions.

## Features

- **Order Lifecycle Management** with state machine-based status transitions
- **Cart Integration** — create orders directly from cart-api carts
- **Inventory Reservation** — best-effort inventory reservation and release via inventory-api
- **Redis Caching** with pattern-based invalidation for orders and lists
- **Paginated Queries** with filtering by user, status, and sorting options
- **Serverless Ready** with AWS Lambda support
- **100% Test Coverage** (statements, functions, lines) with 75% branch coverage

## Tech Stack

- **Framework**: NestJS v11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (with Prisma ORM)
- **Cache**: Redis (ioredis)
- **HTTP Client**: Axios (@nestjs/axios) for inter-service communication
- **Testing**: Jest 30, ts-jest 29
- **API Docs**: Swagger / OpenAPI (@nestjs/swagger)
- **Package Manager**: pnpm
- **Deployment**: Serverless Framework, AWS Lambda

## Architecture

### Module Structure

```
src/
├── orders/        # Order domain — controller, service, DTOs
├── prisma/        # Prisma client and database connection
├── cache/         # Redis caching service
├── config/        # Environment configuration with Joi validation
└── common/        # Shared filters (AllExceptionsFilter)
```

### Database Schema

The service uses PostgreSQL via Prisma ORM with two tables:

**`orders`**

| Field                | Type          | Description                                      |
| -------------------- | ------------- | ------------------------------------------------ |
| `id`                 | `uuid`        | Primary key, auto-generated                      |
| `order_number`       | `varchar`     | Unique, format `ORD-YYYYMMDD-XXXX`               |
| `user_id`            | `varchar`     | User who placed the order (indexed)               |
| `email`              | `varchar`     | Contact email for the order                       |
| `status`             | `enum`        | Order status (indexed) — see Status Transitions   |
| `shipping_address`   | `jsonb`       | Shipping address object                           |
| `subtotal_in_cents`  | `int`         | Sum of all item totals                            |
| `shipping_cost_in_cents` | `int`     | Shipping cost (default: 0)                        |
| `total_in_cents`     | `int`         | Grand total (subtotal + shipping)                 |
| `currency`           | `varchar`     | Currency code (default: `USD`)                    |
| `notes`              | `text`        | Optional order notes                              |
| `paid_at`            | `timestamptz` | Set when status transitions to CONFIRMED          |
| `shipped_at`         | `timestamptz` | Set when status transitions to SHIPPED            |
| `delivered_at`       | `timestamptz` | Set when status transitions to DELIVERED          |
| `cancelled_at`       | `timestamptz` | Set when order is cancelled                       |
| `cancellation_reason`| `text`        | Reason for cancellation                           |
| `created_at`         | `timestamptz` | Record creation timestamp                         |
| `updated_at`         | `timestamptz` | Record last update timestamp                      |

**`order_items`**

| Field                | Type      | Description                            |
| -------------------- | --------- | -------------------------------------- |
| `id`                 | `uuid`    | Primary key, auto-generated            |
| `order_id`           | `uuid`    | Foreign key to orders (cascade delete) |
| `product_id`         | `varchar` | Reference to product-api product       |
| `variant_id`         | `varchar` | Reference to product variant           |
| `sku`                | `varchar` | Stock keeping unit                     |
| `quantity`           | `int`     | Quantity ordered                        |
| `unit_price_in_cents`| `int`     | Price per unit                         |
| `total_price_in_cents`| `int`    | unit_price * quantity                  |
| `currency`           | `varchar` | Currency code (default: `USD`)         |
| `product_name`       | `varchar` | Snapshot of product name at order time |
| `variant_name`       | `varchar` | Snapshot of variant name at order time |
| `image_url`          | `varchar` | Optional product image URL             |

### Order Status Transitions

The service enforces a strict state machine for order status changes:

```
PENDING ──────► CONFIRMED ──────► PROCESSING ──────► SHIPPED ──────► DELIVERED ──────► REFUNDED
  │                │
  └──► CANCELLED ◄─┘
```

| From       | Allowed Transitions      |
| ---------- | ------------------------ |
| PENDING    | CONFIRMED, CANCELLED     |
| CONFIRMED  | PROCESSING, CANCELLED    |
| PROCESSING | SHIPPED                  |
| SHIPPED    | DELIVERED                |
| DELIVERED  | REFUNDED                 |
| CANCELLED  | _(terminal state)_       |
| REFUNDED   | _(terminal state)_       |

### Inter-Service Communication

The order service communicates with two sibling microservices via HTTP:

| Service       | Base URL (default)      | Endpoints Used                                      |
| ------------- | ----------------------- | --------------------------------------------------- |
| **cart-api**      | `http://localhost:4004` | `GET /cart/{id}` — fetch cart, `POST /cart/{id}/convert` — mark cart converted |
| **inventory-api** | `http://localhost:4003` | `POST /inventory/{sku}/reserve` — reserve stock, `POST /inventory/{sku}/release` — release stock |

All inter-service calls are **best-effort** — failures are logged as warnings but do not block order creation or cancellation.

## API Endpoints

| Method  | Endpoint                | Description                      |
| ------- | ----------------------- | -------------------------------- |
| `POST`  | `/orders`               | Create order from cart or items  |
| `GET`   | `/orders`               | List orders (paginated/filtered) |
| `GET`   | `/orders/:id`           | Get order by ID                  |
| `PATCH` | `/orders/:id/status`    | Update order status              |
| `PATCH` | `/orders/:id/cancel`    | Cancel an order                  |
| `GET`   | `/`                     | Health check                     |

### Create Order — `POST /orders`

Create an order from an existing cart or with direct items.

```json
{
  "cartId": "uuid",
  "userId": "uuid",
  "email": "customer@example.com",
  "shippingAddress": {
    "fullName": "Jane Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "notes": "Please leave at door"
}
```

Or with direct items (when not using a cart):

```json
{
  "userId": "uuid",
  "email": "customer@example.com",
  "items": [
    {
      "productId": "uuid",
      "variantId": "uuid",
      "sku": "NEX-ACE-BLK",
      "quantity": 1,
      "unitPriceInCents": 34999,
      "productName": "Nex Ace",
      "variantName": "Midnight Black"
    }
  ],
  "shippingAddress": { ... }
}
```

### List Orders — `GET /orders`

Query parameters:

| Param       | Type     | Default      | Description                          |
| ----------- | -------- | ------------ | ------------------------------------ |
| `page`      | number   | `1`          | Page number (min: 1)                 |
| `limit`     | number   | `10`         | Items per page (1–100)               |
| `userId`    | string   | —            | Filter by user ID                    |
| `status`    | enum     | —            | Filter by order status               |
| `sortBy`    | string   | `createdAt`  | Sort field: `createdAt`, `totalInCents` |
| `sortOrder` | string   | `desc`       | Sort direction: `asc`, `desc`        |

### Update Status — `PATCH /orders/:id/status`

```json
{
  "status": "CONFIRMED"
}
```

### Cancel Order — `PATCH /orders/:id/cancel`

```json
{
  "reason": "Customer changed their mind"
}
```

Only orders in `PENDING` or `CONFIRMED` status can be cancelled. Cancellation triggers best-effort inventory release for all order items.

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local development with PostgreSQL and Redis)

### Installation

```bash
# Install dependencies (from monorepo root)
pnpm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# Seed the database (optional)
pnpm prisma:seed
```

### Environment Variables

| Variable            | Required | Default                  | Description                    |
| ------------------- | -------- | ------------------------ | ------------------------------ |
| `PORT`              | No       | `4005`                   | Server port                    |
| `NODE_ENV`          | No       | `development`            | Environment                    |
| `DATABASE_URL`      | **Yes**  | —                        | PostgreSQL connection string   |
| `REDIS_HOST`        | No       | `localhost`              | Redis host                     |
| `REDIS_PORT`        | No       | `6379`                   | Redis port                     |
| `REDIS_PASSWORD`    | No       | _(empty)_                | Redis password                 |
| `CACHE_TTL`         | No       | `300`                    | Cache TTL in seconds           |
| `CORS_ORIGIN`       | No       | `http://localhost:3000`  | Allowed CORS origin            |
| `CART_API_URL`      | No       | `http://localhost:4004`  | Cart service base URL          |
| `INVENTORY_API_URL` | No       | `http://localhost:4003`  | Inventory service base URL     |

### Running Locally

#### 1. Start Infrastructure Services

```bash
# From monorepo root
docker-compose up -d
```

#### 2. Generate Prisma Client and Push Schema

```bash
pnpm prisma:generate
pnpm prisma:push
```

#### 3. Seed the Database (Optional)

```bash
pnpm prisma:seed
```

This creates 5 sample orders with different statuses (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED).

#### 4. Start the Development Server

```bash
pnpm dev
```

The API will be available at `http://localhost:4005`.

## API Documentation

When running in development mode, Swagger/OpenAPI documentation is available at:

- **Swagger UI**: http://localhost:4005/api/docs
- **OpenAPI JSON**: http://localhost:4005/api/docs-json

## Testing

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov

# E2E tests
pnpm test:e2e
```

### Coverage Thresholds

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 100%      |
| Functions  | 100%      |
| Lines      | 100%      |
| Branches   | 75%       |

## Deployment

### Serverless (AWS Lambda)

```bash
# Build for Lambda
pnpm build:lambda

# Deploy to local (LocalStack)
pnpm deploy:local

# Deploy to AWS
serverless deploy --stage production
```

## Available Scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Start in watch mode                  |
| `pnpm build`      | Build for production                 |
| `pnpm start:prod` | Run production build                 |
| `pnpm test`       | Run unit tests                       |
| `pnpm test:cov`   | Run tests with coverage              |
| `pnpm test:e2e`   | Run end-to-end tests                 |
| `pnpm lint`       | Lint and fix source files            |
| `pnpm prisma:generate` | Generate Prisma client          |
| `pnpm prisma:push`| Push schema to database              |
| `pnpm prisma:seed`| Seed the database with sample data   |

## License

UNLICENSED - Private project
