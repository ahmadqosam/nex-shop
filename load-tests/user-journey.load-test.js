import http from 'k6/http';
import { check, sleep } from 'k6';

const TEST_ENV = __ENV.TEST_ENV || 'dev';
const LOCALSTACK_BASE = 'http://localhost:4566/restapis/nex-gw/local/_user_request_';

const CONFIGS = {
  dev: {
    auth: 'http://localhost:4001', product: 'http://localhost:4002',
    inventory: 'http://localhost:4003', cart: 'http://localhost:4004',
    order: 'http://localhost:4005', payment: 'http://localhost:4006',
  },
  localstack: {
    auth: `${LOCALSTACK_BASE}/auth-svc`, product: `${LOCALSTACK_BASE}/product-svc`,
    inventory: `${LOCALSTACK_BASE}/inventory-svc`, cart: `${LOCALSTACK_BASE}/cart-svc`,
    order: `${LOCALSTACK_BASE}/order-svc`, payment: `${LOCALSTACK_BASE}/payment-svc`,
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
      executor: 'per-vu-iterations',
      vus: 1, iterations: 1,
      exec: 'standardJourney',
    },
  },
};

function log(step, msg) { console.log(`[VU ${__VU}] [${step}] ${msg}`); }

function post(url, body, params = {}) {
  return http.post(url, JSON.stringify(body), Object.assign({ headers: { 'Content-Type': 'application/json' } }, params));
}

function get(url, params = {}) { return http.get(url, params); }

function decodeJwt(token) {
    try {
        const parts = token.split('.');
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) { return null; }
}

export function standardJourney() {
  // Use a unique email for this verification to ensure we don't hit exist/auth issues
  const testUser = { email: `k6-test-${Date.now()}@example.com`, password: 'Test@1234', name: 'K6 User' };

  log('1/6', `Registering ${testUser.email}...`);
  const regRes = post(`${AUTH_API}/auth/register`, testUser);
  check(regRes, { 'registered or exists': (r) => r.status === 201 || r.status === 409 });

  log('1/6', `Logging in...`);
  const loginRes = post(`${AUTH_API}/auth/login`, { email: testUser.email, password: testUser.password });
  if (!check(loginRes, { 'login status 200': (r) => r.status === 200 })) {
    log('Error', `Auth failed: ${loginRes.status} ${loginRes.body}`);
    return;
  }

  const accessToken = loginRes.json().accessToken;
  const userId = decodeJwt(accessToken).sub;

  // 2. Product
  log('2/6', 'Product...');
  const productRes = get(`${PRODUCT_API}/products/list?limit=1`);
  const product = productRes.json().data[0];
  const variant = product.variants[0];
  const price = variant.priceInCents ?? product.basePriceInCents;

  // 3. Cart
  log('3/6', `Cart...`);
  const cartRes = get(`${CART_API}/cart`, { headers: { 'x-user-id': userId } });
  const cartId = cartRes.json().id;
  const addToCartRes = post(`${CART_API}/cart/${cartId}/items`, {
    productId: product.id, variantId: variant.id, sku: variant.sku,
    quantity: 1, priceInCents: price, currency: product.currency,
    productName: product.name, variantName: variant.name,
  }, { headers: { 'x-user-id': userId } });
  check(addToCartRes, { 'cart updated': (r) => r.status === 200 || r.status === 201 });

  // 4. Order
  log('4/6', 'Order...');
  const orderRes = post(`${ORDER_API}/orders`, {
    userId: userId, email: testUser.email,
    items: [{
      productId: product.id, variantId: variant.id, sku: variant.sku,
      quantity: 1, unitPriceInCents: price, currency: product.currency,
      productName: product.name, variantName: variant.name,
    }],
    shippingAddress: {
      fullName: 'K6 User', addressLine1: '123 Test St', city: 'NJ',
      state: 'NJ', postalCode: '07001', country: 'US', phone: '555-1234',
    },
  });
  if (!check(orderRes, { 'order success': (r) => r.status === 201 })) {
    log('Error', `Order failed: ${orderRes.status} ${orderRes.body}`);
    return;
  }
  const order = orderRes.json();

  // 5. Pay
  log('5/6', 'Pay...');
  const paymentRes = post(`${PAYMENT_API}/payments`, {
    amount: order.totalInCents, currency: order.currency.toLowerCase(),
    metadata: { orderId: order.id }, paymentMethod: 'pm_card_visa',
  }, { headers: { Authorization: `Bearer ${accessToken}` } });
  check(paymentRes, { 'payment success': (r) => r.status === 201 || r.status === 200 });

  // 6. Verify
  log('6/6', `Verify ${order.id}`);
  const verifyRes = get(`${ORDER_API}/orders/${order.id}`);
  check(verifyRes, { 'order checked': (r) => r.status === 200 });

  log('Success', 'Journey completed!');
}
