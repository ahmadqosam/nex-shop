import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, HttpAdapterHost } from '@nestjs/core';
import { generateKeyPairSync } from 'crypto';
import request from 'supertest';

import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.RSA_PUBLIC_KEY = Buffer.from(
      keyPair.publicKey as string,
    ).toString('base64');
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.STRIPE_API_URL = 'http://localhost:8420';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        AuthModule,
      ],
      controllers: [AppController],
      providers: [
        AppService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('OK');
  });
});
