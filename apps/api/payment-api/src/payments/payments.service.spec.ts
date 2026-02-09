/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import type Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { SnsService } from '../sns/sns.service';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let stripeService: jest.Mocked<StripeService>;
  let snsService: jest.Mocked<SnsService>;

  beforeEach(async function (this: void) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: StripeService,
          useValue: {
            createPaymentIntent: jest.fn(),
            confirmPaymentIntent: jest.fn(),
            constructWebhookEvent: jest.fn(),
          },
        },
        {
          provide: SnsService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue(
                'arn:aws:sns:us-east-1:000000000000:payment-events',
              ),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    stripeService = module.get(StripeService);
    snsService = module.get(SnsService);
  });

  describe('createPayment', function (this: void) {
    it('should create a payment intent and return mapped response', async function (this: void) {
      stripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_test_123',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret_abc',
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      const result = await service.createPayment(
        { amount: 2000, currency: 'usd' },
        'user-1',
      );

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        2000,
        'usd',
        { userId: 'user-1' },
      );
      expect(result).toEqual({
        id: 'pi_test_123',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
        clientSecret: 'pi_test_123_secret_abc',
      });
    });

    it('should merge metadata with userId', async function (this: void) {
      stripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_test_456',
        amount: 5000,
        currency: 'eur',
        status: 'requires_payment_method',
        client_secret: 'pi_test_456_secret_xyz',
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      await service.createPayment(
        { amount: 5000, currency: 'eur', metadata: { orderId: 'order-99' } },
        'user-2',
      );

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        5000,
        'eur',
        { orderId: 'order-99', userId: 'user-2' },
      );
    });

    it('should propagate stripe errors', async function (this: void) {
      stripeService.createPaymentIntent.mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(
        service.createPayment({ amount: 2000, currency: 'usd' }, 'user-1'),
      ).rejects.toThrow('Stripe error');
    });
  });

  describe('handleWebhookEvent', function (this: void) {
    it('should handle payment_intent.succeeded event and publish to SNS', async function (this: void) {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_succeeded_123',
            amount: 1000,
            currency: 'usd',
            status: 'succeeded',
            metadata: { orderId: '123' },
          },
        },
      } as unknown as Stripe.Event;

      await service.handleWebhookEvent(event);

      expect(snsService.publish).toHaveBeenCalledWith(
        'arn:aws:sns:us-east-1:000000000000:payment-events',
        JSON.stringify({
          eventType: 'payment_intent.succeeded',
          paymentIntentId: 'pi_succeeded_123',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
          metadata: { orderId: '123' },
        }),
        {
          eventType: {
            DataType: 'String',
            StringValue: 'payment_intent.succeeded',
          },
        },
      );
    });

    it('should handle payment_intent.payment_failed event and publish to SNS', async function (this: void) {
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed_456',
            amount: 2000,
            currency: 'eur',
            status: 'failed',
            metadata: {},
          },
        },
      } as unknown as Stripe.Event;

      await service.handleWebhookEvent(event);

      expect(snsService.publish).toHaveBeenCalledWith(
        'arn:aws:sns:us-east-1:000000000000:payment-events',
        JSON.stringify({
          eventType: 'payment_intent.payment_failed',
          paymentIntentId: 'pi_failed_456',
          amount: 2000,
          currency: 'eur',
          status: 'failed',
          metadata: {},
        }),
        {
          eventType: {
            DataType: 'String',
            StringValue: 'payment_intent.payment_failed',
          },
        },
      );
    });

    it('should handle unknown event types without error and NOT publish to SNS', async function (this: void) {
      const event = {
        type: 'unknown.event',
        data: { object: { id: 'obj_789' } },
      } as unknown as Stripe.Event;

      await service.handleWebhookEvent(event);

      expect(snsService.publish).not.toHaveBeenCalled();
    });

    it('should not throw if SNS publishing fails', async function (this: void) {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_succeeded_123',
            amount: 1000,
            currency: 'usd',
            status: 'succeeded',
            metadata: { orderId: '123' },
          },
        },
      } as unknown as Stripe.Event;

      snsService.publish.mockRejectedValue(new Error('SNS Error'));

      await expect(service.handleWebhookEvent(event)).resolves.not.toThrow();
      expect(snsService.publish).toHaveBeenCalled();
    });
  });
});
