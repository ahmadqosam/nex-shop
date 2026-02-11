/**
 * E2E User Journey Test
 *
 * Simulates: Login -> Fetch Product -> Add to Cart -> Create Order -> Pay -> Verify
 *
 * Prerequisites:
 *   - docker-compose up (postgres, redis, localstack, localstripe)
 *   - pnpm dev (all API services running)
 *
 * Run: npx tsx scripts/user-journey.e2e.ts
 */

// Environment Configuration
const TEST_ENV = process.env.TEST_ENV || 'dev';
const LOCALSTACK_BASE = 'http://localhost:4566/restapis/nex-gw/local/_user_request_';

const CONFIGS = {
  dev: {
    auth: 'http://localhost:4001',
    product: 'http://localhost:4002',
    inventory: 'http://localhost:4003',
    cart: 'http://localhost:4004',
    order: 'http://localhost:4005',
    payment: 'http://localhost:4006',
  },
  localstack: {
    auth: `${LOCALSTACK_BASE}/auth-svc`,
    product: `${LOCALSTACK_BASE}/product-svc`,
    inventory: `${LOCALSTACK_BASE}/inventory-svc`,
    cart: `${LOCALSTACK_BASE}/cart-svc`,
    order: `${LOCALSTACK_BASE}/order-svc`,
    payment: `${LOCALSTACK_BASE}/payment-svc`,
  },
};

const activeConfig = TEST_ENV === 'localstack' ? CONFIGS.localstack : CONFIGS.dev;

const AUTH_API = process.env.AUTH_API_URL || activeConfig.auth;
const PRODUCT_API = process.env.PRODUCT_API_URL || activeConfig.product;
const CART_API = process.env.CART_API_URL || activeConfig.cart;
const ORDER_API = process.env.ORDER_API_URL || activeConfig.order;
const PAYMENT_API = process.env.PAYMENT_API_URL || activeConfig.payment;
const INVENTORY_API = process.env.INVENTORY_API_URL || activeConfig.inventory;


// Seeded test user
const TEST_USER = { email: 'john@example.com', password: 'Test@1234' };

// Helpers
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

function decodeJwt(token: string): { sub: string; email: string; roles: string[] } {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${opts.method ?? 'GET'} ${url} -> ${res.status}: ${body}`);
  }
  return body ? JSON.parse(body) : ({} as T);
}

async function getInventory(sku: string) {
  try {
    return await request<{ sku: string; quantity: number; reserved: number }>(
      `${INVENTORY_API}/inventory/${sku}`,
    );
  } catch (e) {
    return null;
  }
}

async function ensureInventory(sku: string, minQty: number = 10) {
  let inv = await getInventory(sku);
  if (!inv) {
    log('Setup', `Creating inventory for ${sku}...`);
    await request(`${INVENTORY_API}/inventory`, {
      method: 'POST',
      body: JSON.stringify({ sku, quantity: 100, warehouseCode: 'WH-TEST' }),
    });
    inv = await getInventory(sku);
  } else if (inv.quantity < minQty) {
    log('Setup', `Restocking inventory for ${sku}...`);
    await request(`${INVENTORY_API}/inventory/${sku}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ adjustmentType: 'restock', quantity: 100, reason: 'Test Restock' }),
    });
    inv = await getInventory(sku);
  }
  return inv!;
}

// Steps

async function stepLogin() {
  log('1/6', 'Logging in...');
  const data = await request<{ accessToken: string; refreshToken: string; expiresIn: number }>(
    `${AUTH_API}/auth/login`,
    { method: 'POST', body: JSON.stringify(TEST_USER) },
  );
  const jwt = decodeJwt(data.accessToken);
  log('1/6', `Logged in as ${jwt.email} (userId: ${jwt.sub})`);
  return { accessToken: data.accessToken, userId: jwt.sub, email: jwt.email };
}

async function stepFetchProduct() {
  log('2/6', 'Fetching product catalog...');
  const data = await request<{
    data: {
      id: string;
      name: string;
      basePriceInCents: number;
      currency: string;
      variants: { id: string; sku: string; name: string; priceInCents: number | null }[];
    }[];
  }>(`${PRODUCT_API}/products/list?limit=1`);

  const product = data.data[0];
  if (!product) throw new Error('No products found in catalog');

  const variant = product.variants[0];
  const price = variant.priceInCents ?? product.basePriceInCents;
  log('2/6', `Selected: ${product.name} / ${variant.name} (${variant.sku}) - ${price / 100} ${product.currency}`);
  return { product, variant, price };
}

async function stepAddToCart(
  userId: string,
  product: { id: string; name: string; currency: string },
  variant: { id: string; sku: string; name: string },
  price: number,
) {
  log('3/6', 'Adding item to cart...');

  // Get or create cart
  const cart = await request<{ id: string; items: unknown[] }>(`${CART_API}/cart`, {
    headers: { 'x-user-id': userId } as Record<string, string>,
  });
  log('3/6', `Cart ID: ${cart.id}`);

  // Add item
  const updated = await request<{ id: string; items: { id: string }[] }>(
    `${CART_API}/cart/${cart.id}/items`,
    {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        quantity: 1,
        priceInCents: price,
        currency: product.currency,
        productName: product.name,
        variantName: variant.name,
      }),
    },
  );
  log('3/6', `Item added - cart has ${updated.items.length} item(s)`);
  return updated;
}

async function stepCreateOrder(
  userId: string,
  email: string,
  product: { id: string; name: string; currency: string },
  variant: { id: string; sku: string; name: string },
  price: number,
) {
  log('4/6', 'Creating order...');
  const order = await request<{ id: string; status: string; totalInCents: number; currency: string }>(
    `${ORDER_API}/orders`,
    {
      method: 'POST',
      body: JSON.stringify({
        userId,
        email,
        items: [
          {
            productId: product.id,
            variantId: variant.id,
            sku: variant.sku,
            quantity: 1,
            unitPriceInCents: price,
            currency: product.currency,
            productName: product.name,
            variantName: variant.name,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          addressLine1: '123 Test Street',
          city: 'New Jersey',
          state: 'NJ',
          postalCode: '07001',
          country: 'US',
          phone: '+15551234567',
        },
      }),
    },
  );
  log('4/6', `Order ${order.id} created - status: ${order.status}, total: ${order.totalInCents / 100} ${order.currency}`);
  return order;
}

async function stepPay(
  accessToken: string,
  order: { id: string; totalInCents: number; currency: string },
) {
  log('5/6', 'Creating and confirming payment intent...');
  const pi = await request<{ id: string; status: string; clientSecret: string }>(
    `${PAYMENT_API}/payments`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        amount: order.totalInCents,
        currency: order.currency.toLowerCase(),
        metadata: { orderId: order.id },
        paymentMethod: 'pm_card_visa',
      }),
    },
  );
  log('5/6', `Payment intent ${pi.id} - status: ${pi.status}`);

  return pi;
}

async function stepVerifyOrder(orderId: string) {
  log('6/6', 'Polling order status...');
  const maxAttempts = 15;
  const intervalMs = 2000;

  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(intervalMs);
    const order = await request<{ id: string; status: string }>(`${ORDER_API}/orders/${orderId}`);
    log('6/6', `Attempt ${i}/${maxAttempts} - status: ${order.status}`);

    if (order.status === 'CONFIRMED') {
      log('6/6', 'Order is CONFIRMED!');
      return;
    }
  }
  throw new Error(`Order ${orderId} did not reach CONFIRMED within ${(maxAttempts * intervalMs) / 1000}s`);
}

// Main
async function main() {
  console.log(`=== E2E User Journey Test (${TEST_ENV.toUpperCase()}) ===\n`);

  const auth = await stepLogin();
  const { product, variant, price } = await stepFetchProduct();

  // Setup Inventory
  const initialInv = await ensureInventory(variant.sku);
  log('Info', `Initial Inventory: ${initialInv.quantity} (Reserved: ${initialInv.reserved})`);

  await stepAddToCart(auth.userId, product, variant, price);
  const order = await stepCreateOrder(auth.userId, auth.email, product, variant, price);
  
  // Verify Reservation
  const afterOrderInv = await getInventory(variant.sku);
  log('Info', `Inventory after Order: ${afterOrderInv!.quantity} (Reserved: ${afterOrderInv!.reserved})`);
  // Expect reserved to increase
  
  await stepPay(auth.accessToken, order);
  await stepVerifyOrder(order.id);

  // Verify Final Inventory Sync
  log('7/7', 'Verifying Inventory Sync...');
  const maxAttempts = 15;
  for (let i = 1; i <= maxAttempts; i++) {
    const finalInv = await getInventory(variant.sku);
    // Expect: Qty = Initial - 1, Reserved = Initial (reservation cleared)
    if (finalInv && finalInv.quantity === initialInv.quantity - 1 && finalInv.reserved === initialInv.reserved) {
       log('7/7', `Inventory Correct! Qty: ${finalInv.quantity}, Reserved: ${finalInv.reserved}`);
       console.log('\n=== ALL STEPS PASSED ===');
       return;
    }
    await sleep(2000);
    log('7/7', `Waiting for sync... Current: ${finalInv?.quantity} (Reserved: ${finalInv?.reserved})`);
  }
  throw new Error('Inventory sync failed: Stock did not update as expected.');
}

main().catch((err) => {
  console.error('\n=== TEST FAILED ===');
  console.error(err);
  process.exit(1);
});
