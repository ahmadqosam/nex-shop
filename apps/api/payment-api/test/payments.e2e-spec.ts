/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, HttpAdapterHost } from '@nestjs/core';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import {
  SNSClient,
  CreateTopicCommand,
} from '@aws-sdk/client-sns';
import Stripe from 'stripe';

import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PaymentsModule } from '../src/payments/payments.module';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let localstripeContainer: StartedTestContainer;
  let localstackContainer: StartedTestContainer;
  let localstripeUrl: string;
  let snsEndpoint: string;
  let topicArn: string;

  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const base64Public = Buffer.from(keyPair.publicKey as string).toString(
    'base64',
  );

  const signToken = (payload: object) =>
    jwt.sign(payload, keyPair.privateKey as string, {
      algorithm: 'RS256',
      issuer: 'auth-api',
      expiresIn: '1h',
    });

  beforeAll(async () => {
    // Start Localstripe
    localstripeContainer = await new GenericContainer(
      'adrienverge/localstripe:latest',
    )
      .withExposedPorts(8420)
      .start();

    const localstripePort = localstripeContainer.getMappedPort(8420);
    const localstripeHost = localstripeContainer.getHost();
    localstripeUrl = `http://${localstripeHost}:${localstripePort}`;

    // Start LocalStack for SNS
    localstackContainer = await new GenericContainer(
      'localstack/localstack:latest',
    )
      .withExposedPorts(4566)
      .withEnvironment({ SERVICES: 'sns' })
      .withWaitStrategy(Wait.forLogMessage('Ready.'))
      .start();

    const localstackPort = localstackContainer.getMappedPort(4566);
    const localstackHost = localstackContainer.getHost();
    snsEndpoint = `http://${localstackHost}:${localstackPort}`;

    // Configure SNS Topic
    const snsClient = new SNSClient({
      endpoint: snsEndpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    const createTopicCmd = new CreateTopicCommand({ Name: 'payment-events' });
    const createTopicRes = await snsClient.send(createTopicCmd);
    topicArn = createTopicRes.TopicArn!;

    // Set Environment Variables
    process.env.RSA_PUBLIC_KEY = base64Public;
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.STRIPE_API_URL = localstripeUrl;
    process.env.SNS_ENDPOINT = snsEndpoint;
    process.env.AWS_REGION = 'us-east-1';
    process.env.SNS_TOPIC_ARN = topicArn;
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        AuthModule,
        PaymentsModule,
      ],
      controllers: [AppController],
      providers: [
        AppService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    await app.init();
  }, 180000); // Increased timeout for container startup

  afterAll(async () => {
    await app?.close();
    await localstripeContainer?.stop();
    await localstackContainer?.stop();
  }, 60000);

  describe('GET / (health check)', () => {
    it('should be public and return OK', () => {
      return request(app.getHttpServer()).get('/').expect(200).expect('OK');
    });
  });

  describe('POST /payments', () => {
    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .send({ amount: 2000, currency: 'usd' })
        .expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', 'Bearer invalid-token')
        .send({ amount: 2000, currency: 'usd' })
        .expect(401);
    });

    it('should create a PaymentIntent with valid JWT', async () => {
      const token = signToken({
        sub: 'user-1',
        email: 'test@example.com',
        roles: ['USER'],
      });

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 2000, currency: 'usd' })
        .expect(201);

      expect(response.body.id).toMatch(/^pi_/);
      expect(response.body.amount).toBe(2000);
      expect(response.body.currency).toBe('usd');
      expect(response.body.status).toBeDefined();
      expect(response.body.clientSecret).toBeDefined();
    });

    it('should create a PaymentIntent with metadata', async () => {
      const token = signToken({
        sub: 'user-2',
        email: 'user2@example.com',
        roles: ['USER'],
      });

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 5000,
          currency: 'eur',
          metadata: { orderId: 'order-123' },
        })
        .expect(201);

      expect(response.body.id).toMatch(/^pi_/);
      expect(response.body.amount).toBe(5000);
      expect(response.body.currency).toBe('eur');
    });

    it('should return 400 for invalid amount (zero)', async () => {
      const token = signToken({
        sub: 'user-1',
        email: 'test@example.com',
        roles: ['USER'],
      });

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 0, currency: 'usd' })
        .expect(400);
    });

    it('should return 400 for missing currency', async () => {
      const token = signToken({
        sub: 'user-1',
        email: 'test@example.com',
        roles: ['USER'],
      });

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 2000 })
        .expect(400);
    });

    it('should return 400 for non-whitelisted properties', async () => {
      const token = signToken({
        sub: 'user-1',
        email: 'test@example.com',
        roles: ['USER'],
      });

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 2000, currency: 'usd', invalidField: 'test' })
        .expect(400);
    });
  });

  describe('POST /payments/webhook', () => {
    it('should return 400 for invalid signature', () => {
      return request(app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);
    });

    it('should return 400 when stripe-signature header is missing', () => {
      return request(app.getHttpServer())
        .post('/payments/webhook')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);
    });

    it('should return 201 for valid signature and successful processing', async () => {
      const stripe = new Stripe('sk_test_xxx', {
        apiVersion: '2024-12-18.acacia' as any, // Cast to any to avoid strict type check or use correct version found in package.json
      });

      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            object: 'payment_intent',
            amount: 2000,
            currency: 'usd',
            status: 'succeeded',
            metadata: { orderId: '123' },
          },
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: 'whsec_test_secret',
      });

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString)
        .expect(200);
    });
  });
});
