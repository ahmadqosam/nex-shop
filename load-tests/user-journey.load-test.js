import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

/**
 * E2E User Journey Load Test
 * 
 * Features:
 * - Standard User Journey (Browse -> Cart -> Order -> Pay)
 * - Flash Sale Journey (setup() by Admin -> Purchase as User)
 * - Automatic Test User Registration
 * - Throttler-friendly (requires increased limit in auth-api)
 */

const TEST_ENV = __ENV.TEST_ENV || 'dev';
const CONFIGS = {
  dev: {
    auth: 'http://localhost:4001', product: 'http://localhost:4002',
    inventory: 'http://localhost:4003', cart: 'http://localhost:4004',
    order: 'http://localhost:4005', payment: 'http://localhost:4006',
  },
  localstack: {
    auth: 'http://localhost:4566/restapis/nex-gw/local/_user_request_/auth-svc',
    product: 'http://localhost:4566/restapis/nex-gw/local/_user_request_/product-svc',
    inventory: 'http://localhost:4566/restapis/nex-gw/local/_user_request_/inventory-svc',
    cart: 'http://localhost:4566/restapis/nex-gw/local/_user_request_/cart-svc',
    order: 'http://localhost:4566/restapis/nex-gw/local/_user_request_/order-svc',
    payment: 'http://localhost:4566/restapis/nex-gw/local/_user_request_/payment-svc',
  },
};

const activeConfig = TEST_ENV === 'localstack' ? CONFIGS.localstack : CONFIGS.dev;

const AUTH_API = __ENV.AUTH_API_URL || activeConfig.auth;
const PRODUCT_API = __ENV.PRODUCT_API_URL || activeConfig.product;
const CART_API = __ENV.CART_API_URL || activeConfig.cart;
const ORDER_API = __ENV.ORDER_API_URL || activeConfig.order;
const PAYMENT_API = __ENV.PAYMENT_API_URL || activeConfig.payment;

export const options = {
  scenarios: {
    standard_journey: {
      executor: 'constant-vus', vus: 1, duration: '10s', exec: 'standardJourney',
    },
    flash_sale_journey: {
      executor: 'per-vu-iterations', vus: 1, iterations: 1, exec: 'flashSaleJourney', startTime: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

const adminUser = { email: 'admin@nex.shop', password: 'Admin@123' };

function log(step, msg) { console.log(`[VU ${__VU}] [${step}] ${msg}`); }

function post(url, body, params = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, params.headers || {});
  return http.post(url, JSON.stringify(body), Object.assign({}, params, { headers }));
}

function get(url, params = {}) { return http.get(url, params); }

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) { return null; }
}

export function setup() {
  console.log('--- SETUP: Admin Flash Sale Configuration ---');
  const loginRes = post(`${AUTH_API}/auth/login`, adminUser);
  if (loginRes.status !== 200) throw new Error(`Admin login failed: ${loginRes.status}`);
  const adminToken = loginRes.json().accessToken;

  const prodRes = get(`${PRODUCT_API}/products/list?limit=1`);
  const products = prodRes.json().data;
  if (!products || products.length === 0) throw new Error('No products found');
  const product = products[0];
  const variant = product.variants[0];
  const price = variant.priceInCents ?? product.basePriceInCents;

  const startTime = new Date(Date.now() + 5000).toISOString();
  const endTime = new Date(Date.now() + 600000).toISOString();
  
  const saleRes = post(`${PRODUCT_API}/flash-sales`, {
    name: `K6 Load Test Sale ${Date.now()}`,
    startTime, endTime, isActive: true,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  
  if (saleRes.status !== 201) throw new Error(`Failed to create sale: ${saleRes.status}`);
  const saleId = saleRes.json().id;

  const itemRes = post(`${PRODUCT_API}/flash-sales/${saleId}/items`, {
    productId: product.id, variantId: variant.id, salePriceInCents: Math.round(price * 0.5), maxQuantity: 100,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });

  if (itemRes.status !== 201) throw new Error('Failed to add flash item');
  const flashSaleItemId = itemRes.json().id;

  console.log(`--- SETUP COMPLETE: Flash Sale ${saleId}, Item ${flashSaleItemId} ---`);
  return { flashSaleItemId };
}

export function standardJourney() {
  const email = `k6-std-${__VU}-${Date.now()}@example.com`;
  const password = 'Test@1234';

  // 1. Auth
  const regRes = post(`${AUTH_API}/auth/register`, { email, password, name: 'Std User' });
  const loginRes = post(`${AUTH_API}/auth/login`, { email, password });
  if (!check(loginRes, { 'std login successful': (r) => r.status === 200 })) {
    log('Error', `Login failed: ${loginRes.status}`);
    sleep(1); return;
  }
  const accessToken = loginRes.json().accessToken;
  const userId = decodeJwt(accessToken).sub;

  // 2. Product
  const productRes = get(`${PRODUCT_API}/products/list?limit=1`);
  if (!check(productRes, { 'browsing catalog': (r) => r.status === 200 })) { sleep(1); return; }
  const product = productRes.json().data[0];
  const variant = product.variants[0];
  const price = variant.priceInCents ?? product.basePriceInCents;

  // 3. Cart
  const cartRes = get(`${CART_API}/cart`, { headers: { 'x-user-id': userId } });
  const cartId = cartRes.json().id;
  const cartUpdateRes = post(`${CART_API}/cart/${cartId}/items`, {
    productId: product.id, variantId: variant.id, sku: variant.sku,
    quantity: 1, priceInCents: price, currency: product.currency,
    productName: product.name, variantName: variant.name,
  }, { headers: { 'x-user-id': userId } });
  check(cartUpdateRes, { 'cart item added': (r) => r.status === 200 || r.status === 201 });

  // 4. Order
  const orderRes = post(`${ORDER_API}/orders`, {
    userId, email,
    items: [{
      productId: product.id, variantId: variant.id, sku: variant.sku,
      quantity: 1, unitPriceInCents: price, currency: product.currency,
      productName: product.name, variantName: variant.name,
    }],
    shippingAddress: { fullName: 'Std User', addressLine1: '123 St', city: 'NJ', state: 'NJ', postalCode: '07001', country: 'US', phone: '555' },
  });
  if (!check(orderRes, { 'order created': (r) => r.status === 201 })) { sleep(1); return; }
  const order = orderRes.json();

  // 5. Payment
  const payRes = post(`${PAYMENT_API}/payments`, {
    amount: order.totalInCents, currency: order.currency.toLowerCase(),
    metadata: { orderId: order.id }, paymentMethod: 'pm_card_visa',
  }, { headers: { Authorization: `Bearer ${accessToken}` } });
  check(payRes, { 'payment processed': (r) => r.status === 200 || r.status === 201 });

  sleep(1);
}

export function flashSaleJourney(data) {
  const { flashSaleItemId } = data;
  const email = `k6-flash-${__VU}-${Date.now()}@example.com`;
  const password = 'Test@1234';

  log('Flash-1/4', `Auth: ${email}`);
  post(`${AUTH_API}/auth/register`, { email, password, name: 'Flash User' });
  const loginRes = post(`${AUTH_API}/auth/login`, { email, password });
  if (!check(loginRes, { 'flash login 200': (r) => r.status === 200 })) { sleep(1); return; }
  const accessToken = loginRes.json().accessToken;

  log('Flash-2/4', 'Checking Eligibility...');
  const eligRes = get(`${PRODUCT_API}/flash-sales/eligibility/${flashSaleItemId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!check(eligRes, { 'is eligible': (r) => r.json().eligible === true })) { sleep(1); return; }

  log('Flash-3/4', 'Purchasing...');
  const purchaseRes = post(`${PRODUCT_API}/flash-sales/purchase`, { flashSaleItemId }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  check(purchaseRes, { 'flash purchase success': (r) => r.status === 201 || r.status === 200 });

  log('Flash-4/4', 'Verifying Sale Stock...');
  get(`${PRODUCT_API}/flash-sales/active`);

  sleep(1);
}
