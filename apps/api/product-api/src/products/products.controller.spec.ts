import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { GetProductsQueryDto, PaginatedProductsResponseDto, ProductResponseDto } from './dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  const mockProduct: ProductResponseDto = {
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
    variants: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        sku: 'NEX-ACE-BLK',
        name: 'Black',
        priceInCents: null,
        attributes: { color: '#000000' },
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPaginatedResponse: PaginatedProductsResponseDto = {
    data: [mockProduct],
    meta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    },
  };

  beforeEach(async () => {
    mockProductsService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      findOne: jest.fn().mockResolvedValue(mockProduct),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  describe('findAll', () => {
    it('should return paginated products with variants', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data[0].variants).toHaveLength(1);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass query parameters to service', async () => {
      const query: GetProductsQueryDto = {
        page: 2,
        limit: 20,
        category: 'Headphone',
        search: 'Nex',
        sortBy: 'basePriceInCents',
        sortOrder: 'asc',
      };

      await controller.findAll(query);

      expect(mockProductsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a single product with variants', async () => {
      const result = await controller.findOne(mockProduct.id);

      expect(result).toEqual(mockProduct);
      expect(result.variants).toHaveLength(1);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(mockProduct.id);
    });
  });
});
