import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './cache.constants';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      scan: jest.fn().mockResolvedValue(['0', []]),
      quit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed value', async () => {
      mockRedis.get.mockResolvedValue('{"foo":"bar"}');
      const result = await service.get('key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for missing key', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get('missing');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store JSON value with TTL', async () => {
      await service.set('key', { foo: 'bar' }, 300);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'key',
        300,
        '{"foo":"bar"}',
      );
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await service.del('key');
      expect(mockRedis.del).toHaveBeenCalledWith('key');
    });
  });
});
