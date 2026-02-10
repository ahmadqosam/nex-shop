import { Test, TestingModule } from '@nestjs/testing';
import { OrderEventsService } from './order-events.service';
import { OrdersService } from './orders.service';
import { Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/order-api-client';

describe('OrderEventsService', () => {
  let service: OrderEventsService;
  let ordersService: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventsService,
        {
          provide: OrdersService,
          useValue: {
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderEventsService>(OrderEventsService);
    ordersService = module.get<OrdersService>(OrdersService);

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
    });
  });
});
