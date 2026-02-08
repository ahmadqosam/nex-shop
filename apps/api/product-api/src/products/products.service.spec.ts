import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import { GetProductsQueryDto } from './dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockPrismaService: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
  };
  let mockCacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const mockVariant = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    sku: 'NEX-ACE-BLK',
    name: 'Black',
    priceInCents: null,
    attributes: { color: '#000000' },
  };

  const mockProduct = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Nex Ace',
    slug: 'nex-ace',
    category: 'Headphone',
    basePriceInCents: 44900,
    currency: 'USD',
    description: 'Premium wireless headphones',
    tags: ['New Arrival'],
    images: ['/images/nex-ace-1.jpg'],
    specifications: { driver_size: '40mm' },
    isAvailable: true,
    weightInGrams: 280,
    variants: [mockVariant],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findUnique: jest.fn().mockResolvedValue(mockProduct),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(300),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('should return cached products when cache hit', async () => {
      const cachedResult = {
        data: [{ ...mockProduct }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
        },
      };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const query: GetProductsQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result).toEqual(cachedResult);
      expect(mockPrismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should query database on cache miss and cache the result', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
      expect(mockPrismaService.product.count).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should include variants in query', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10 };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { variants: true },
        }),
      );
    });

    it('should filter by category when provided', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10, category: 'Headphone' };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Headphone' }),
        }),
      );
    });

    it('should search by name when provided', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10, search: 'Nex' };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Nex', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should apply sorting correctly', async () => {
      const query: GetProductsQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'basePriceInCents',
        sortOrder: 'asc',
      };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { basePriceInCents: 'asc' },
        }),
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      mockPrismaService.product.count.mockResolvedValue(25);
      const query: GetProductsQueryDto = { page: 2, limit: 10 };
      const result = await service.findAll(query);

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasPrevious: true,
        hasNext: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return cached product when cache hit', async () => {
      const cachedProduct = { ...mockProduct };
      mockCacheService.get.mockResolvedValue(cachedProduct);

      const result = await service.findOne(mockProduct.id);

      expect(result).toEqual(cachedProduct);
      expect(mockPrismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('should query database with variants on cache miss', async () => {
      const result = await service.findOne(mockProduct.id);

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        include: { variants: true },
      });
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(result.id).toBe(mockProduct.id);
      expect(result.variants).toHaveLength(1);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include variants in response', async () => {
      const result = await service.findOne(mockProduct.id);

      expect(result.variants).toHaveLength(1);
      expect(result.variants[0].sku).toBe('NEX-ACE-BLK');
      expect(result.variants[0].attributes).toEqual({ color: '#000000' });
    });
  });
});
