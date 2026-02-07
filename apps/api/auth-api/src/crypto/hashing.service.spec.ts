import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  describe('hashPassword', () => {
    it('should return a hash different from the input', async () => {
      const hash = await service.hashPassword('testPassword123');
      expect(hash).not.toBe('testPassword123');
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await service.hashPassword('correctPassword');
      const result = await service.verifyPassword(hash, 'correctPassword');
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await service.hashPassword('correctPassword');
      const result = await service.verifyPassword(hash, 'wrongPassword');
      expect(result).toBe(false);
    });
  });

  describe('hashToken', () => {
    it('should return an argon2 hash', async () => {
      const hash = await service.hashToken('some-opaque-token');
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('verifyToken', () => {
    it('should return true for correct token', async () => {
      const token = 'my-refresh-token';
      const hash = await service.hashToken(token);
      const result = await service.verifyToken(hash, token);
      expect(result).toBe(true);
    });

    it('should return false for incorrect token', async () => {
      const hash = await service.hashToken('real-token');
      const result = await service.verifyToken(hash, 'fake-token');
      expect(result).toBe(false);
    });
  });
});
