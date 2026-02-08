import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './cache.constants';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn().mockResolvedValue(['0', []]),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      const result = await service.get<{ name: string }>('missing-key');
      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('missing-key');
    });

    it('should parse and return JSON value when key exists', async () => {
      const storedValue = { name: 'Test Product', price: 99 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedValue));

      const result = await service.get<typeof storedValue>('product:123');

      expect(result).toEqual(storedValue);
      expect(mockRedisClient.get).toHaveBeenCalledWith('product:123');
    });
  });

  describe('set', () => {
    it('should stringify and store value with TTL', async () => {
      const value = { name: 'Test Product', price: 99 };

      await service.set('product:123', value, 300);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'product:123',
        300,
        JSON.stringify(value),
      );
    });
  });

  describe('del', () => {
    it('should delete the key', async () => {
      await service.del('product:123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('product:123');
    });
  });

  describe('scanByPattern', () => {
    it('should return empty array when no keys match', async () => {
      const result = await service.scanByPattern('products:*');

      expect(result).toEqual([]);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'products:*',
        'COUNT',
        100,
      );
    });

    it('should collect keys across multiple scan iterations', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['42', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);

      const result = await service.scanByPattern('products:*');

      expect(result).toEqual(['key1', 'key2', 'key3']);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
    });
  });

  describe('delByPattern', () => {
    it('should delete all keys matching pattern', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['key1', 'key2']]);

      await service.delByPattern('products:*');

      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should not call del when no keys match pattern', async () => {
      await service.delByPattern('products:*');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis client', async () => {
      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
