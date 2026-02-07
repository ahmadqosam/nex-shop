import { Test, TestingModule } from '@nestjs/testing';
import { JwksService } from './jwks.service';
import { CryptoService } from '../crypto/crypto.service';

describe('JwksService', () => {
  let service: JwksService;

  const mockJwk = {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid: 'test-kid-12345',
    n: 'test-modulus',
    e: 'AQAB',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwksService,
        {
          provide: CryptoService,
          useValue: {
            getJwk: jest.fn().mockReturnValue(mockJwk),
          },
        },
      ],
    }).compile();

    service = module.get<JwksService>(JwksService);
  });

  describe('getKeySet', () => {
    it('should return a JWKS with one key', () => {
      const result = service.getKeySet();
      expect(result).toEqual({ keys: [mockJwk] });
    });

    it('should contain the correct key properties', () => {
      const result = service.getKeySet();
      expect(result.keys[0].kty).toBe('RSA');
      expect(result.keys[0].use).toBe('sig');
      expect(result.keys[0].alg).toBe('RS256');
      expect(result.keys[0].kid).toBeDefined();
    });
  });
});
