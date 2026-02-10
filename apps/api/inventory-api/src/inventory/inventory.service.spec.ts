import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      fields: { lowStockThreshold: 'lowStockThreshold' },
    },
    inventoryAdjustment: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncOrderItems', () => {
    it('should decrement quantity and reserved stock for each item', async () => {
      const items = [{ sku: 'SKU1', quantity: 2 }];
      const inventory = { id: 'inv-1', sku: 'SKU1', quantity: 10, reserved: 5 };

      mockPrismaService.inventory.findUnique.mockResolvedValue(inventory);
      mockPrismaService.inventory.update.mockResolvedValue({
        ...inventory,
        quantity: 8,
        reserved: 3,
      });

      await service.syncOrderItems(items);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.inventory.findUnique).toHaveBeenCalledWith({
        where: { sku: 'SKU1' },
      });
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { sku: 'SKU1' },
        data: {
          quantity: { decrement: 2 },
          reserved: { decrement: 2 },
        },
      });
      expect(prisma.inventoryAdjustment.create).toHaveBeenCalledWith({
        data: {
          inventoryId: 'inv-1',
          adjustmentType: 'sale',
          quantity: -2,
          reason: 'Order Confirmed',
        },
      });
    });

    it('should handle inventory not found gracefully', async () => {
      const items = [{ sku: 'UNKNOWN', quantity: 1 }];
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await service.syncOrderItems(items);

      expect(prisma.inventory.findUnique).toHaveBeenCalled();
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const items = [{ sku: 'SKU1', quantity: 1 }];
      mockPrismaService.inventory.findUnique.mockRejectedValue(new Error('DB Error'));

      await service.syncOrderItems(items);

      // Should verify error logging if possible, but mainly ensure it doesn't crash
      expect(prisma.inventory.findUnique).toHaveBeenCalled();
    });
  });
});
