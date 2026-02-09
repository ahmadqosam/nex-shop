import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from '../stripe/stripe.service';
import { Role } from '../auth/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let stripeService: jest.Mocked<StripeService>;

  const mockUser: JwtPayload = {
    sub: 'user-uuid-123',
    email: 'test@example.com',
    roles: [Role.USER],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createPayment: jest.fn(),
            handleWebhookEvent: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            constructWebhookEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
    stripeService = module.get(StripeService);
  });

  describe('createPayment', () => {
    it('should call paymentsService.createPayment with dto and user sub', async () => {
      const dto = { amount: 2000, currency: 'usd' };
      const expectedResponse = {
        id: 'pi_test_123',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
        clientSecret: 'pi_test_123_secret_abc',
      };
      paymentsService.createPayment.mockResolvedValue(expectedResponse);

      const result = await controller.createPayment(dto, mockUser);

      expect(paymentsService.createPayment).toHaveBeenCalledWith(
        dto,
        'user-uuid-123',
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('handleWebhook', () => {
    it('should verify signature and process webhook event', async () => {
      const rawBody = Buffer.from('test-payload');
      const signature = 'valid-signature';
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      stripeService.constructWebhookEvent.mockReturnValue(mockEvent as any);
      paymentsService.handleWebhookEvent.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(rawBody, signature);

      expect(stripeService.constructWebhookEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
      );
      expect(paymentsService.handleWebhookEvent).toHaveBeenCalledWith(
        mockEvent,
      );
      expect(result).toEqual({ received: true });
    });

    it('should throw BadRequestException when signature verification fails', async () => {
      const rawBody = Buffer.from('test-payload');
      const signature = 'invalid-signature';

      stripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        controller.handleWebhook(rawBody, signature),
      ).rejects.toThrow(BadRequestException);
      expect(paymentsService.handleWebhookEvent).not.toHaveBeenCalled();
    });
  });
});
