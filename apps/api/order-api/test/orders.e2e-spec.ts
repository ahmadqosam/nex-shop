import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';
import { OrderEventsService } from '../src/orders/order-events.service';
import { OrderStatus } from '@prisma/order-api-client';

describe('Order API (e2e)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let orderEventsService: OrderEventsService;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('order_api_test')
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
    process.env.PORT = '4098'; // Different port than cart-api test if running in parallel
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.CART_API_URL = 'http://mock-cart-api';
    process.env.INVENTORY_API_URL = 'http://mock-inventory-api';

    // Run Prisma migrations
    execSync('npx prisma db push --skip-generate', {
      env: {
        ...process.env,
        DATABASE_URL: postgresContainer.getConnectionUri(),
      },
      cwd: process.cwd(),
      stdio: 'inherit', // see error output if validation fails
    });

    const validUserId = '123e4567-e89b-12d3-a456-426614174000';
    const validCartId = '123e4567-e89b-12d3-a456-426614174001';
    const validProductId = '123e4567-e89b-12d3-a456-426614174002';
    const validVariantId = '123e4567-e89b-12d3-a456-426614174003';

    const mockHttpService = {
      get: (url: string) => {
        if (url.includes('/cart/')) {
          // Mock Fetch Cart
          return of({
            data: {
              id: validCartId,
              status: 'ACTIVE',
              items: [
                {
                  productId: validProductId,
                  variantId: validVariantId,
                  sku: 'SKU-123',
                  quantity: 1,
                  priceInCents: 1000,
                  currency: 'USD',
                  productName: 'Test Product',
                  variantName: 'Test Variant',
                },
              ],
            },
            status: 200,
            statusText: 'OK',
          });
        }
        return of({ data: {}, status: 200 });
      },
      post: (url: string) => {
        // Mock Convert Cart & Reserve/Release Inventory
        return of({
          data: {},
          status: 200,
          statusText: 'OK',
        });
      },
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

    orderEventsService = app.get<OrderEventsService>(OrderEventsService);
  }, 120000);

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('Order Flow', () => {
    let orderId: string;
    const validUserId = '123e4567-e89b-12d3-a456-426614174000';
    const validCartId = '123e4567-e89b-12d3-a456-426614174001';

    it('POST /orders should create an order from cart', async () => {
      const createOrderDto = {
        cartId: validCartId,
        userId: validUserId,
        email: 'test@example.com',
        shippingAddress: {
          fullName: 'Test User',
          addressLine1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(OrderStatus.PENDING);
      expect(response.body.items).toHaveLength(1);
      orderId = response.body.id;
    });

    it('GET /orders/:id should return the order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.status).toBe(OrderStatus.PENDING);
    });

    it('should update order status to CONFIRMED on payment success event', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_test_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { orderId },
      };

      await orderEventsService.handlePaymentSuccess(event);

      // Verify update
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CONFIRMED);
    });
  });
});
