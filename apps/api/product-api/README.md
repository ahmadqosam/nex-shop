# Product API

Product catalog microservice for the nex-shop e-commerce platform.

## Features

- **PostgreSQL** database with Prisma ORM
- **Redis** caching with 5-minute TTL
- **Swagger/OpenAPI** documentation
- **100% unit test coverage**
- **E2E tests** with testcontainers
- **Lambda deployment** via Serverless Framework

## Tech Stack

| Technology | Purpose           |
| ---------- | ----------------- |
| NestJS     | Backend framework |
| PostgreSQL | Database          |
| Prisma     | ORM               |
| Redis      | Caching           |
| Swagger    | API documentation |
| Jest       | Testing           |
| Serverless | Lambda deployment |

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

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker

### Installation

```bash
pnpm install
```

### Start Services

```bash
# Start PostgreSQL, Redis, Localstack
docker compose up -d

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database
npx prisma db seed
```

### Run Development Server

```bash
pnpm start:dev
```

API available at: http://localhost:4002  
Swagger docs at: http://localhost:4002/api/docs

## Testing

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:cov

# E2E tests
pnpm test:e2e
```

## Environment Variables

| Variable         | Default     | Description                  |
| ---------------- | ----------- | ---------------------------- |
| `DATABASE_URL`   | -           | PostgreSQL connection string |
| `REDIS_HOST`     | localhost   | Redis host                   |
| `REDIS_PORT`     | 6381        | Redis port                   |
| `REDIS_PASSWORD` | -           | Redis password               |
| `CACHE_TTL`      | 300         | Cache TTL in seconds         |
| `NODE_ENV`       | development | Environment                  |

## Deployment

### Deploy to Localstack

```bash
pnpm deploy:local
```

### Build for Production

```bash
pnpm build:lambda
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── cache/             # Redis caching module
│   ├── common/            # Exception filters
│   ├── config/            # Config validation
│   ├── prisma/            # Prisma service
│   ├── products/          # Products module
│   ├── app.module.ts      # Root module
│   ├── main.ts            # App entry point
│   └── lambda.ts          # Lambda handler
├── test/
│   ├── app.e2e-spec.ts    # E2E tests
│   └── products.e2e-spec.ts # E2E with testcontainers
├── docker-compose.yml
└── serverless.yml
```

## License

MIT
