import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import * as fs from 'fs';
import { CryptoService } from './crypto.service';

jest.mock('fs');

describe('CryptoService', () => {
  let service: CryptoService;

  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const base64Private = Buffer.from(
    keyPair.privateKey as string,
  ).toString('base64');
  const base64Public = Buffer.from(
    keyPair.publicKey as string,
  ).toString('base64');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('with base64 env vars', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CryptoService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const map: Record<string, string> = {
                  RSA_PRIVATE_KEY: base64Private,
                  RSA_PUBLIC_KEY: base64Public,
                };
                return map[key];
              }),
              getOrThrow: jest.fn(),
            },
          },
        ],
      }).compile();

      service = module.get<CryptoService>(CryptoService);
      // Keys are loaded in the constructor, no need to call onModuleInit
    });

    it('should load private key', () => {
      expect(service.getPrivateKey()).toBe(keyPair.privateKey);
    });

    it('should load public key', () => {
      expect(service.getPublicKey()).toBe(keyPair.publicKey);
    });

    it('should generate a JWK with correct properties', () => {
      const jwk = service.getJwk();
      expect(jwk.kty).toBe('RSA');
      expect(jwk.use).toBe('sig');
      expect(jwk.alg).toBe('RS256');
      expect(jwk.kid).toBeDefined();
      expect(jwk.n).toBeDefined();
      expect(jwk.e).toBeDefined();
    });

    it('should return a consistent kid', () => {
      const kid = service.getKid();
      expect(kid).toHaveLength(16);
      expect(service.getKid()).toBe(kid);
    });
  });

  describe('with file paths', () => {
    beforeEach(async () => {
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(keyPair.privateKey as string)
        .mockReturnValueOnce(keyPair.publicKey as string);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CryptoService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
              getOrThrow: jest.fn((key: string) => {
                const map: Record<string, string> = {
                  RSA_PRIVATE_KEY_PATH: './keys/private.pem',
                  RSA_PUBLIC_KEY_PATH: './keys/public.pem',
                };
                return map[key];
              }),
            },
          },
        ],
      }).compile();

      service = module.get<CryptoService>(CryptoService);
      // Keys are loaded in the constructor, no need to call onModuleInit
    });

    it('should load keys from file paths', () => {
      expect(fs.readFileSync).toHaveBeenCalledWith(
        './keys/private.pem',
        'utf-8',
      );
      expect(fs.readFileSync).toHaveBeenCalledWith(
        './keys/public.pem',
        'utf-8',
      );
      expect(service.getPrivateKey()).toBe(keyPair.privateKey);
      expect(service.getPublicKey()).toBe(keyPair.publicKey);
    });
  });
});
