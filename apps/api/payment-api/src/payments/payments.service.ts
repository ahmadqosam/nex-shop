import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { SnsService } from '../sns/sns.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly snsService: SnsService,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    const paymentIntent = await this.stripeService.createPaymentIntent(
      dto.amount,
      dto.currency,
      { ...dto.metadata, userId },
      dto.paymentMethod,
    );

    this.logger.log(
      `PaymentIntent created: ${paymentIntent.id} for user ${userId}`,
    );

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret!,
    };
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        this.logger.warn(`Payment failed: ${paymentIntent.id}`);
        break;
      }
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
        return;
    }

    const topicArn = this.configService.get<string>('SNS_TOPIC_ARN');
    if (!topicArn) {
      this.logger.warn(
        'SNS_TOPIC_ARN is not defined, skipping event publishing',
      );
      return;
    }

    try {
      const paymentIntent = event.data.object;
      await this.snsService.publish(
        topicArn,
        JSON.stringify({
          eventType: event.type,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: paymentIntent.metadata,
        }),
        {
          eventType: { DataType: 'String', StringValue: event.type },
        },
      );
    } catch (error) {
      // Fire-and-forget: log error but don't fail webhook
      const err = error as Error;
      this.logger.error(
        `Failed to publish SNS event: ${err.message}`,
        err.stack,
      );
    }
  }
}
