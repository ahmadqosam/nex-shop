import { Test, TestingModule } from '@nestjs/testing';
import { CartEventsService } from './cart-events.service';
import { CartService } from './cart.service';
import { Logger } from '@nestjs/common';

describe('CartEventsService', () => {
  let service: CartEventsService;
  let cartService: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartEventsService,
        {
          provide: CartService,
          useValue: {
            convertCart: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CartEventsService>(CartEventsService);
    cartService = module.get<CartService>(CartService);
    
    // Mock logger to avoid cluttering test output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePaymentSuccess', () => {
    it('should convert cart when cartId is present in metadata', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { cartId: 'cart_123' },
      };

      await service.handlePaymentSuccess(event);

      expect(cartService.convertCart).toHaveBeenCalledWith('cart_123');
    });

    it('should log warning and return if cartId is missing', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {},
      };

      await service.handlePaymentSuccess(event as any);

      expect(cartService.convertCart).not.toHaveBeenCalled();
    });

    it('should catch errors from convertCart', async () => {
      const event = {
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { cartId: 'cart_123' },
      };

      (cartService.convertCart as jest.Mock).mockRejectedValue(new Error('Conversion failed'));

      await expect(service.handlePaymentSuccess(event)).resolves.not.toThrow();
      expect(cartService.convertCart).toHaveBeenCalledWith('cart_123');
    });
  });
});
