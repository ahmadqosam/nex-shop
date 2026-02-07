import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { generateKeyPairSync, createPublicKey, createVerify } from 'crypto';
import * as jwt from 'jsonwebtoken';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  RedisContainer,
  StartedRedisContainer,
} from '@testcontainers/redis';
import { AuthModule } from '../src/auth/auth.module';
import { JwksModule } from '../src/jwks/jwks.module';
import { CryptoModule } from '../src/crypto/crypto.module';
import { RedisModule } from '../src/redis/redis.module';
import { UsersModule } from '../src/users/users.module';
import { User } from '../src/users/entities/user.entity';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let pgContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;

  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const base64Private = Buffer.from(keyPair.privateKey as string).toString(
    'base64',
  );
  const base64Public = Buffer.from(keyPair.publicKey as string).toString(
    'base64',
  );

  beforeAll(async () => {
    // Start containers
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('auth_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    redisContainer = await new RedisContainer('redis:7-alpine').start();

    // Set environment variables for the app
    process.env.DB_HOST = pgContainer.getHost();
    process.env.DB_PORT = pgContainer.getPort().toString();
    process.env.DB_USERNAME = pgContainer.getUsername();
    process.env.DB_PASSWORD = pgContainer.getPassword();
    process.env.DB_NAME = pgContainer.getDatabase();
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getPort().toString();
    process.env.REDIS_PASSWORD = '';
    process.env.RSA_PRIVATE_KEY = base64Private;
    process.env.RSA_PUBLIC_KEY = base64Public;
    process.env.JWT_ACCESS_TOKEN_TTL = '900';
    process.env.JWT_REFRESH_TOKEN_TTL = '604800';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [],
          ignoreEnvFile: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: pgContainer.getHost(),
          port: pgContainer.getPort(),
          username: pgContainer.getUsername(),
          password: pgContainer.getPassword(),
          database: pgContainer.getDatabase(),
          entities: [User],
          synchronize: true,
        }),
        RedisModule,
        CryptoModule,
        UsersModule,
        AuthModule,
        JwksModule,
      ],
      controllers: [AppController],
      providers: [
        AppService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
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
    await app.init();
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await pgContainer?.stop();
    await redisContainer?.stop();
  }, 30000);

  const testUser = {
    email: 'test@example.com',
    password: 'P@ssw0rd123',
  };

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(Number(res.body.expiresIn)).toBe(900);

          // Verify refresh token format
          const parts = res.body.refreshToken.split('.');
          expect(parts).toHaveLength(3);
        });
    });

    it('should return 409 for duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'P@ssw0rd123' })
        .expect(400);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'weak@example.com', password: 'weak' })
        .expect(400);
    });

    it('should return 400 for password without uppercase', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'weak@example.com', password: 'p@ssw0rd123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(Number(res.body.expiresIn)).toBe(900);
        });
    });

    it('should return 401 for wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongP@ss1' })
        .expect(401);
    });

    it('should return 401 for non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'P@ssw0rd123' })
        .expect(401);
    });

    it('should return same error for email and password failures (no enumeration)', async () => {
      const emailRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'P@ssw0rd123' })
        .expect(401);

      const passwordRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongP@ss1' })
        .expect(401);

      expect(emailRes.body.message).toBe(passwordRes.body.message);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);
      refreshToken = res.body.refreshToken;
    });

    it('should return new tokens for valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should rotate token - old token should not work after refresh', async () => {
      // Use the refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Try to use the same token again (replay attack)
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 for malformed token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 for garbage token with correct format', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'fake-id.fake-token-id.fake-random' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 without access token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'any-token' })
        .expect(401);
    });

    it('should logout successfully with valid access token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should not allow refresh after logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      // Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(logoutRes.status).toBe(200);

      // Try to refresh with the logged-out token
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(401);
    });
  });

  describe('GET /.well-known/jwks.json', () => {
    it('should return JWKS with RS256 key', () => {
      return request(app.getHttpServer())
        .get('/.well-known/jwks.json')
        .expect(200)
        .expect((res) => {
          expect(res.body.keys).toBeInstanceOf(Array);
          expect(res.body.keys).toHaveLength(1);

          const key = res.body.keys[0];
          expect(key.kty).toBe('RSA');
          expect(key.use).toBe('sig');
          expect(key.alg).toBe('RS256');
          expect(key.kid).toBeDefined();
          expect(key.n).toBeDefined();
          expect(key.e).toBeDefined();
        });
    });

    it('should return public key that can verify access tokens', async () => {
      // Login to get an access token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      // Verify the token with the public key
      const publicKey = keyPair.publicKey as string;
      const decoded = jwt.verify(loginRes.body.accessToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'auth-api',
      }) as any;

      expect(decoded.sub).toBeDefined();
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.roles).toContain('USER');
      expect(decoded.iss).toBe('auth-api');
    });
  });

  describe('GET / (health check)', () => {
    it('should be accessible without auth (public)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Access token content', () => {
    it('should contain correct claims', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      const decoded = jwt.decode(loginRes.body.accessToken) as any;

      expect(decoded.sub).toBeDefined();
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.roles).toEqual(['USER']);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.iss).toBe('auth-api');
    });
  });
});
