# Product API

Product catalog microservice for the Nex-Shop e-commerce platform.

## Features

- **Dynamic Catalog**: Manage products, categories, and tags with full CRUD support.
- **Variant Support**: Detailed product variants with SKU-specific pricing and attributes.
- **Flash Sales**: Integrated flash sale management with high-concurrency support.
- **Optimized Performance**: Multi-level caching with Redis (5-minute TTL).
- **Relational Storage**: Robust data modeling using PostgreSQL and Prisma ORM.
- **Serverless Ready**: Fully compatible with AWS Lambda and LocalStack deployment.

## Tech Stack

- **Framework**: NestJS v11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (ioredis)
- **Testing**: Jest, Testcontainers
- **API Docs**: Swagger / OpenAPI
- **Deployment**: Serverless Framework, AWS Lambda

## Architecture

### Module Structure

```
src/
├── products/       # Core domain: controllers, services, DTOs
├── prisma/         # Prisma client and database service
├── cache/          # Redis caching implementation
├── config/         # Environment configuration and Joi validation
├── common/         # Shared filters and decorators
└── lambda.ts       # AWS Lambda entry point
```

### Database Schema

The service uses PostgreSQL via Prisma with the following primary models:

#### `products`

| Field          | Type      | Description              |
| -------------- | --------- | ------------------------ |
| `id`           | `uuid`    | Primary key              |
| `name`         | `varchar` | Product name             |
| `slug`         | `unique`  | URL-friendly identifier  |
| `category`     | `varchar` | Product category         |
| `base_price`   | `int`     | Price in cents           |
| `is_available` | `boolean` | Global availability flag |

#### `variants`

| Field        | Type      | Description                            |
| ------------ | --------- | -------------------------------------- |
| `id`         | `uuid`    | Primary key                            |
| `sku`        | `unique`  | Stock keeping unit (used by inventory) |
| `name`       | `varchar` | Variant name (e.g., "Midnight Black")  |
| `attributes` | `json`    | Flexible key-value attributes          |

#### `flash_sales`

| Field       | Type      | Description          |
| ----------- | --------- | -------------------- |
| `id`        | `uuid`    | Primary key          |
| `startTime` | `tz`      | Sale start timestamp |
| `endTime`   | `tz`      | Sale end timestamp   |
| `isActive`  | `boolean` | Sale status          |

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

# Seed product and variant data
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

| Method | Endpoint         | Description               |
| ------ | ---------------- | ------------------------- |
| GET    | `/products`      | List products (paginated) |
| GET    | `/products/:id`  | Get product by ID         |
| GET    | `/api/docs`      | Swagger UI                |
| GET    | `/api/docs-json` | OpenAPI JSON              |

### Query Parameters for GET /products

| Parameter   | Type   | Default   | Description                        |
| ----------- | ------ | --------- | ---------------------------------- |
| `page`      | number | 1         | Page number (min: 1)               |
| `limit`     | number | 10        | Items per page (max: 100)          |
| `category`  | string | -         | Filter by category                 |
| `search`    | string | -         | Search by product name             |
| `sortBy`    | string | createdAt | Sort field: name, price, createdAt |
| `sortOrder` | string | desc      | Sort order: asc, desc              |

## 📝 License

UNLICENSED - Private project
