import { StripeService } from './stripe.service';

const mockCreate = jest.fn();
const mockConfirm = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockCreate,
      confirm: mockConfirm,
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

describe('StripeService', () => {
  let service: StripeService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        STRIPE_API_URL: 'http://localhost:8420',
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      };
      return config[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StripeService(mockConfigService as any);
  });

  describe('constructor', () => {
    it('should initialize with HTTPS URL without explicit port', () => {
      const httpsConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          const config: Record<string, string> = {
            STRIPE_API_URL: 'https://api.stripe.com',
          };
          return config[key] ?? defaultValue;
        }),
        getOrThrow: jest.fn((key: string) => {
          const config: Record<string, string> = {
            STRIPE_SECRET_KEY: 'sk_test_yyy',
            STRIPE_WEBHOOK_SECRET: 'whsec_test_secret2',
          };
          return config[key];
        }),
      };

      const httpsService = new StripeService(httpsConfig as any);
      expect(httpsService).toBeDefined();
    });
  });

  describe('createPaymentIntent', () => {
    it('should call stripe.paymentIntents.create with correct params', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        amount: 2000,
        currency: 'usd',
      };
      mockCreate.mockResolvedValue(mockIntent);

      const result = await service.createPaymentIntent(2000, 'usd', {
        userId: 'user-1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        amount: 2000,
        currency: 'usd',
        metadata: { userId: 'user-1' },
      });
      expect(result).toEqual(mockIntent);
    });

    it('should call stripe.paymentIntents.create without metadata when not provided', async () => {
      const mockIntent = { id: 'pi_test_456', amount: 1000, currency: 'eur' };
      mockCreate.mockResolvedValue(mockIntent);

      const result = await service.createPaymentIntent(1000, 'eur');

      expect(mockCreate).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'eur',
        metadata: undefined,
      });
      expect(result).toEqual(mockIntent);
    });

    it('should include confirm and payment_method when paymentMethod is provided', async () => {
      const mockIntent = { id: 'pi_test_789', amount: 3000, currency: 'usd', status: 'succeeded' };
      mockCreate.mockResolvedValue(mockIntent);

      const result = await service.createPaymentIntent(3000, 'usd', { orderId: 'order-1' }, 'pm_card_visa');

      expect(mockCreate).toHaveBeenCalledWith({
        amount: 3000,
        currency: 'usd',
        metadata: { orderId: 'order-1' },
        payment_method: 'pm_card_visa',
        confirm: true,
      });
      expect(result).toEqual(mockIntent);
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should call stripe.paymentIntents.confirm with correct params', async () => {
      const mockIntent = { id: 'pi_test_123', status: 'succeeded' };
      mockConfirm.mockResolvedValue(mockIntent);

      const result = await service.confirmPaymentIntent(
        'pi_test_123',
        'pm_test_abc',
      );

      expect(mockConfirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_test_abc',
      });
      expect(result).toEqual(mockIntent);
    });
  });

  describe('constructWebhookEvent', () => {
    it('should call stripe.webhooks.constructEvent with correct params', () => {
      const mockEvent = { type: 'payment_intent.succeeded', data: {} };
      mockConstructEvent.mockReturnValue(mockEvent);

      const payload = Buffer.from('test-payload');
      const signature = 'test-signature';

      const result = service.constructWebhookEvent(payload, signature);

      expect(mockConstructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_secret',
      );
      expect(result).toEqual(mockEvent);
    });

    it('should propagate error when signature verification fails', () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const payload = Buffer.from('test-payload');
      const signature = 'invalid-signature';

      expect(() =>
        service.constructWebhookEvent(payload, signature),
      ).toThrow('Invalid signature');
    });
  });
});
