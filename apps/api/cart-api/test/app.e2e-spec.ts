import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';

describe('Cart API (e2e)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('cart_api_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Start Redis container
    redisContainer = await new RedisContainer('redis:7-alpine').start();

    // Set environment variables
    process.env.DATABASE_URL = postgresContainer.getConnectionUri();
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getPort().toString();
    process.env.REDIS_PASSWORD = '';
    process.env.CACHE_TTL = '300';
    process.env.PORT = '4099';
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    // Run Prisma migrations
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: postgresContainer.getConnectionUri() },
      cwd: process.cwd(),
    });

    const mockHttpService = {
      get: () => of({
        data: { quantity: 100 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .compile();


    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 120000); // 2 min timeout for container startup

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('Health Check', () => {
    it('/ (GET) should return OK', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('OK');
    });
  });

  describe('Cart Operations', () => {
    let cartId: string;
    let itemId: string;

    const addItemDto = {
      productId: 'prod-test-123',
      variantId: 'var-test-123',
      sku: 'TEST-SKU-001',
      quantity: 2,
      priceInCents: 4999,
      productName: 'Test Widget',
      variantName: 'Blue',
      imageUrl: 'https://example.com/widget.jpg',
    };

    it('GET /cart should create a new cart for session', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('x-session-id', 'test-session-123')
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.sessionId).toBe('test-session-123');
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.items).toEqual([]);

      cartId = response.body.id;
    });

    it('GET /cart should return existing cart for same session', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('x-session-id', 'test-session-123')
        .expect(200);

      expect(response.body.id).toBe(cartId);
    });

    it('POST /cart/:cartId/items should add item to cart', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send(addItemDto)
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].sku).toBe('TEST-SKU-001');
      expect(response.body.items[0].quantity).toBe(2);

      itemId = response.body.items[0].id;
    });

    it('POST /cart/:cartId/items should increment quantity for existing item', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ ...addItemDto, quantity: 3 })
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(5); // 2 + 3
    });

    it('GET /cart/:cartId should return cart with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cart/${cartId}`)
        .expect(200);

      expect(response.body.id).toBe(cartId);
      expect(response.body.items).toHaveLength(1);
    });

    it('GET /cart/:cartId/summary should return totals', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cart/${cartId}/summary`)
        .expect(200);

      expect(response.body.cartId).toBe(cartId);
      expect(response.body.itemCount).toBe(5);
      expect(response.body.subtotalInCents).toBe(24995); // 5 * 4999
    });

    it('PUT /cart/:cartId/items/:itemId should update quantity', async () => {
      const response = await request(app.getHttpServer())
        .put(`/cart/${cartId}/items/${itemId}`)
        .send({ quantity: 10 })
        .expect(200);

      expect(response.body.items[0].quantity).toBe(10);
    });

    it('DELETE /cart/:cartId/items/:itemId should remove item', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/cart/${cartId}/items/${itemId}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
    });

    it('POST /cart/:cartId/items and DELETE /cart/:cartId should clear cart', async () => {
      // Add item first
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send(addItemDto)
        .expect(201);

      // Clear cart
      const response = await request(app.getHttpServer())
        .delete(`/cart/${cartId}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
    });
  });

  describe('Cart Merge', () => {
    let guestCartId: string;
    let userCartId: string;

    it('should merge guest cart into user cart', async () => {
      // Create guest cart with item
      const guestResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('x-session-id', 'guest-merge-session')
        .expect(200);

      guestCartId = guestResponse.body.id;

      await request(app.getHttpServer())
        .post(`/cart/${guestCartId}/items`)
        .send({
          productId: 'prod-merge-1',
          variantId: 'var-merge-1',
          sku: 'MERGE-SKU-001',
          quantity: 3,
          priceInCents: 1999,
          productName: 'Merge Product',
          variantName: 'Red',
        })
        .expect(201);

      // Create user cart
      const userResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('x-user-id', 'merge-user-123')
        .expect(200);

      userCartId = userResponse.body.id;

      // Merge carts
      const mergeResponse = await request(app.getHttpServer())
        .post('/cart/merge')
        .query({ sessionId: 'guest-merge-session', userId: 'merge-user-123' })
        .expect(201);

      expect(mergeResponse.body.id).toBe(userCartId);
      expect(mergeResponse.body.items).toHaveLength(1);
      expect(mergeResponse.body.items[0].sku).toBe('MERGE-SKU-001');
    });
  });

  describe('Validation', () => {
    it('GET /cart should fail without userId or sessionId', async () => {
      return request(app.getHttpServer())
        .get('/cart')
        .expect(400);
    });

    it('POST /cart/:cartId/items should fail with invalid data', async () => {
      const guestResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('x-session-id', 'validation-session')
        .expect(200);

      return request(app.getHttpServer())
        .post(`/cart/${guestResponse.body.id}/items`)
        .send({ quantity: -1 }) // Invalid: missing fields, negative quantity
        .expect(400);
    });

    it('PUT /cart/:cartId/items/:itemId should fail with negative quantity', async () => {
      return request(app.getHttpServer())
        .put('/cart/random-id/items/random-item')
        .send({ quantity: -5 })
        .expect(400);
    });
  });

  describe('Cart Conversion', () => {
    it('should convert cart to CONVERTED status', async () => {
      // Create user cart
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('x-user-id', 'convert-user-123')
        .expect(200);

      const cartId = cartResponse.body.id;

      // Add item
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({
          productId: 'prod-convert',
          variantId: 'var-convert',
          sku: 'CONVERT-SKU',
          quantity: 1,
          priceInCents: 1000,
          productName: 'Convert Product',
          variantName: 'Standard',
        })
        .expect(201);

      // Convert cart
      const convertResponse = await request(app.getHttpServer())
        .post(`/cart/${cartId}/convert`)
        .expect(201);

      expect(convertResponse.body.status).toBe('CONVERTED');

      // Verify cart cannot be modified after conversion
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({
          productId: 'prod-convert-2',
          variantId: 'var-convert-2',
          sku: 'CONVERT-SKU-2',
          quantity: 1,
          priceInCents: 1000,
          productName: 'Product 2',
          variantName: 'Standard',
        })
        .expect(400); // Should fail as cart is not ACTIVE
    });
  });
});
