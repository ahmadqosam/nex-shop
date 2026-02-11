import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleService } from './flash-sale.service';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';

describe('FlashSaleService', () => {
  let service: FlashSaleService;
  let prisma: jest.Mocked<PrismaService>;
  let cache: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashSaleService,
        {
          provide: PrismaService,
          useValue: {
            flashSale: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            flashSaleItem: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              updateMany: jest.fn(),
            },
            flashSalePurchase: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            product: {
              findUnique: jest.fn(),
            },
            variant: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          } as unknown as jest.Mocked<PrismaService>,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delByPattern: jest.fn(),
          } as unknown as jest.Mocked<CacheService>,
        },
      ],
    }).compile();

    service = module.get<FlashSaleService>(FlashSaleService);
    prisma = module.get(PrismaService);
    cache = module.get(CacheService);
  });

  describe('getActiveFlashSales', () => {
    it('should return cached flash sales when available', async () => {
      const cached = [{ id: 'sale-1', name: 'Test Sale', items: [] }];
      cache.get.mockResolvedValue(cached as any);

      const result = await service.getActiveFlashSales();

      expect(cache.get).toHaveBeenCalledWith('flash-sales:active');
      expect(result).toEqual(cached);
      expect(prisma.flashSale.findMany).not.toHaveBeenCalled();
    });
  });

  describe('checkEligibility', () => {
    it('should return ineligible when item not found', async () => {
      (prisma.flashSaleItem.findUnique as jest.Mock).mockResolvedValue(
        null as any,
      );

      const result = await service.checkEligibility('user-1', 'item-1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Flash sale item not found');
    });
  });

  describe('purchaseFlashSaleItem', () => {
    it('should throw when item does not exist', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb({
          flashSaleItem: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(
        service.purchaseFlashSaleItem('user-1', { flashSaleItemId: 'item-1' }),
      ).rejects.toBeDefined();
    });
  });
});


