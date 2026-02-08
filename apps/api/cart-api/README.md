# Cart API

Shopping cart management microservice for nex-shop e-commerce platform.

## Overview

- **Port:** 4004
- **Framework:** NestJS
- **Database:** PostgreSQL (via Prisma)
- **Cache:** Redis

## Features

- Guest and authenticated user carts
- Cart item management (add, update, remove)
- Guest-to-user cart merge on login
- Redis caching with cache-aside pattern
- Price snapshots at time of adding
- Inventory checks against `inventory-api`
- Cart conversion to order (status update)

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

## Data Models

### Cart

```prisma
model Cart {
  id        String     @id @default(uuid())
  userId    String?    // Authenticated user
  sessionId String?    // Guest session
  status    CartStatus // ACTIVE, MERGED, CONVERTED, ABANDONED, EXPIRED
  items     CartItem[]
  expiresAt DateTime?  // TTL for guest carts (7 days)
}
```

### CartItem

```prisma
model CartItem {
  id           String @id @default(uuid())
  cartId       String
  productId    String // From product-api
  variantId    String
  sku          String
  quantity     Int
  priceInCents Int    // Price snapshot
  productName  String // Display snapshot
  variantName  String
  imageUrl     String?
}
```

## Caching Strategy

Uses **cache-aside pattern** with Redis:

- **Read:** Check cache first → DB fallback → cache result
- **Write:** Invalidate cache → update DB → re-cache

### Cache Keys

| Key                        | TTL   | Purpose               |
| -------------------------- | ----- | --------------------- |
| `cart:{id}`                | 5 min | Full cart with items  |
| `user_cart:{userId}`       | 5 min | User → cart lookup    |
| `session_cart:{sessionId}` | 5 min | Session → cart lookup |

## Cart Lifecycle

```
ACTIVE → MERGED     (guest cart merged on login)
ACTIVE → CONVERTED  (checkout complete)
ACTIVE → ABANDONED  (analytics tracking)
ACTIVE → EXPIRED    (guest cart TTL reached)
```

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# Run development server
pnpm dev

# Run tests
pnpm test        # Unit tests
pnpm test:e2e    # Integration tests
```

## Environment Variables

```env
PORT=4004
NODE_ENV=development
DATABASE_URL="postgresql://cart_api_user:cart_api_password@localhost:5432/cart_api_db"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_TTL=300
CACHE_TTL=300
CORS_ORIGIN=http://localhost:3000
INVENTORY_API_URL=http://localhost:4002

```

## Swagger Documentation

Available at http://localhost:4004/api/docs
