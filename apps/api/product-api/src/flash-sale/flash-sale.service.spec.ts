import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleService } from './flash-sale.service';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('FlashSaleService', () => {
  let service: FlashSaleService;
  let prisma: any;
  let cache: jest.Mocked<CacheService>;

  const mockDate = new Date('2026-02-11T22:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

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
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            product: {
              findUnique: jest.fn(),
            },
            variant: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delByPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FlashSaleService>(FlashSaleService);
    prisma = module.get(PrismaService);
    cache = module.get(CacheService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getActiveFlashSales', () => {
    it('should return cached flash sales when available', async () => {
      const cached = [{ id: 'sale-1', name: 'Test Sale', items: [] }];
      cache.get.mockResolvedValue(cached);

      const result = await service.getActiveFlashSales();

      expect(cache.get).toHaveBeenCalledWith('flash-sales:active');
      expect(result).toEqual(cached);
      expect(prisma.flashSale.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when not cached', async () => {
      cache.get.mockResolvedValue(null);
      const sales = [
        {
          id: 'sale-1',
          name: 'Test Sale',
          startTime: mockDate,
          endTime: new Date(mockDate.getTime() + 3600000),
          isActive: true,
          items: [],
        },
      ];
      prisma.flashSale.findMany.mockResolvedValue(sales as any);

      const result = await service.getActiveFlashSales();

      expect(prisma.flashSale.findMany).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalledWith('flash-sales:active', result, 30);
      expect(result[0].name).toBe('Test Sale');
    });
  });

  describe('getFlashSaleForProduct', () => {
    it('should return null if no active flash sale for product', async () => {
      cache.get.mockResolvedValue(null);
      prisma.flashSaleItem.findFirst.mockResolvedValue(null);

      const result = await service.getFlashSaleForProduct('prod-1');

      expect(result).toBeNull();
      expect(cache.set).toHaveBeenCalledWith(
        'flash-sales:product:prod-1:no-variant',
        null,
        30,
      );
    });

    it('should return flash sale item if exists', async () => {
      cache.get.mockResolvedValue(null);
      const item = {
        id: 'item-1',
        productId: 'prod-1',
        variantId: null,
        salePriceInCents: 1000,
        maxQuantity: 10,
        soldCount: 0,
        product: {
          name: 'Prod 1',
          images: ['img1.jpg'],
          basePriceInCents: 2000,
          category: 'Cat 1',
        },
        variant: null,
        flashSale: { id: 'sale-1' },
      };
      prisma.flashSaleItem.findFirst.mockResolvedValue(item as any);

      const result = await service.getFlashSaleForProduct('prod-1');

      expect(result).toBeDefined();
      expect(result?.productId).toBe('prod-1');
      expect(result?.originalPriceInCents).toBe(2000);
    });
  });

  describe('checkEligibility', () => {
    const mockItem = {
      id: 'item-1',
      maxQuantity: 10,
      soldCount: 0,
      salePriceInCents: 1000,
      flashSale: {
        id: 'sale-1',
        isActive: true,
        startTime: new Date(mockDate.getTime() - 3600000),
        endTime: new Date(mockDate.getTime() + 3600000),
      },
    };

    it('should return ineligible if item not found', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue(null);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Flash sale item not found');
    });

    it('should return ineligible if sale inactive', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue({
        ...mockItem,
        flashSale: { ...mockItem.flashSale, isActive: false },
      } as any);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Flash sale is not active');
    });

    it('should return ineligible if sale not started', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue({
        ...mockItem,
        flashSale: {
          ...mockItem.flashSale,
          startTime: new Date(mockDate.getTime() + 3600000),
        },
      } as any);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Flash sale has not started yet');
    });

    it('should return ineligible if sale ended', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue({
        ...mockItem,
        flashSale: {
          ...mockItem.flashSale,
          endTime: new Date(mockDate.getTime() - 3600000),
        },
      } as any);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Flash sale has ended');
    });

    it('should return ineligible if sold out', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue({
        ...mockItem,
        soldCount: 10,
      } as any);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Sold out');
    });

    it('should return ineligible if already purchased', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue(mockItem as any);
      prisma.flashSalePurchase.findFirst.mockResolvedValue({ id: 'p1' } as any);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Already purchased');
    });

    it('should return eligible if all checks pass', async () => {
      prisma.flashSaleItem.findUnique.mockResolvedValue(mockItem as any);
      prisma.flashSalePurchase.findFirst.mockResolvedValue(null);
      const res = await service.checkEligibility('user-1', 'item-1');
      expect(res.eligible).toBe(true);
      expect(res.flashSaleItemId).toBe('item-1');
    });
  });

  describe('purchaseFlashSaleItem', () => {
    it('should complete purchase successfully', async () => {
      const item = {
        id: 'item-1',
        productId: 'prod-1',
        salePriceInCents: 1000,
        maxQuantity: 10,
        soldCount: 0,
        version: 0,
        flashSale: {
          id: 'sale-1',
          isActive: true,
          startTime: new Date(mockDate.getTime() - 1000),
          endTime: new Date(mockDate.getTime() + 1000),
        },
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          flashSaleItem: {
            findUnique: jest.fn().mockResolvedValue(item),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          flashSalePurchase: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'p-1' }),
          },
        };
        return cb(tx);
      });

      const res = await service.purchaseFlashSaleItem('user-1', {
        flashSaleItemId: 'item-1',
      });

      expect(res.purchaseId).toBe('p-1');
      expect(cache.del).toHaveBeenCalledWith('flash-sales:active');
      expect(cache.delByPattern).toHaveBeenCalledWith('flash-sales:product:*');
    });

    it('should throw ConflictException on optimistic lock failure', async () => {
      const item = {
        id: 'item-1',
        soldCount: 0,
        maxQuantity: 10,
        version: 0,
        flashSale: {
          id: 'sale-1',
          isActive: true,
          startTime: new Date(mockDate.getTime() - 1000),
          endTime: new Date(mockDate.getTime() + 1000),
        },
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          flashSaleItem: {
            findUnique: jest.fn().mockResolvedValue(item),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          flashSalePurchase: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      await expect(
        service.purchaseFlashSaleItem('user-1', { flashSaleItemId: 'item-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('admin methods', () => {
    it('should create flash sale', async () => {
      const dto = {
        name: 'New Sale',
        startTime: new Date(mockDate.getTime() + 1000).toISOString(),
        endTime: new Date(mockDate.getTime() + 2000).toISOString(),
      };
      prisma.flashSale.create.mockResolvedValue({
        ...dto,
        id: 'sale-1',
        isActive: true,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        items: [],
      } as any);

      const res = await service.createFlashSale(dto);
      expect(res.id).toBe('sale-1');
      expect(cache.del).toHaveBeenCalled();
    });

    it('should throw on invalid dates in create', async () => {
      const dto = {
        name: 'New Sale',
        startTime: mockDate.toISOString(),
        endTime: mockDate.toISOString(),
      };
      await expect(service.createFlashSale(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should add item to flash sale', async () => {
      prisma.flashSale.findUnique.mockResolvedValue({ id: 'sale-1' } as any);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as any);
      prisma.flashSaleItem.create.mockResolvedValue({
        id: 'item-1',
        productId: 'prod-1',
        salePriceInCents: 100,
        maxQuantity: 10,
        soldCount: 0,
        product: { images: [], basePriceInCents: 200 },
      } as any);

      const res = await service.addItemToFlashSale('sale-1', {
        productId: 'prod-1',
        salePriceInCents: 100,
        maxQuantity: 10,
      });

      expect(res.id).toBe('item-1');
    });
  });
});
