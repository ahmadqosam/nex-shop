# Payment API

Middleware microservice for payment processing via [localstripe](https://github.com/adrienverge/localstripe) (Stripe mock server).

## Overview

Payment API acts as a backend proxy between authenticated clients and Stripe. It creates PaymentIntents through the official Stripe SDK and processes webhook events for successful payments.

**Tech Stack:** NestJS 11, Stripe SDK, Passport JWT (RS256), Swagger/OpenAPI

## Architecture

Client (with JWT) ──► Payment API ──► Localstripe (Stripe mock)
│ │ │
│ │◄──── Webhook ◄──┘
│ │ (payment_intent.succeeded)
│ ▼
│ SNS (LocalStack) ──► SQS Queue ──► [Consumer Service]
│ │
│ ▼
│ DLQ (Dead Letter Queue)
▼
Log / Process

**Modules:**

- **AuthModule** — JWT verification using RS256 public key from auth-api
- **StripeModule** — Wraps the official Stripe SDK, configurable to point at localstripe
- **PaymentsModule** — Payment endpoint (JWT protected) and webhook handler (public, signature-verified)

## Getting Started

- Node.js >= 20
- pnpm >= 9
- Docker (for localstripe and LocalStack)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment setup

```bash
cp .env.example .env
```

Edit `.env` and set `RSA_PUBLIC_KEY` to the base64-encoded RSA public key from auth-api:

```bash
# Generate from auth-api's public key PEM file:
cat /path/to/public.pem | base64 -w 0
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:

- **LocalStack** on port 4571 (Lambda, API Gateway)
- **Localstripe** on port 8420 (Stripe mock)
- **localstripe-init** — auto-registers the webhook pointing to `http://host.docker.internal:4006/payments/webhook`
- **localstack-init** — creates `payment-events` SNS topic, SQS queue, and subscription

### 4. Run dev server

```bash
pnpm dev
```

The API starts on [http://localhost:4006](http://localhost:4006).

## API Endpoints

| Method | Path                | Auth                        | Description                  |
| ------ | ------------------- | --------------------------- | ---------------------------- |
| `GET`  | `/`                 | Public                      | Health check                 |
| `POST` | `/payments`         | JWT Bearer                  | Create a PaymentIntent       |
| `POST` | `/payments/webhook` | Public (signature verified) | Handle Stripe webhook events |

## Authentication

The API verifies JWT tokens issued by **auth-api** using RS256 asymmetric verification:

- Tokens must be passed in the `Authorization: Bearer <token>` header
- The API uses the RSA **public key** (via `RSA_PUBLIC_KEY` env var) to verify tokens
- Token issuer must be `auth-api`
- All endpoints are protected by default; only `@Public()` routes bypass JWT

## Webhooks

Localstripe sends webhook events to `POST /payments/webhook` when payment state changes.

**Supported events:**

- `payment_intent.succeeded` — Payment completed successfully
- `payment_intent.payment_failed` — Payment failed

**Webhook signature verification:** The endpoint verifies the `stripe-signature` header using the `STRIPE_WEBHOOK_SECRET`.

**Manual webhook registration** (if not using docker-compose init):

```bash
curl -X POST http://localhost:8420/_config/webhooks/payment_webhook \
  -d url=http://localhost:4006/payments/webhook \
  -d secret=whsec_test_secret
```

## API Documentation

- **Swagger UI:** [http://localhost:4006/api/docs](http://localhost:4006/api/docs)
- **OpenAPI JSON:** [http://localhost:4006/api/docs-json](http://localhost:4006/api/docs-json)

Bearer auth is pre-configured in Swagger — click "Authorize" and paste your JWT token.

## Testing

### Unit tests

```bash
pnpm test          # Run tests
pnpm test:cov      # Run with coverage report
pnpm test:watch    # Run in watch mode
```

**Coverage thresholds:** 100% statements, 100% functions, 100% lines, 75% branches

### E2E / Integration tests

```bash
pnpm test:e2e
```

E2E tests use [Testcontainers](https://testcontainers.com/) to spin up a localstripe Docker container, generate RSA keys for JWT auth, and test the full request flow.

**Requires:** Docker running locally.

## Deployment

### Build

```bash
pnpm build
```

### Deploy to LocalStack (Lambda)

```bash
pnpm deploy:local
```

This builds the project and deploys it as an AWS Lambda function to LocalStack using the Serverless Framework. The Lambda handler is at `dist/lambda.handler`.

**Serverless configuration:** See [serverless.yml](serverless.yml) — uses `serverless-localstack` plugin to target LocalStack on port 4571.

## Environment Variables

| Variable                | Required | Default                  | Description                                                          |
| ----------------------- | -------- | ------------------------ | -------------------------------------------------------------------- |
| `PORT`                  | No       | `4006`                   | HTTP server port                                                     |
| `NODE_ENV`              | No       | `development`            | Environment (`development`, `production`, `test`)                    |
| `CORS_ORIGIN`           | No       | `http://localhost:3000`  | Allowed CORS origin                                                  |
| `RSA_PUBLIC_KEY`        | Yes      | —                        | Base64-encoded RSA public key from auth-api                          |
| `STRIPE_SECRET_KEY`     | Yes      | —                        | Stripe secret key (`sk_test_xxx` for localstripe)                    |
| `STRIPE_WEBHOOK_SECRET` | Yes      | —                        | Webhook signing secret (`whsec_test_secret` for localstripe)         |
| `STRIPE_API_URL`        | No       | `https://api.stripe.com` | Stripe API URL (override to `http://localhost:8420` for localstripe) |
| `SNS_ENDPOINT`          | No       | `http://localhost:4571`  | AWS SNS Endpoint (LocalStack)                                        |
| `AWS_REGION`            | No       | `us-east-1`              | AWS Region                                                           |
| `SNS_TOPIC_ARN`         | Yes      | —                        | SNS Topic ARN for events                                             |

## Project Structure

```
src/
├── auth/                          # JWT verification module
│   ├── decorators/                # @Public(), @CurrentUser()
│   ├── enums/                     # Role enum
│   ├── guards/                    # JwtAuthGuard (global)
│   ├── interfaces/                # JwtPayload type
│   ├── strategies/                # Passport JWT strategy (RS256)
│   └── auth.module.ts
├── payments/                      # Payment domain module
│   ├── dto/                       # CreatePaymentDto, PaymentResponseDto
│   ├── payments.controller.ts     # POST /payments, POST /payments/webhook
│   ├── payments.service.ts        # Business logic
│   └── payments.module.ts
├── stripe/                        # Stripe SDK wrapper
│   ├── stripe.service.ts          # PaymentIntent operations, webhook verification
│   └── stripe.module.ts
├── sns/                           # AWS SNS wrapper
│   ├── sns.service.ts             # Publish/CreateTopic operations
│   └── sns.module.ts
├── config/                        # Joi validation schema
├── common/                        # Global exception filter
├── app.module.ts                  # Root module with global guards
├── main.ts                        # Express server entry point
└── lambda.ts                      # AWS Lambda handler
test/
├── app.e2e-spec.ts                # Health check E2E test
├── payments.e2e-spec.ts           # Payment flow E2E tests (Testcontainers)
└── jest-e2e.json                  # E2E Jest config
```
