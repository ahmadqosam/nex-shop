# Flash Sale System

This document describes how the flash sale feature works end-to-end across the Nex-Shop microservices, how it prevents overselling under high concurrency, and what users experience at each stage.

## Overview

A flash sale is a time-limited event where a specific product or variant is offered at a discounted price with a capped quantity (e.g., 50 units at 50% off for 2 hours). Every authenticated user may purchase **at most one unit** per flash sale item. The system is designed to handle hundreds of concurrent buyers racing for limited stock without overselling.

## Data Model

Flash sales live in the **product-api** database (PostgreSQL via Prisma):

```
FlashSale
├── id, name, startTime, endTime, isActive
└── items: FlashSaleItem[]
       ├── id, productId, variantId, flashSaleId
       ├── salePriceInCents, maxQuantity
       ├── soldCount (starts at 0, increments on each purchase)
       ├── version (optimistic lock counter)
       └── purchases: FlashSalePurchase[]
              ├── userId
              └── flashSaleItemId
              └── @@unique([userId, flashSaleItemId])  ← one purchase per user
```

Key constraints:
- `@@unique([flashSaleId, productId, variantId])` — a product/variant can only appear once per sale.
- `@@unique([userId, flashSaleItemId])` — a user can only buy a flash sale item once.
- `@@index([startTime, endTime])` and `@@index([isActive])` — fast lookups for active sales.

## How a Flash Sale Is Configured

An admin creates a flash sale via the **product-api** REST endpoints:

### 1. Create the sale event

```
POST /flash-sales
Authorization: Bearer <admin-token>

{
  "name": "Summer Blowout",
  "startTime": "2025-07-01T00:00:00Z",
  "endTime": "2025-07-01T02:00:00Z",
  "isActive": true
}
```

### 2. Add items to the sale

```
POST /flash-sales/:saleId/items
Authorization: Bearer <admin-token>

{
  "productId": "<uuid>",
  "variantId": "<uuid>",          // optional
  "salePriceInCents": 4999,       // discounted price
  "maxQuantity": 50               // total units available
}
```

### 3. Manage the sale

| Action | Endpoint |
|--------|----------|
| List active sales | `GET /flash-sales/active` (public, cached 30s) |
| Get sale for a product | `GET /flash-sales/product/:productId` (public, cached 30s) |
| Update sale details | `PATCH /flash-sales/:id` (admin) |
| Remove an item | `DELETE /flash-sales/:saleId/items/:itemId` (admin) |

## End-to-End Purchase Flow

```
                                        ┌─────────────────────────────┐
                                        │         Frontend            │
                                        │  (Next.js ecomm-web)        │
                                        └──────┬──────────────────────┘
                                               │
                    ┌──────────────────────────┐│┌──────────────────────────┐
                    │ 1. Browse / Landing Page  │││ 2. Product Detail Page   │
                    │                           │││                          │
                    │ • Fetches products        │││ • Red banner with sale   │
                    │ • Enriches with flash     │││   name + countdown timer │
                    │   sale data (price,       │││ • Stock progress bar     │
                    │   remaining qty, timer)   │││ • Checks eligibility     │
                    │ • Shows FlashSaleBadge,   │││   on mount (GET)         │
                    │   countdown, "X left"     │││ • Shows "Buy Now" or     │
                    └──────────────────────────┘│││   "Sold Out" / "Already  │
                                               │││   Purchased" / "Login"   │
                                               │└──────────────────────────┘
                                               │
                              ┌─────────────────▼──────────────────┐
                              │ 3. User clicks "Buy Now"           │
                              │                                    │
                              │ POST /flash-sales/purchase          │
                              │ { flashSaleItemId }                │
                              │ Authorization: Bearer <token>      │
                              └─────────────────┬──────────────────┘
                                                │
                    ┌───────────────────────────▼────────────────────────────┐
                    │ 4. product-api: purchaseFlashSaleItem()                │
                    │                                                       │
                    │ Serializable Transaction {                            │
                    │   a. Read item (version, soldCount)                   │
                    │   b. Validate: active, in window, stock available     │
                    │   c. Check: user hasn't already purchased             │
                    │   d. Optimistic lock: UPDATE WHERE version=N          │
                    │   e. Create FlashSalePurchase record                  │
                    │ }                                                     │
                    │                                                       │
                    │ Invalidate caches → return purchaseId                 │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                              ┌─────────────────▼──────────────────┐
                              │ 5. Frontend redirects to           │
                              │    /checkout/confirmation           │
                              └────────────────────────────────────┘
```

> **Note:** The flash sale purchase is a direct buy — it bypasses the standard cart → order → payment flow. The `soldCount` increment on the `FlashSaleItem` is the authoritative record of how many units have been sold.

## How Overselling Is Prevented

The system uses **three independent layers** of protection. Even if one layer were somehow bypassed, the next would catch it.

### Layer 1: Optimistic Locking (primary guard)

The purchase transaction reads the item's current `version` and `soldCount`, then issues a conditional update:

```typescript
// flash-sale.service.ts — inside Serializable transaction
const updateResult = await tx.flashSaleItem.updateMany({
  where: {
    id: flashSaleItemId,
    version: item.version,       // must match what we read
    soldCount: item.soldCount,   // must match what we read
  },
  data: {
    soldCount: { increment: 1 },
    version:   { increment: 1 },
  },
});

if (updateResult.count === 0) {
  throw new ConflictException(
    'Flash sale item was updated concurrently. Please try again.'
  );
}
```

If two requests read `version=5, soldCount=3` simultaneously:
1. Request A commits first → row becomes `version=6, soldCount=4`.
2. Request B attempts `UPDATE WHERE version=5` → matches **0 rows** → gets a `409 Conflict`.

This means only one request can succeed per version, serializing all writes without pessimistic row locks.

### Layer 2: Database Unique Constraint

```prisma
@@unique([userId, flashSaleItemId], name: "unique_user_flash_sale_item")
```

Even if the optimistic lock somehow didn't fire, the database will reject a duplicate `(userId, flashSaleItemId)` pair with a unique constraint violation → caught and returned as `409 Conflict`.

### Layer 3: Serializable Transaction Isolation

```typescript
await this.prisma.$transaction(async (tx) => {
  // ... all reads and writes ...
}, {
  isolationLevel: 'Serializable',
});
```

PostgreSQL's `Serializable` isolation level detects read/write conflicts between concurrent transactions. If two transactions touch the same rows, one will be aborted with a serialization failure → Prisma surfaces this as an error → the client receives `409`.

### Summary Table

| Layer | Mechanism | What It Catches | HTTP Response |
|-------|-----------|-----------------|---------------|
| Optimistic Lock | `WHERE version=N` returns 0 rows | Concurrent writes to same item | `409 Conflict` |
| Unique Constraint | `@@unique([userId, flashSaleItemId])` | Same user buying twice | `409 Conflict` |
| Serializable Isolation | PostgreSQL transaction isolation | Any remaining read/write anomalies | `409 Conflict` / `500` |

### Application-Level Validation

Before the optimistic lock even fires, the service performs these checks inside the transaction:

1. **Sale is active** — `isActive === true`
2. **Within time window** — `startTime <= now <= endTime`
3. **Stock available** — `soldCount < maxQuantity`
4. **Not already purchased** — no existing `FlashSalePurchase` for this user + item

If any check fails, the transaction aborts early with a descriptive error (`400 Bad Request` or `409 Conflict`).

## What Happens When Demand Exceeds Stock

Consider a flash sale with **5 units** and **200 concurrent buyers**:

```
Time 0ms    All 200 users click "Buy Now" simultaneously
            ↓
            200 concurrent POST /flash-sales/purchase requests arrive

Time ~10ms  Each request starts a Serializable transaction
            Each reads: { soldCount: 0, version: 0, maxQuantity: 5 }

Time ~20ms  Request #1 commits:  UPDATE WHERE version=0 → matches → soldCount=1, version=1
            Request #2 commits:  UPDATE WHERE version=0 → matches 0 rows → 409 Conflict
            Request #3 commits:  UPDATE WHERE version=0 → matches 0 rows → 409 Conflict
            ... (most requests fail on first attempt)

Time ~50ms  Retrying users read: { soldCount: 1, version: 1 }
            Request #2 retries: UPDATE WHERE version=1 → matches → soldCount=2, version=2
            ...

Time ~200ms soldCount reaches 5
            All subsequent requests: soldCount(5) >= maxQuantity(5) → "Sold out"

Result:     Exactly 5 purchases, 195 users receive error responses
            Zero overselling guaranteed by version check + unique constraint
```

### Load Test Verification

The k6 test suite validates this exact scenario:

| Scenario | VUs | Stock | Expected Result |
|----------|-----|-------|-----------------|
| `limited_stock_concurrency` | 10 | 5 | Exactly 5 sold, 5 rejected |
| `flash_sale_stress` | 200 | 50 | Exactly 50 sold, 150 rejected |

The teardown phase verifies: `soldCount === maxQuantity` and logs PASS/FAIL.

## User Experience

### Browsing (Product Listing)

When a product is part of an active flash sale, the frontend enriches the product data with sale information. Users see:

- A red **"Flash Sale"** badge (with lightning icon) on the product card
- The **sale price** in red with the original price crossed out
- **"X left"** stock indicator
- A **countdown timer** showing hours, minutes, and seconds until the sale ends

### Product Detail Page

The detail page shows a prominent flash sale banner:

- **Sticky red banner** below the nav with the sale name, countdown timer, and a stock progress bar (`remainingQuantity / maxQuantity`)
- **Discount percentage** calculated and displayed (e.g., "50% OFF")
- **"Flash Sale price exclusively for members"** messaging
- Quantity selector is hidden — flash sales are fixed at 1 unit per customer

### Purchase Button States

The "Buy Now" button reflects the user's real-time eligibility:

| State | Button | When |
|-------|--------|------|
| Not logged in | **"Login to Purchase Flash Sale"** | No `user` in context. Clicking redirects to `/login` with a return URL. |
| Checking eligibility | **Spinner** | On mount, the page calls `GET /flash-sales/eligibility/:itemId`. |
| Eligible | **"Buy Now — $49.99"** (red, enabled) | User is logged in, sale is active, stock available, hasn't purchased yet. |
| Already purchased | **"Already Purchased"** (greyed out, disabled) | User has an existing `FlashSalePurchase` record. |
| Sold out | **"Sold Out"** (greyed out, disabled) | `soldCount >= maxQuantity`. |
| Purchasing | **Spinner** | After clicking "Buy Now", while the POST request is in flight. |
| Purchase failed | **Error banner** below button | Red alert with the error message (e.g., "Flash sale item was updated concurrently. Please try again."). |
| Success | **Redirect** | Navigates to `/checkout/confirmation?orderId=<purchaseId>`. |

### When the Sale Ends

The `CountdownTimer` component ticks every second. When it reaches zero:
- The timer disappears (renders `null`)
- The `onExpired` callback fires (can trigger a re-fetch of eligibility)
- Subsequent purchase attempts are rejected server-side: _"Flash sale has ended"_

### Error Messages Users See

| HTTP Status | Server Message | User-Facing Display |
|-------------|----------------|---------------------|
| `400` | "Flash sale is not active" | Shown in red error banner below button |
| `400` | "Flash sale has not started yet" | Shown in red error banner |
| `400` | "Flash sale has ended" | Shown in red error banner |
| `409` | "Sold out" | Button changes to "Sold Out" (disabled) |
| `409` | "Already purchased" | Button changes to "Already Purchased" (disabled) |
| `409` | "Flash sale item was updated concurrently. Please try again." | Shown in red error banner (user can retry) |
| `500` | Server error | "An unexpected error occurred during purchase." |

## Caching Strategy

Flash sale data is cached in **Redis** to reduce database load during high-traffic sale events:

| Cache Key | TTL | Invalidated On |
|-----------|-----|----------------|
| `flash-sales:active` | 30s | Purchase, create/update sale |
| `flash-sales:product:{productId}:{variantId}` | 30s | Purchase, create/update sale |

- Cache invalidation uses Redis `SCAN` with pattern matching (`flash-sales:product:*`) — non-blocking.
- The 30-second TTL means stock counts on the listing page may be up to 30 seconds stale. The authoritative stock check happens inside the purchase transaction, not from cache.
- Eligibility checks (`GET /eligibility/:itemId`) bypass cache (`cache: 'no-store'` on the frontend) to always reflect real-time state.

## Event Flow After Purchase

While the flash sale purchase itself is a direct transaction (not going through the cart/order/payment pipeline), the broader system uses SNS/SQS for downstream events:

```
Standard Order Flow (non-flash-sale):
  cart-api → order-api → payment-api → [Stripe webhook]
       │                                      │
       │                              SNS: payment_intent.succeeded
       │                                      │
       │                              order-api (SQS consumer)
       │                              → updates order to CONFIRMED
       │                              → publishes ORDER_CONFIRMED via SNS
       │                                      │
       │                              inventory-api (SQS consumer)
       │                              → decrements quantity & reserved
       │                              → creates InventoryAdjustment record
```

For the flash sale flow, the `soldCount` on `FlashSaleItem` is the authoritative counter. The inventory-api's `quantity`/`reserved` fields track physical warehouse stock separately and are synchronized via the order event pipeline when standard orders are placed.

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/flash-sales/active` | Public | List all active, in-window flash sales (cached 30s) |
| `GET` | `/flash-sales/product/:productId` | Public | Get flash sale info for a specific product (cached 30s) |
| `GET` | `/flash-sales/eligibility/:itemId` | Bearer | Check if the current user can purchase this item |
| `POST` | `/flash-sales/purchase` | Bearer | Purchase a flash sale item (1 per user) |
| `POST` | `/flash-sales` | Admin | Create a new flash sale |
| `PATCH` | `/flash-sales/:id` | Admin | Update a flash sale |
| `POST` | `/flash-sales/:saleId/items` | Admin | Add an item to a flash sale |
| `DELETE` | `/flash-sales/:saleId/items/:itemId` | Admin | Remove an item from a flash sale |

## Key Source Files

| Component | File |
|-----------|------|
| Flash sale service (purchase logic, concurrency control) | `apps/api/product-api/src/flash-sale/flash-sale.service.ts` |
| Flash sale controller (REST endpoints) | `apps/api/product-api/src/flash-sale/flash-sale.controller.ts` |
| Database schema (FlashSale, FlashSaleItem, FlashSalePurchase) | `apps/api/product-api/prisma/schema.prisma` |
| Inventory reservation & sync | `apps/api/inventory-api/src/inventory/inventory.service.ts` |
| Order event publishing (ORDER_CONFIRMED → SNS) | `apps/api/order-api/src/orders/order-events.service.ts` |
| Frontend flash sale service (API calls) | `apps/web/ecomm-web/src/services/flashSaleService.ts` |
| Product detail page (purchase UX) | `apps/web/ecomm-web/src/app/product/[id]/ProductDetailClient.tsx` |
| Product card (badge, countdown, stock) | `apps/web/ecomm-web/src/components/ProductCard.tsx` |
| Countdown timer component | `apps/web/ecomm-web/src/components/CountdownTimer.tsx` |
| Flash sale badge component | `apps/web/ecomm-web/src/components/FlashSaleBadge.tsx` |
| Load test (concurrency & stress scenarios) | `load-tests/user-journey.load-test.js` |
