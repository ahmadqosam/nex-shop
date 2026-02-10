import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    const apiUrl = this.configService.get<string>(
      'STRIPE_API_URL',
      'https://api.stripe.com',
    );
    const url = new URL(apiUrl);
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      {
        host: url.hostname,
        port: Number(url.port) || undefined,
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
      },
    );
    this.webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
    paymentMethod?: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Creating PaymentIntent: ${amount} ${currency}`);
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      ...(paymentMethod && {
        payment_method: paymentMethod,
        confirm: true,
      }),
    });
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Confirming PaymentIntent: ${paymentIntentId}`);
    return this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }
}
