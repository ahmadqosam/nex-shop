import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { PrismaModule, PrismaService } from '../src/prisma';
import { CacheModule, CacheService, REDIS_CLIENT } from '../src/cache';
import { ProductsModule } from '../src/products';

describe('Products API (e2e) - Testcontainers', () => {
  let app: INestApplication;
  let pgContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let prisma: PrismaClient;
  let redis: Redis;

  const testProducts = [
    {
      name: 'Test Product 1',
      slug: 'test-product-1',
      category: 'Headphone',
      price: 299,
      description: 'Test description 1',
      tags: ['New'],
      colors: ['#000000'],
      images: ['/images/test-1.jpg'],
      specifications: { driver_size: '40mm' },
    },
    {
      name: 'Test Product 2',
      slug: 'test-product-2',
      category: 'Speaker',
      price: 499,
      description: 'Test description 2',
      tags: ['Best Seller'],
      colors: ['#FFFFFF'],
      images: ['/images/test-2.jpg'],
      specifications: { battery_life: '10 hours' },
    },
    {
      name: 'Another Headphone',
      slug: 'another-headphone',
      category: 'Headphone',
      price: 199,
      description: 'Another test product',
      tags: [],
      colors: ['#FF0000'],
      images: ['/images/test-3.jpg'],
      specifications: {},
    },
  ];

  const createdProductIds: string[] = [];

  beforeAll(async () => {
    // Start containers
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('product_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    redisContainer = await new RedisContainer('redis:7-alpine').start();

    // Set environment variables
    const databaseUrl = `postgresql://${pgContainer.getUsername()}:${pgContainer.getPassword()}@${pgContainer.getHost()}:${pgContainer.getPort()}/${pgContainer.getDatabase()}`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getPort().toString();
    process.env.REDIS_PASSWORD = '';
    process.env.CACHE_TTL = '60';
    process.env.NODE_ENV = 'test';

    // Initialize Prisma client for setup
    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    // Push schema to test database
    const { execSync } = require('child_process');
    execSync(`DATABASE_URL="${databaseUrl}" npx prisma db push --skip-generate`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    // Initialize Redis client
    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getPort(),
    });

    // Build the test module with proper imports
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [],
          ignoreEnvFile: true,
        }),
        PrismaModule,
        CacheModule,
        ProductsModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    // Seed test products
    for (const product of testProducts) {
      const created = await prisma.product.create({ data: product });
      createdProductIds.push(created.id);
    }
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await redis?.quit();
    await pgContainer?.stop();
    await redisContainer?.stop();
  }, 30000);

  describe('GET / (health check)', () => {
    it('should be accessible without auth (public)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('GET /products - Get Product List', () => {
    it('should return paginated products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
          expect(res.body.data.length).toBe(3);
          expect(res.body.meta.total).toBe(3);
        });
    });

    it('should respect pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/products?page=1&limit=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(2);
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(2);
          expect(res.body.meta.hasNext).toBe(true);
        });
    });

    it('should filter by category', () => {
      return request(app.getHttpServer())
        .get('/products?category=Headphone')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(2);
          expect(
            res.body.data.every((p: { category: string }) => p.category === 'Headphone'),
          ).toBe(true);
        });
    });

    it('should search by name', () => {
      return request(app.getHttpServer())
        .get('/products?search=Another')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].name).toBe('Another Headphone');
        });
    });

    it('should sort products by price ascending', () => {
      return request(app.getHttpServer())
        .get('/products?sortBy=price&sortOrder=asc')
        .expect(200)
        .expect((res) => {
          const prices = res.body.data.map((p: { price: number }) => p.price);
          expect(prices).toEqual([...prices].sort((a, b) => a - b));
        });
    });

    it('should use cache on second request', async () => {
      // First request - cache miss
      await request(app.getHttpServer()).get('/products?page=1&limit=5').expect(200);

      // Verify cache was set
      const cacheKey = 'products:list:{"page":1,"limit":5}';
      const cachedValue = await redis.get(cacheKey);
      expect(cachedValue).toBeTruthy();
    });
  });

  describe('GET /products/:id - Get Product By ID', () => {
    it('should return a single product', () => {
      return request(app.getHttpServer())
        .get(`/products/${createdProductIds[0]}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdProductIds[0]);
          expect(res.body.name).toBe('Test Product 1');
          expect(res.body.price).toBe(299);
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/products/550e8400-e29b-41d4-a716-446655440000')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should cache individual product', async () => {
      const productId = createdProductIds[1];

      // First request
      await request(app.getHttpServer()).get(`/products/${productId}`).expect(200);

      // Verify cache
      const cacheKey = `products:${productId}`;
      const cachedValue = await redis.get(cacheKey);
      expect(cachedValue).toBeTruthy();

      const parsed = JSON.parse(cachedValue!);
      expect(parsed.name).toBe('Test Product 2');
    });
  });

  describe('Validation', () => {
    it('should reject invalid page parameter', () => {
      return request(app.getHttpServer()).get('/products?page=0').expect(400);
    });

    it('should reject invalid limit parameter', () => {
      return request(app.getHttpServer()).get('/products?limit=200').expect(400);
    });
  });
});
