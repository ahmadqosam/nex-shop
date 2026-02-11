import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Product API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.RSA_PUBLIC_KEY = Buffer.from(
      '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAMPPntYOR5X8u5Y/lXbORm9IFflvlh+tWILvZ7Ss9cVfhHfor9b2ZBXUoxDOYCcEeFZrvbM7ql/h3OcuCniLm8CAwEAAQ==\n-----END PUBLIC KEY-----',
    ).toString('base64');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  describe('Health Check', () => {
    it('GET / - should return Hello World', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('GET /products - Get Product List', () => {
    it('should return paginated product list with variants', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Products should include variants
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('variants');
        expect(Array.isArray(response.body.data[0].variants)).toBe(true);
      }
    });

    it('should return products with pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should filter products by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ category: 'Headphone' })
        .expect(200);

      response.body.data.forEach((product: { category: string }) => {
        expect(product.category).toBe('Headphone');
      });
    });

    it('should search products by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ search: 'Nex' })
        .expect(200);

      response.body.data.forEach((product: { name: string }) => {
        expect(product.name.toLowerCase()).toContain('nex');
      });
    });

    it('should sort products by basePriceInCents ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ sortBy: 'basePriceInCents', sortOrder: 'asc' })
        .expect(200);

      const prices = response.body.data.map((p: { basePriceInCents: number }) => p.basePriceInCents);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('should validate page parameter (must be >= 1)', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 0 })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate limit parameter (must be <= 100)', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ limit: 200 })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return product with all expected fields including variants', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ limit: 1 })
        .expect(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        // Core fields
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('slug');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('basePriceInCents');
        expect(product).toHaveProperty('currency');
        expect(product).toHaveProperty('isAvailable');
        expect(product).toHaveProperty('variants');

        // Variant structure
        if (product.variants.length > 0) {
          const variant = product.variants[0];
          expect(variant).toHaveProperty('id');
          expect(variant).toHaveProperty('sku');
          expect(variant).toHaveProperty('name');
          expect(variant).toHaveProperty('priceInCents');
          expect(variant).toHaveProperty('attributes');
        }
      }
    });
  });

  describe('GET /products/:id - Get Product By ID', () => {
    let existingProductId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ limit: 1 });

      if (response.body.data.length > 0) {
        existingProductId = response.body.data[0].id;
      }
    });

    it('should return a single product with variants by ID', async () => {
      if (!existingProductId) {
        console.warn('No products found to test. Skipping...');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/products/${existingProductId}`)
        .expect(200);

      expect(response.body.id).toBe(existingProductId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('slug');
      expect(response.body).toHaveProperty('basePriceInCents');
      expect(response.body).toHaveProperty('variants');
      expect(Array.isArray(response.body.variants)).toBe(true);
    });

    it('should return product with correct data types', async () => {
      if (!existingProductId) {
        console.warn('No products found to test. Skipping...');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/products/${existingProductId}`)
        .expect(200);

      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.basePriceInCents).toBe('number');
      expect(typeof response.body.isAvailable).toBe('boolean');
      expect(Array.isArray(response.body.variants)).toBe(true);

      // Check variant types
      if (response.body.variants.length > 0) {
        const variant = response.body.variants[0];
        expect(typeof variant.sku).toBe('string');
        expect(typeof variant.name).toBe('string');
      }
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/products/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
      expect(response.body.statusCode).toBe(404);
    });

    it('should return 404 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';

      const response = await request(app.getHttpServer())
        .get(`/products/${invalidId}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });
});
