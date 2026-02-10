
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsMessageHandler, SqsConsumerEventHandler } from '@ssut/nestjs-sqs';
import { OrderEventsService } from './order-events.service';
import { Message } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(SqsConsumerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly orderEventsService: OrderEventsService,
  ) {}

  onModuleInit() {
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log('Initializing SQS Consumer for local development');
    }
  }

  @SqsMessageHandler('order-payment-events-queue', false)
  async handleMessage(message: Message) {
    try {
      this.logger.log(`Processing message: ${message.MessageId}`);
      const body = JSON.parse(message.Body!);
      
      // Handle SNS wrapping
      const payload = body.Message ? JSON.parse(body.Message) : body;

      if (payload.eventType === 'payment_intent.succeeded') {
        await this.orderEventsService.handlePaymentSuccess(payload);
      } else {
        this.logger.warn(`Ignoring event type: ${payload.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Error processing message: ${(error as Error).message}`);
      // In a real app, we might want to throw to trigger DLQ, but for now we log
    }
  }

  @SqsConsumerEventHandler('order-payment-events-queue', 'processing_error')
  public onProcessingError(error: Error, message: Message) {
    this.logger.error(`Processing error: ${error.message}`);
  }
}
