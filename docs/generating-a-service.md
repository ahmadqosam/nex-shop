# Generating a New Service

The scaffolding script creates a production-ready NestJS microservice in `apps/api/` with all the boilerplate pre-configured.

## Quick Start

```bash
pnpm generate
```

The interactive prompt will ask for:

| Prompt | Example | Notes |
|--------|---------|-------|
| Service name | `order-api` | Must be kebab-case |
| Description | `Order management microservice` | Used in Swagger docs |
| Port | `4003` | Auto-detected from existing services |
| Include Prisma? | `y` | Adds database layer (PostgreSQL) |
| Include Redis? | `y` | Adds cache layer (ioredis) |

After confirming the summary, the script generates all files and prints next steps.

## Post-Generation Steps

```bash
# 1. Install dependencies
pnpm install

# 2. If Prisma was included — generate the client and push the schema
cd apps/api/<service-name>
pnpm prisma:generate
pnpm prisma:push

# 3. If Prisma was included — recreate Docker volumes so the new database is created
cd ../../..
pnpm infra:down && docker volume rm nex-shop_pgdata && pnpm infra:up

# 4. Start all services
pnpm dev
```

## What Gets Generated

```
apps/api/<service-name>/
├── .env.example / .env       # Environment config
├── .prettierrc
├── docker-compose.yml         # Per-service isolated dev infra
├── eslint.config.mjs
├── nest-cli.json
├── package.json               # @apps/<service-name>, Jest config embedded
├── serverless.yml             # Lambda + LocalStack
├── tsconfig.json / tsconfig.build.json
├── src/
│   ├── main.ts                # Express bootstrap + Swagger
│   ├── lambda.ts              # AWS Lambda handler
│   ├── app.module.ts          # ConfigModule + conditional Prisma/Cache
│   ├── app.controller.ts      # Health check GET /
│   ├── app.controller.spec.ts
│   ├── app.service.ts
│   ├── config/                # Joi validation schema
│   ├── common/                # AllExceptionsFilter
│   ├── prisma/                # (if Prisma selected)
│   └── cache/                 # (if Redis selected)
├── prisma/schema.prisma       # (if Prisma selected)
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

## Port Allocation

Ports are auto-detected by scanning `apps/api/*/.env.example` for `PORT=` values and incrementing from the highest found.

The per-service `docker-compose.yml` uses offset-based ports for isolated development:

| Service | Formula | Example (port 4003) |
|---------|---------|---------------------|
| App | as configured | 4003 |
| Postgres | `5432 + (port - 4001)` | 5434 |
| Redis | `6379 + (port - 4001)` | 6381 |
| LocalStack | `4566 + (port - 4001)` | 4568 |

## Database Integration

When Prisma is selected, the script automatically appends a new database block to `scripts/init-db.sh` (used by the root `docker-compose.yml` Postgres container). This means the next time the Postgres volume is recreated, the new database and user will be provisioned automatically.

## Available Scripts (per-service)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start with watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm test` | Run unit tests |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm test:e2e` | Run e2e tests |
| `pnpm lint` | Lint and fix |
| `pnpm prisma:generate` | Generate Prisma client (if Prisma) |
| `pnpm prisma:push` | Push schema to database (if Prisma) |
| `pnpm deploy:local` | Deploy to LocalStack |

## Endpoints

| Path | Description |
|------|-------------|
| `http://localhost:<port>` | Health check (returns `OK`) |
| `http://localhost:<port>/api/docs` | Swagger UI |
| `http://localhost:<port>/api/docs-json` | OpenAPI JSON spec |
