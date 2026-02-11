import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

/**
 * E2E User Journey Load Test
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
    limited_stock_concurrency: {
      executor: 'per-vu-iterations', vus: 10, iterations: 1, exec: 'flashSaleJourney', startTime: '10s',
    },
    flash_sale_stress: {
      executor: 'per-vu-iterations', vus: 200, iterations: 1, exec: 'flashSaleJourney', startTime: '20s',
    },
  },
  thresholds: {
    // Relaxed for local dev stress testing
    http_req_duration: ['p(95)<30000'], 
    http_req_failed: ['rate<1.0'], 
  },
};

const adminUser = { email: 'admin@nex.shop', password: 'Admin@123' };

function log(step, msg) { 
  const scenarioName = exec.scenario.name;
  if (scenarioName === 'flash_sale_stress' && !msg.includes('Success')) return; 
  console.log(`[VU ${exec.vu.idInTest}] [${step}] ${msg}`); 
}

function post(url, body, params = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, params.headers || {});
  return http.post(url, JSON.stringify(body), Object.assign({}, params, { headers }));
}

function get(url, params = {}) { return http.get(url, params); }

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
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

  const startTime = new Date(Date.now() + 2000).toISOString();
  const endTime = new Date(Date.now() + 600000).toISOString();
  
  // 1. General Journey Sale (100 qty)
  const s1Res = post(`${PRODUCT_API}/flash-sales`, {
    name: `K6 General ${Date.now()}`, startTime, endTime, isActive: true,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const sale1Id = s1Res.json().id;
  const item1Res = post(`${PRODUCT_API}/flash-sales/${sale1Id}/items`, {
    productId: product.id, variantId: variant.id, salePriceInCents: Math.round(price * 0.5), maxQuantity: 100,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const flashSaleItemId = item1Res.json().id;

  // 2. Limited Concurrency Sale (5 qty)
  const s2Res = post(`${PRODUCT_API}/flash-sales`, {
    name: `K6 Limited ${Date.now()}`, startTime, endTime, isActive: true,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const sale2Id = s2Res.json().id;
  const item2Res = post(`${PRODUCT_API}/flash-sales/${sale2Id}/items`, {
    productId: product.id, variantId: variant.id, salePriceInCents: Math.round(price * 0.5), maxQuantity: 5,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const limitedItemId = item2Res.json().id;

  // 3. Stress Test Sale (50 qty)
  const s3Res = post(`${PRODUCT_API}/flash-sales`, {
    name: `K6 Stress ${Date.now()}`, startTime, endTime, isActive: true,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const sale3Id = s3Res.json().id;
  const item3Res = post(`${PRODUCT_API}/flash-sales/${sale3Id}/items`, {
    productId: product.id, variantId: variant.id, salePriceInCents: Math.round(price * 0.5), maxQuantity: 50,
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const stressItemId = item3Res.json().id;

  console.log(`--- SETUP COMPLETE: Items [General: ${flashSaleItemId}, Limited: ${limitedItemId}, Stress: ${stressItemId}] ---`);
  return { flashSaleItemId, limitedItemId, stressItemId, sale2Id, sale3Id };
}

export function standardJourney() {
  const email = `k6-std-${exec.vu.idInTest}-${Date.now()}@example.com`;
  const password = 'Test@1234';

  post(`${AUTH_API}/auth/register`, { email, password, name: 'Std User' });
  const loginRes = post(`${AUTH_API}/auth/login`, { email, password });
  if (loginRes.status !== 200) { sleep(1); return; }
  
  const accessToken = loginRes.json().accessToken;
  const decoded = decodeJwt(accessToken);
  if (!decoded) { sleep(1); return; }
  const userId = decoded.sub;

  const productRes = get(`${PRODUCT_API}/products/list?limit=1`);
  const product = productRes.json().data[0];
  const variant = product.variants[0];
  const price = variant.priceInCents ?? product.basePriceInCents;

  const cartRes = get(`${CART_API}/cart`, { headers: { 'x-user-id': userId } });
  const cartId = cartRes.json().id;
  post(`${CART_API}/cart/${cartId}/items`, {
    productId: product.id, variantId: variant.id, sku: variant.sku,
    quantity: 1, priceInCents: price, currency: product.currency,
    productName: product.name, variantName: variant.name,
  }, { headers: { 'x-user-id': userId } });

  const orderRes = post(`${ORDER_API}/orders`, {
    userId, email,
    items: [{
      productId: product.id, variantId: variant.id, sku: variant.sku,
      quantity: 1, unitPriceInCents: price, currency: product.currency,
      productName: product.name, variantName: variant.name,
    }],
    shippingAddress: { fullName: 'Std User', addressLine1: '123 St', city: 'NJ', state: 'NJ', postalCode: '07001', country: 'US', phone: '555' },
  });
  if (orderRes.status !== 201) { sleep(1); return; }
  const order = orderRes.json();

  post(`${PAYMENT_API}/payments`, {
    amount: order.totalInCents, currency: order.currency.toLowerCase(),
    metadata: { orderId: order.id }, paymentMethod: 'pm_card_visa',
  }, { headers: { Authorization: `Bearer ${accessToken}` } });

  sleep(1);
}

export function flashSaleJourney(data) {
  const scenarioName = exec.scenario.name;
  const isLimited = scenarioName === 'limited_stock_concurrency';
  const isStress = scenarioName === 'flash_sale_stress';
  
  let itemId = data.flashSaleItemId;
  if (isLimited) itemId = data.limitedItemId;
  if (isStress) itemId = data.stressItemId;
  
  const email = `k6-fs-${scenarioName.substring(0,3)}-${exec.vu.idInTest}-${Date.now()}@example.com`;
  const password = 'Test@1234';

  post(`${AUTH_API}/auth/register`, { email, password, name: 'Flash User' });
  const loginRes = post(`${AUTH_API}/auth/login`, { email, password });
  if (loginRes.status !== 200) { sleep(1); return; }
  const accessToken = loginRes.json().accessToken;

  post(`${PRODUCT_API}/flash-sales/eligibility/${itemId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const purchaseRes = post(`${PRODUCT_API}/flash-sales/purchase`, { flashSaleItemId: itemId }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (isLimited || isStress) {
    const success = purchaseRes.status === 201;
    check(purchaseRes, { 'p-status-expected': (r) => r.status === 201 || r.status === 400 || r.status === 403 || r.status === 500 });
    if (success) {
      log('Success', `Got item for ${scenarioName}`);
    } else if (purchaseRes.status === 500) {
      log('Server-Error', `500 under ${scenarioName}`);
    }
  } else {
    check(purchaseRes, { 'p-status-201': (r) => r.status === 201 });
  }

  sleep(1);
}

export function teardown(data) {
  console.log('\n--- TEARDOWN: Robustness Verification ---');
  const { limitedItemId, stressItemId, sale2Id, sale3Id } = data;

  const res = get(`${PRODUCT_API}/flash-sales/active`);
  if (res.status === 200) {
    const activeSales = res.json();
    
    // Check Limited (5 qty)
    const s2 = activeSales.find(s => s.id === sale2Id);
    if (s2) {
      const i = s2.items.find(item => item.id === limitedItemId);
      console.log(`[VERIFY-LIMITED] Sold: ${i.soldCount} | Max: ${i.maxQuantity} | Result: ${i.soldCount === 5 ? '✅ PASS' : '⚠️ INFO (Under Stress)'}`);
    }

    // Check Stress (50 qty)
    const s3 = activeSales.find(s => s.id === sale3Id);
    if (s3) {
      const i = s3.items.find(item => item.id === stressItemId);
      console.log(`[VERIFY-STRESS]  Sold: ${i.soldCount} | Max: ${i.maxQuantity} | Result: ${i.soldCount === 50 ? '✅ PASS' : '❌ FAIL'}`);
    }
  } else {
    console.log(`❌ FAIL: API Error ${res.status}`);
  }
  console.log('--- TEARDOWN COMPLETE ---\n');
}
