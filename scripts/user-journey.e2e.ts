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

// Configuration
const AUTH_API = process.env.AUTH_API_URL || 'http://localhost:4001';
const PRODUCT_API = process.env.PRODUCT_API_URL || 'http://localhost:4002';
const CART_API = process.env.CART_API_URL || 'http://localhost:4004';
const ORDER_API = process.env.ORDER_API_URL || 'http://localhost:4005';
const PAYMENT_API = process.env.PAYMENT_API_URL || 'http://localhost:4006';

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
  }>(`${PRODUCT_API}/products?limit=1`);

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
  console.log('=== E2E User Journey Test ===\n');

  const auth = await stepLogin();
  const { product, variant, price } = await stepFetchProduct();
  await stepAddToCart(auth.userId, product, variant, price);
  const order = await stepCreateOrder(auth.userId, auth.email, product, variant, price);
  await stepPay(auth.accessToken, order);
  await stepVerifyOrder(order.id);

  console.log('\n=== ALL STEPS PASSED ===');
}

main().catch((err) => {
  console.error('\n=== TEST FAILED ===');
  console.error(err);
  process.exit(1);
});
