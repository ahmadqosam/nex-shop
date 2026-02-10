import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import { OrderStatus } from '@prisma/order-api-client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let cache: any;
  let httpService: any;

  const mockOrder = {
    id: 'order-123',
    orderNumber: 'ORD-20260208-ABCD',
    userId: 'user-123',
    email: 'jane@example.com',
    status: OrderStatus.PENDING,
    shippingAddress: {
      fullName: 'Jane Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    subtotalInCents: 34999,
    shippingCostInCents: 0,
    totalInCents: 34999,
    currency: 'USD',
    notes: null,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockOrderItem = {
    id: 'item-123',
    orderId: 'order-123',
    productId: 'prod-123',
    variantId: 'var-123',
    sku: 'NEX-ACE-BLK',
    quantity: 1,
    unitPriceInCents: 34999,
    totalPriceInCents: 34999,
    currency: 'USD',
    productName: 'Nex Ace',
    variantName: 'Midnight Black',
    imageUrl: '/images/products/nex-ace-1.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderWithItems = { ...mockOrder, items: [mockOrderItem] };

  beforeEach(async () => {
    const mockPrisma = {
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        deleteMany: jest.fn(),
      },
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn((key: string, defaultVal?: unknown) => {
        const values: Record<string, unknown> = {
          CACHE_TTL: 300,
          CART_API_URL: 'http://localhost:4004',
          INVENTORY_API_URL: 'http://localhost:4003',
        };
        return values[key] ?? defaultVal;
      }),
    };

    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: ConfigService, useValue: mockConfig },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
    cache = module.get(CacheService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      userId: 'user-123',
      email: 'jane@example.com',
      shippingAddress: {
        fullName: 'Jane Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      },
      items: [
        {
          productId: 'prod-123',
          variantId: 'var-123',
          sku: 'NEX-ACE-BLK',
          quantity: 1,
          unitPriceInCents: 34999,
          productName: 'Nex Ace',
          variantName: 'Midnight Black',
        },
      ],
    };

    it('should create an order with direct items', async () => {
      prisma.order.create.mockResolvedValue(mockOrderWithItems);
      httpService.post.mockReturnValue(of({ data: {} }));

      const result = await service.create(createDto);

      expect(prisma.order.create).toHaveBeenCalled();
      expect(result.orderNumber).toBe(mockOrderWithItems.orderNumber);
      expect(cache.delByPattern).toHaveBeenCalledWith('orders:list:*');
    });

    it('should create an order from cart', async () => {
      const cartDto = {
        cartId: 'cart-123',
        userId: 'user-123',
        email: 'jane@example.com',
        shippingAddress: createDto.shippingAddress,
      };

      httpService.get.mockReturnValue(
        of({
          data: {
            id: 'cart-123',
            status: 'ACTIVE',
            items: [
              {
                productId: 'prod-123',
                variantId: 'var-123',
                sku: 'NEX-ACE-BLK',
                quantity: 1,
                priceInCents: 34999,
                currency: 'USD',
                productName: 'Nex Ace',
                variantName: 'Midnight Black',
              },
            ],
          },
        }),
      );
      httpService.post.mockReturnValue(of({ data: {} }));
      prisma.order.create.mockResolvedValue(mockOrderWithItems);

      const result = await service.create(cartDto);

      expect(httpService.get).toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalled();
      expect(result.id).toBe(mockOrderWithItems.id);
    });

    it('should throw if cart is not active', async () => {
      httpService.get.mockReturnValue(
        of({ data: { id: 'cart-123', status: 'CONVERTED', items: [] } }),
      );

      await expect(
        service.create({
          cartId: 'cart-123',
          userId: 'user-123',
          email: 'jane@example.com',
          shippingAddress: createDto.shippingAddress,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if cart is empty', async () => {
      httpService.get.mockReturnValue(
        of({ data: { id: 'cart-123', status: 'ACTIVE', items: [] } }),
      );

      await expect(
        service.create({
          cartId: 'cart-123',
          userId: 'user-123',
          email: 'jane@example.com',
          shippingAddress: createDto.shippingAddress,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if neither cartId nor items provided', async () => {
      await expect(
        service.create({
          userId: 'user-123',
          email: 'jane@example.com',
          shippingAddress: createDto.shippingAddress,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when cart returns 404', async () => {
      const error = { response: { status: 404 }, message: 'Not Found' };
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(
        service.create({
          cartId: 'nonexistent',
          userId: 'user-123',
          email: 'jane@example.com',
          shippingAddress: createDto.shippingAddress,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on cart fetch error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      await expect(
        service.create({
          cartId: 'cart-123',
          userId: 'user-123',
          email: 'jane@example.com',
          shippingAddress: createDto.shippingAddress,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not fail order creation when cart conversion fails', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            id: 'cart-123',
            status: 'ACTIVE',
            items: [
              {
                productId: 'prod-123',
                variantId: 'var-123',
                sku: 'NEX-ACE-BLK',
                quantity: 1,
                priceInCents: 34999,
                currency: 'USD',
                productName: 'Nex Ace',
                variantName: 'Midnight Black',
              },
            ],
          },
        }),
      );
      // Reserve succeeds, convert fails
      httpService.post
        .mockReturnValueOnce(of({ data: {} })) // reserve
        .mockReturnValueOnce(throwError(() => new Error('Cart service down'))); // convert
      prisma.order.create.mockResolvedValue(mockOrderWithItems);

      const result = await service.create({
        cartId: 'cart-123',
        userId: 'user-123',
        email: 'jane@example.com',
        shippingAddress: createDto.shippingAddress,
      });

      expect(result.id).toBe(mockOrderWithItems.id);
    });

    it('should not fail order creation when inventory reservation fails', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new Error('Inventory service down')),
      );
      prisma.order.create.mockResolvedValue(mockOrderWithItems);

      const result = await service.create(createDto);

      expect(result.id).toBe(mockOrderWithItems.id);
    });
  });

  describe('findAll', () => {
    it('should return cached results', async () => {
      const cached = {
        data: [mockOrderWithItems],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
        },
      };
      cache.get.mockResolvedValue(cached);

      const result = await service.findAll({});

      expect(result).toEqual(cached);
      expect(prisma.order.findMany).not.toHaveBeenCalled();
    });

    it('should query DB on cache miss', async () => {
      cache.get.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([mockOrderWithItems]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should filter by userId and status', async () => {
      cache.get.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await service.findAll({
        userId: 'user-123',
        status: OrderStatus.PENDING,
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', status: OrderStatus.PENDING },
        }),
      );
    });

    it('should apply pagination', async () => {
      cache.get.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasPrevious).toBe(true);
      expect(result.meta.hasNext).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return cached order', async () => {
      const dto = { ...mockOrderWithItems, items: [{ ...mockOrderItem }] };
      cache.get.mockResolvedValue(dto);

      const result = await service.findOne('order-123');

      expect(result).toEqual(dto);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('should query DB on cache miss', async () => {
      cache.get.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue(mockOrderWithItems);

      const result = await service.findOne('order-123');

      expect(result.id).toBe('order-123');
      expect(cache.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      cache.get.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.CONFIRMED,
        paidAt: new Date(),
      });

      const result = await service.updateStatus('order-123', {
        status: OrderStatus.CONFIRMED,
      });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.CONFIRMED,
            paidAt: expect.any(Date),
          }),
        }),
      );
      expect(cache.del).toHaveBeenCalledWith('order:order-123');
      expect(cache.delByPattern).toHaveBeenCalledWith('orders:list:*');
    });

    it('should throw on invalid transition', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus('order-123', {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', {
          status: OrderStatus.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set shippedAt when transitioning to SHIPPED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PROCESSING,
      });
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.SHIPPED,
        shippedAt: new Date(),
      });

      await service.updateStatus('order-123', {
        status: OrderStatus.SHIPPED,
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.SHIPPED,
            shippedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set deliveredAt when transitioning to DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      });
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      await service.updateStatus('order-123', {
        status: OrderStatus.DELIVERED,
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
            deliveredAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a PENDING order', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderWithItems);
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Changed my mind',
      });
      httpService.post.mockReturnValue(of({ data: {} }));

      const result = await service.cancel('order-123', {
        reason: 'Changed my mind',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            cancelledAt: expect.any(Date),
            cancellationReason: 'Changed my mind',
          }),
        }),
      );
    });

    it('should cancel a CONFIRMED order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.CONFIRMED,
      });
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.CANCELLED,
      });
      httpService.post.mockReturnValue(of({ data: {} }));

      await service.cancel('order-123', {});

      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw if order cannot be cancelled', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.SHIPPED,
      });

      await expect(
        service.cancel('order-123', { reason: 'Too late' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.cancel('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should release inventory on cancellation', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderWithItems);
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.CANCELLED,
      });
      httpService.post.mockReturnValue(of({ data: {} }));

      await service.cancel('order-123', {});

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/inventory/NEX-ACE-BLK/release'),
        { quantity: 1 },
      );
    });

    it('should not fail if inventory release fails', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderWithItems);
      prisma.order.update.mockResolvedValue({
        ...mockOrderWithItems,
        status: OrderStatus.CANCELLED,
      });
      httpService.post.mockReturnValue(
        throwError(() => new Error('Inventory service down')),
      );

      // Should not throw
      const result = await service.cancel('order-123', {});
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
