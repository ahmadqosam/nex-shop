import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockClient = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn().mockResolvedValue(['0', []]),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: mockClient },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  describe('set', () => {
    it('should call setex with correct arguments', async () => {
      await service.set('key', 'value', 3600);
      expect(mockClient.setex).toHaveBeenCalledWith('key', 3600, 'value');
    });
  });

  describe('get', () => {
    it('should return value from redis', async () => {
      mockClient.get.mockResolvedValue('stored-value');
      const result = await service.get('key');
      expect(result).toBe('stored-value');
      expect(mockClient.get).toHaveBeenCalledWith('key');
    });

    it('should return null for missing key', async () => {
      const result = await service.get('missing');
      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete the key', async () => {
      await service.del('key');
      expect(mockClient.del).toHaveBeenCalledWith('key');
    });
  });

  describe('scanByPattern', () => {
    it('should return empty array when no keys match', async () => {
      const result = await service.scanByPattern('prefix:*');
      expect(result).toEqual([]);
    });

    it('should collect keys across multiple scan iterations', async () => {
      mockClient.scan
        .mockResolvedValueOnce(['42', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);

      const result = await service.scanByPattern('prefix:*');
      expect(result).toEqual(['key1', 'key2', 'key3']);
      expect(mockClient.scan).toHaveBeenCalledTimes(2);
    });
  });

  describe('delByPattern', () => {
    it('should delete all keys matching pattern', async () => {
      mockClient.scan.mockResolvedValueOnce(['0', ['key1', 'key2']]);
      await service.delByPattern('prefix:*');
      expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should not call del when no keys match', async () => {
      await service.delByPattern('prefix:*');
      expect(mockClient.del).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis client', async () => {
      await service.onModuleDestroy();
      expect(mockClient.quit).toHaveBeenCalled();
    });
  });
});
