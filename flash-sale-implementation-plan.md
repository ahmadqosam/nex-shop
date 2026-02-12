Flash Sale Feature — Implementation Plan
Context
Add flash sale functionality where time-limited, quantity-limited products can be purchased once per user per event. The feature integrates into existing product pages (badges, pricing, countdown, stock indicators) rather than a dedicated page. The backend lives as a new module inside product-api, extending its Prisma schema.

Phase 1: Auth Integration in product-api
The product-api is currently fully public. Flash sale purchase/admin endpoints require JWT auth, so we must add RS256 verification first — replicating payment-api's auth module exactly.

1.1 Install dependencies

pnpm add @nestjs/passport passport passport-jwt --filter product-api
pnpm add -D @types/passport-jwt --filter product-api
1.2 Create src/auth/ module (8 files, mirroring payment-api/src/auth/)
File	Purpose
enums/role.enum.ts	USER, ADMIN roles
interfaces/jwt-payload.interface.ts	{ sub, email, roles }
decorators/public.decorator.ts	@Public() to bypass auth
decorators/current-user.decorator.ts	@CurrentUser() param decorator
decorators/roles.decorator.ts	@Roles(Role.ADMIN) metadata
guards/jwt-auth.guard.ts	Global guard, skips @Public() routes
guards/roles.guard.ts	Checks role metadata against JWT roles
strategies/jwt.strategy.ts	RS256 validation with RSA_PUBLIC_KEY env
auth.module.ts	Imports PassportModule, provides JwtStrategy
index.ts	Barrel exports
1.3 Integrate into app
config.schema.ts: Add RSA_PUBLIC_KEY: Joi.string().required()
app.module.ts: Import AuthModule, register JwtAuthGuard as APP_GUARD
products.controller.ts: Add @Public() at class level (keeps all product endpoints public)
app.controller.ts: Add @Public() at class level
.env files: Add RSA_PUBLIC_KEY (base64-encoded RSA public key from auth-api)
1.4 Tests
Unit tests for JwtAuthGuard and JwtStrategy (same patterns as payment-api tests)
Run existing test suites to confirm nothing breaks
Phase 2: Prisma Schema Changes
2.1 New models in schema.prisma

model FlashSale {
  id        String          @id @default(uuid())
  name      String
  startTime DateTime        @map("start_time")
  endTime   DateTime        @map("end_time")
  isActive  Boolean         @default(true) @map("is_active")
  items     FlashSaleItem[]
  createdAt DateTime        @default(now()) @map("created_at")
  updatedAt DateTime        @updatedAt @map("updated_at")

  @@index([startTime, endTime])
  @@index([isActive])
  @@map("flash_sales")
}

model FlashSaleItem {
  id               String              @id @default(uuid())
  productId        String              @map("product_id")
  product          Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId        String?             @map("variant_id")
  variant          Variant?            @relation(fields: [variantId], references: [id], onDelete: Cascade)
  flashSaleId      String              @map("flash_sale_id")
  flashSale        FlashSale           @relation(fields: [flashSaleId], references: [id], onDelete: Cascade)
  salePriceInCents Int                 @map("sale_price_in_cents")
  maxQuantity      Int                 @map("max_quantity")
  soldCount        Int                 @default(0) @map("sold_count")
  version          Int                 @default(0)  // optimistic locking
  purchases        FlashSalePurchase[]
  createdAt        DateTime            @default(now()) @map("created_at")
  updatedAt        DateTime            @updatedAt @map("updated_at")

  @@unique([flashSaleId, productId, variantId], name: "unique_flash_sale_product_variant")
  @@map("flash_sale_items")
}

model FlashSalePurchase {
  id              String        @id @default(uuid())
  userId          String        @map("user_id")
  flashSaleItemId String        @map("flash_sale_item_id")
  flashSaleItem   FlashSaleItem @relation(fields: [flashSaleItemId], references: [id], onDelete: Cascade)
  purchasedAt     DateTime      @default(now()) @map("purchased_at")

  @@unique([userId, flashSaleItemId], name: "unique_user_flash_sale_item")
  @@index([userId])
  @@map("flash_sale_purchases")
}
2.2 Add relations to existing models
Product: add flashSaleItems FlashSaleItem[]
Variant: add flashSaleItems FlashSaleItem[]
2.3 Run prisma db push + prisma generate
Phase 3: Flash Sale Backend Module
3.1 Module structure: src/flash-sale/

flash-sale/
  dto/
    create-flash-sale.dto.ts      # name, startTime, endTime, isActive?
    update-flash-sale.dto.ts      # PartialType of create
    add-flash-sale-item.dto.ts    # productId, variantId?, salePriceInCents, maxQuantity
    purchase-flash-sale-item.dto.ts  # flashSaleItemId
    flash-sale-response.dto.ts    # Response DTOs for sale, item, eligibility, purchase
    index.ts
  flash-sale.controller.ts
  flash-sale.service.ts
  flash-sale.module.ts
  flash-sale.service.spec.ts
  flash-sale.controller.spec.ts
  index.ts
3.2 API Endpoints
Method	Path	Auth	Description
GET	/flash-sales/active	Public	Active flash sales with items (cached 30s)
GET	/flash-sales/product/:productId	Public	Flash sale info for a product
GET	/flash-sales/eligibility/:flashSaleItemId	Bearer	Check user eligibility
POST	/flash-sales/purchase	Bearer	Purchase (one per user per item)
POST	/flash-sales	Admin	Create flash sale
PUT	/flash-sales/:id	Admin	Update flash sale
POST	/flash-sales/:flashSaleId/items	Admin	Add item to sale
DELETE	/flash-sales/:flashSaleId/items/:itemId	Admin	Remove item
3.3 Key service methods
getActiveFlashSales() — Cache-aside pattern (30s TTL). Queries flash sales where isActive=true, startTime <= now, endTime >= now. Includes items with product info (name, slug, images, basePriceInCents, category).

getFlashSaleForProduct(productId, variantId?) — Returns the flash sale item for a specific product if one exists in an active sale. Cached 30s.

checkEligibility(userId, flashSaleItemId) — Returns { eligible, reason?, remainingQuantity? }. Checks: item exists, sale active & in time window, stock available, user hasn't already purchased.

purchaseFlashSaleItem(userId, dto) — The critical concurrency-safe method using a Prisma interactive transaction with Serializable isolation:

Fetch item with version
Validate sale active & in time window
Check stock (soldCount < maxQuantity)
Check duplicate purchase
Optimistic lock: updateMany({ where: { id, version }, data: { soldCount: increment(1), version: increment(1) } }) — returns count=0 if concurrent update
Create FlashSalePurchase record (DB unique constraint is final safety net)
Invalidate cache after transaction commits
Three layers of protection against overselling/duplicates:

Optimistic locking (version field)
DB unique constraint (@@unique([userId, flashSaleItemId]))
Serializable transaction isolation
3.4 Tests
Unit tests: Service spec (~15 cases covering cache hits/misses, eligibility states, purchase success/conflicts/errors, optimistic lock failures). Controller spec (~8 cases for delegation).
E2E tests: New test/flash-sale.e2e-spec.ts with Testcontainers. Generate test RSA key pair for JWT auth in tests. Cover: active sales listing, eligibility checking, successful purchase, duplicate purchase rejection, sold-out handling, admin CRUD, role enforcement.
Coverage config: Update collectCoverageFrom in package.json to exclude **/interfaces/**, **/decorators/**, **/enums/**
3.5 Seed data
Update seed.ts to optionally create a sample flash sale with items for dev testing.

Phase 4: Frontend Service Layer
4.1 Types — new file src/types/flash-sale.ts

FlashSaleDto      { id, name, startTime, endTime, isActive, items[] }
FlashSaleItemDto  { id, productId, variantId, salePriceInCents, maxQuantity, soldCount, remainingQuantity, productName?, productImage?, originalPriceInCents?, category? }
EligibilityDto    { eligible, reason?, flashSaleItemId?, salePriceInCents?, remainingQuantity? }
PurchaseResultDto { purchaseId, flashSaleItemId, salePriceInCents, productId, variantId?, message }
Augment Product interface in types/index.ts with optional flashSale field:


flashSale?: { flashSaleItemId, salePriceInCents, originalPriceInCents, remainingQuantity, maxQuantity, saleEndTime, saleName }
4.2 Flash sale service — new file src/services/flashSaleService.ts
Functions: getActiveFlashSales(), getFlashSaleForProduct(productId, variantId?), checkEligibility(itemId, token), purchaseFlashSaleItem(itemId, token). Pattern matches existing services (fetch + error class).

4.3 Next.js rewrite — next.config.ts
Add: /api/flash-sales/:path* → ${PRODUCT_API_URL}/flash-sales/:path*

4.4 Enrich products with flash sale data
Modify productService.ts:

getAllProducts(): After fetching products, fetch active flash sales and attach flashSale field to matching products
getProductById(): After fetching product, call getFlashSaleForProduct() and attach data
Both wrapped in try/catch so flash sale API failures don't break product loading
4.5 Tests
flashSaleService.test.ts following authService.test.ts pattern
Phase 5: Frontend UI Changes
5.1 New components
CountdownTimer.tsx — Client component. Takes endTime (ISO string), calls onExpired callback when done. Has compact mode (HH:MM:SS inline) for product cards and full mode (separate boxes) for detail page. Updates every second via setInterval.

FlashSaleBadge.tsx — Small <Zap> icon + "Flash Sale" text in red badge.

5.2 ProductCard.tsx modifications
When product.flashSale exists:

Show FlashSaleBadge in top-right corner
Price area: strikethrough original price + red sale price
Below category: "X left of Y" stock text + compact CountdownTimer
5.3 ProductDetailClient.tsx modifications
When product.flashSale exists:

Flash sale banner at top: red background, sale name, stock remaining, full CountdownTimer
Pricing: Large red sale price + strikethrough original + discount % badge
Purchase button replaces "Add to Bag":
Not logged in → "Login to Purchase" (links to /login)
Already purchased → green "Already Purchased" (disabled)
Sold out → gray "Sold Out" (disabled)
Eligible → red "Buy Now — $X.XX" button
"One per customer per flash sale event" text below
State: eligibility (fetched via checkEligibility on mount if logged in), isPurchasing, purchaseSuccess, saleExpired
Purchase flow: Call purchaseFlashSaleItem() → on success, proceed to payment via paymentService.createPayment() with the sale price
5.4 ProductListClient.tsx modifications
Add "Flash Sale" toggle button (with Zap icon) alongside category filters
When active, filter products to only those with flashSale data
5.5 Homepage (page.tsx) modifications
Make the existing "Black Friday Flash Sale" promo section dynamic by fetching active flash sales
Show real sale name and link to /products with flash sale filter if active sales exist
5.6 Tests
CountdownTimer.test.tsx — renders correctly, expires callback, fake timers
Update existing ProductCard.test.tsx — flash sale badge, dual pricing, stock indicator
Update existing product detail test — flash sale banner, eligibility states, purchase button states
Verification Plan
Backend unit tests: cd apps/api/product-api && pnpm test — all suites pass, 100% coverage maintained
Backend E2E tests: cd apps/api/product-api && pnpm test:e2e — flash sale endpoints work end-to-end
Frontend unit tests: cd apps/web/ecomm-web && pnpm test — all suites pass, 100% coverage maintained
Manual flow:
Seed a flash sale via admin endpoint (or seed script)
Browse /products → see flash sale badges on affected products
Toggle "Flash Sale" filter → only flash sale products shown
Click a flash sale product → see banner, countdown, discounted price
Without login → see "Login to Purchase"
Login → see "Buy Now" button → purchase → see "Already Purchased"
Try purchasing again → 409 Conflict
Wait for sale to end → button disabled, "Sale Ended"
Concurrency test: Hit purchase endpoint concurrently with multiple users for a maxQuantity=1 item → only 1 succeeds