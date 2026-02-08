import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Inventory API (e2e)', () => {
  let app: INestApplication;
  const testSku = `TEST-SKU-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer()).get('/').expect(200).expect('OK');
    });
  });

  describe('Inventory Operations', () => {
    it('POST /inventory - Create inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .send({
          sku: testSku,
          quantity: 100,
          lowStockThreshold: 10,
          warehouseCode: 'TEST-WH',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.sku).toBe(testSku);
      expect(response.body.quantity).toBe(100);
      expect(response.body.reserved).toBe(0);
    });

    it('GET /inventory - List inventory', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      const created = response.body.data.find((i: any) => i.sku === testSku);
      expect(created).toBeDefined();
    });

    it('GET /inventory/:sku - Get by SKU', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/${testSku}`)
        .expect(200);

      expect(response.body.sku).toBe(testSku);
      expect(response.body.quantity).toBe(100);
    });

    it('PATCH /inventory/:sku/adjust - Adjust stock (Restock)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/inventory/${testSku}/adjust`)
        .send({
          adjustmentType: 'restock',
          quantity: 50,
          reason: 'Test restock',
        })
        .expect(200);

      expect(response.body.quantity).toBe(150); // 100 + 50
    });

    it('PATCH /inventory/:sku/adjust - Adjust stock (Sale)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/inventory/${testSku}/adjust`)
        .send({
          adjustmentType: 'sale',
          quantity: -10,
          reason: 'Test sale',
        })
        .expect(200);

      expect(response.body.quantity).toBe(140); // 150 - 10
    });

    it('POST /inventory/:sku/reserve - Reserve stock', async () => {
      const response = await request(app.getHttpServer())
        .post(`/inventory/${testSku}/reserve`)
        .send({
          quantity: 5,
        })
        .expect(201);

      expect(response.body.reserved).toBe(5);
      expect(response.body.quantity).toBe(140); // Quantity unchanged
    });

    it('POST /inventory/:sku/release - Release stock', async () => {
      const response = await request(app.getHttpServer())
        .post(`/inventory/${testSku}/release`)
        .send({
          quantity: 2,
        })
        .expect(201);

      expect(response.body.reserved).toBe(3); // 5 - 2
    });

    it('Should fail reservation if insufficient stock', async () => {
      await request(app.getHttpServer())
        .post(`/inventory/${testSku}/reserve`)
        .send({
          quantity: 200, // Available is 140 - 3 = 137
        })
        .expect(400);
    });
  });
});
