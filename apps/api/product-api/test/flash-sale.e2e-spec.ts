import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { PrismaClient } from '@prisma/product-client';
import Redis from 'ioredis';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { PrismaModule, PrismaService } from '../src/prisma';
import { CacheModule, REDIS_CLIENT } from '../src/cache';
import { ProductsModule } from '../src/products';
import { FlashSaleModule } from '../src/flash-sale';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule, JwtAuthGuard, Role, RolesGuard } from '../src/auth';

describe('Flash Sale API (e2e) - Testcontainers', () => {
  let app: INestApplication;
  let pgContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let prisma: PrismaClient;
  let redis: Redis;

  let adminToken: string;
  let userToken: string;

  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const RSA_PUBLIC_KEY_BASE64 = Buffer.from(keyPair.publicKey as string).toString(
    'base64',
  );

  const generateToken = (sub: string, email: string, roles: Role[]): string => {
    return jwt.sign(
      {
        sub,
        email,
        roles,
      },
      keyPair.privateKey as string,
      {
        algorithm: 'RS256',
        issuer: 'auth-api',
        expiresIn: '1h',
      },
    );
  };

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('product_test_flash_sale')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    redisContainer = await new RedisContainer('redis:7-alpine').start();

    const databaseUrl = `postgresql://${pgContainer.getUsername()}:${pgContainer.getPassword()}@${pgContainer.getHost()}:${pgContainer.getPort()}/${pgContainer.getDatabase()}`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getPort().toString();
    process.env.REDIS_PASSWORD = '';
    process.env.CACHE_TTL = '60';
    process.env.NODE_ENV = 'test';
    process.env.RSA_PUBLIC_KEY = RSA_PUBLIC_KEY_BASE64;

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    const { execSync } = require('child_process');
    execSync(`DATABASE_URL="${databaseUrl}" npx prisma db push --skip-generate`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getPort(),
    });

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
        FlashSaleModule,
        AuthModule,
      ],
      controllers: [AppController],
      providers: [
        AppService,
        PrismaService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
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

    adminToken = generateToken('admin-1', 'admin@example.com', [Role.ADMIN]);
    userToken = generateToken('user-1', 'user@example.com', [Role.USER]);

    const product = await prisma.product.create({
      data: {
        name: 'Flash Product',
        slug: 'flash-product',
        category: 'Headphone',
        basePriceInCents: 20000,
        currency: 'USD',
        description: 'Flash product desc',
        tags: [],
        images: ['/images/test-flash.jpg'],
        specifications: {},
        isAvailable: true,
      },
    });

    const sale = await prisma.flashSale.create({
      data: {
        name: 'Test Flash Sale',
        startTime: new Date(Date.now() - 60_000),
        endTime: new Date(Date.now() + 3_600_000),
        isActive: true,
      },
    });

    await prisma.flashSaleItem.create({
      data: {
        flashSaleId: sale.id,
        productId: product.id,
        salePriceInCents: 15000,
        maxQuantity: 1,
      },
    });
  }, 240000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    if (redis && redis.status !== 'end') {
      try {
        await redis.quit();
      } catch (err) {
        // Ignore "Connection is closed" during cleanup
      }
    }
    await pgContainer?.stop();
    await redisContainer?.stop();
  }, 60000);

  it('GET /flash-sales/active should list active flash sales', async () => {
    const res = await request(app.getHttpServer())
      .get('/flash-sales/active')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].items.length).toBeGreaterThan(0);
  });

  it('GET /flash-sales/eligibility/:id should require auth', async () => {
    const activeRes = await request(app.getHttpServer())
      .get('/flash-sales/active')
      .expect(200);
    const itemId = activeRes.body[0].items[0].id;

    await request(app.getHttpServer())
      .get(`/flash-sales/eligibility/${itemId}`)
      .expect(401);

    const authed = await request(app.getHttpServer())
      .get(`/flash-sales/eligibility/${itemId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(authed.body.eligible).toBe(true);
  });

  it('POST /flash-sales/purchase should allow one purchase and then reject duplicates', async () => {
    const activeRes = await request(app.getHttpServer())
      .get('/flash-sales/active')
      .expect(200);
    const itemId = activeRes.body[0].items[0].id;

    const first = await request(app.getHttpServer())
      .post('/flash-sales/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flashSaleItemId: itemId })
      .expect(201);

    expect(first.body.purchaseId).toBeDefined();

    const second = await request(app.getHttpServer())
      .post('/flash-sales/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flashSaleItemId: itemId })
      .expect(409);

    expect(second.body.message).toBeDefined();
  });
});


