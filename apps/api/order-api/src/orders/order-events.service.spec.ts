import { Test, TestingModule } from '@nestjs/testing';
import { OrderEventsService } from './order-events.service';
import { OrdersService } from './orders.service';
import { Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/order-api-client';

import { ConfigService } from '@nestjs/config';
import { SNSClient } from '@aws-sdk/client-sns';

describe('OrderEventsService', () => {
  let service: OrderEventsService;
  let ordersService: OrdersService;
  let snsClient: SNSClient;

  beforeEach(async () => {
    const mockOrdersService = {
      updateStatus: jest.fn(),
    };

    const mockSnsClient = {
      send: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultVal: string) => defaultVal),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventsService,
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
           provide: SNSClient,
           useValue: mockSnsClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OrderEventsService>(OrderEventsService);
    ordersService = module.get<OrdersService>(OrdersService);
    snsClient = module.get<SNSClient>(SNSClient);

    // Mock logger to avoid cluttering test output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePaymentSuccess', () => {
    it('should update order status when orderId is present in metadata', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { orderId: 'ord_123' },
      };

      await service.handlePaymentSuccess(event);

      expect(ordersService.updateStatus).toHaveBeenCalledWith('ord_123', {
        status: OrderStatus.CONFIRMED,
      });
    });

    it('should log warning and return if orderId is missing', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {},
      };

      await service.handlePaymentSuccess(event as any);

      expect(ordersService.updateStatus).not.toHaveBeenCalled();
    });

    it('should catch errors from updateStatus', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { orderId: 'ord_123' },
      };

      (ordersService.updateStatus as jest.Mock).mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(service.handlePaymentSuccess(event)).resolves.not.toThrow();
      expect(ordersService.updateStatus).toHaveBeenCalledWith('ord_123', {
        status: OrderStatus.CONFIRMED,
      });
      // Verification of publishOrderConfirmed is tricky here since it's called internally by OrdersService, 
      // which we mocked. In this unit test of OrderEventsService, we Mocked OrdersService. 
      // So checking if OrdersService.updateStatus was called is enough for handlePaymentSuccess.
      // The actual publishing logic is in OrdersService calling OrderEventsService.publishOrderConfirmed,
      // or if we kept the circular dependency logic (OrderEventsService calling OrdersService calling OrderEventsService),
      // we need to be careful.
      // 
      // Wait, in my implementation:
      // OrderEventsService.handlePaymentSuccess -> OrdersService.updateStatus -> OrderEventsService.publishOrderConfirmed
      // 
      // In this test, OrdersService is MOCKED. So updateStatus does NOTHING.
      // So OrderEventsService.publishOrderConfirmed will NOT be called recursively.
      // This is correct behavior for unit test isolation.
    });
  });

  describe('publishOrderConfirmed', () => {
    it('should publish SNS event', async () => {
      const order = {
        id: 'ord_123',
        orderNumber: 'ORD-123',
        userId: 'user_123',
        email: 'test@example.com',
        totalInCents: 1000,
        currency: 'USD',
        items: [],
      };

      await service.publishOrderConfirmed(order);

      expect(snsClient.send).toHaveBeenCalled();
      const callArgs = (snsClient.send as jest.Mock).mock.calls[0][0];
      expect(JSON.parse(callArgs.input.Message)).toEqual(expect.objectContaining({
        eventType: 'ORDER_CONFIRMED',
        orderId: 'ord_123',
      }));
    });
  });
});
