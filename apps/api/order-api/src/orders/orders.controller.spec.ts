import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/order-api-client';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: any;

  const mockOrderResponse = {
    id: 'order-123',
    orderNumber: 'ORD-20260208-ABCD',
    userId: 'user-123',
    email: 'jane@example.com',
    status: OrderStatus.PENDING,
    items: [],
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
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn().mockResolvedValue(mockOrderResponse),
      findAll: jest.fn().mockResolvedValue({
        data: [mockOrderResponse],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockOrderResponse),
      updateStatus: jest.fn().mockResolvedValue({
        ...mockOrderResponse,
        status: OrderStatus.CONFIRMED,
      }),
      cancel: jest.fn().mockResolvedValue({
        ...mockOrderResponse,
        status: OrderStatus.CANCELLED,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service', async () => {
      const dto = {
        userId: 'user-123',
        email: 'jane@example.com',
        shippingAddress: mockOrderResponse.shippingAddress,
        items: [],
      };

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('order-123');
    });
  });

  describe('findAll', () => {
    it('should delegate to service', async () => {
      const query = { page: 1, limit: 10 };

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should delegate to service', async () => {
      const result = await controller.findOne('order-123');

      expect(service.findOne).toHaveBeenCalledWith('order-123');
      expect(result.id).toBe('order-123');
    });
  });

  describe('updateStatus', () => {
    it('should delegate to service', async () => {
      const result = await controller.updateStatus('order-123', {
        status: OrderStatus.CONFIRMED,
      });

      expect(service.updateStatus).toHaveBeenCalledWith('order-123', {
        status: OrderStatus.CONFIRMED,
      });
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('should delegate to service', async () => {
      const result = await controller.cancel('order-123', {
        reason: 'Changed my mind',
      });

      expect(service.cancel).toHaveBeenCalledWith('order-123', {
        reason: 'Changed my mind',
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
