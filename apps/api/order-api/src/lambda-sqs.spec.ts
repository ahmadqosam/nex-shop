import { Test, TestingModule } from '@nestjs/testing';
import { OrderEventsService } from './orders/order-events.service';
import { handler } from './lambda-sqs';
import { Context, SQSEvent } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';

// Mock NestFactory
jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn(),
  },
}));

describe('SQS Lambda Handler (Order API)', () => {
  let mockOrderEventsService: Partial<OrderEventsService>;
  let mockApp: any;

  beforeEach(() => {
    mockOrderEventsService = {
      handlePaymentSuccess: jest.fn(),
    };

    mockApp = {
      get: jest.fn().mockReturnValue(mockOrderEventsService),
      init: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(mockApp);
  });

  it('should process payment_intent.succeeded event', async () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: '1',
          receiptHandle: 'handle',
          body: JSON.stringify({
            eventType: 'payment_intent.succeeded',
            paymentIntentId: 'pi_123',
            metadata: { orderId: 'ord_123' },
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: '',
          awsRegion: 'us-east-1',
        },
      ],
    };

    await handler(event, {} as Context, () => {});

    expect(mockOrderEventsService.handlePaymentSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
      }),
    );
  });

  it('should ignore other event types', async () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: '1',
          receiptHandle: 'handle',
          body: JSON.stringify({
            eventType: 'other_event',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: '',
          awsRegion: 'us-east-1',
        },
      ],
    };

    await handler(event, {} as Context, () => {});

    expect(mockOrderEventsService.handlePaymentSuccess).not.toHaveBeenCalled();
  });
});
