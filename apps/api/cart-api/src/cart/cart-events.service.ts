import { Injectable, Logger } from '@nestjs/common';
import { CartService } from './cart.service';

interface PaymentEvent {
  eventType: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
}

@Injectable()
export class CartEventsService {
  private readonly logger = new Logger(CartEventsService.name);

  constructor(private readonly cartService: CartService) {}

  async handlePaymentSuccess(event: PaymentEvent): Promise<void> {
    this.logger.log(
      `Handling payment success event for paymentIntentId: ${event.paymentIntentId}`,
    );

    const cartId = event.metadata?.cartId;
    if (!cartId) {
      this.logger.warn(
        `No cartId found in payment event metadata for paymentIntentId: ${event.paymentIntentId}`,
      );
      return;
    }

    try {
      await this.cartService.convertCart(cartId);
      this.logger.log(
        `Successfully converted cart ${cartId} for paymentIntentId: ${event.paymentIntentId}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to convert cart ${cartId}: ${err.message}`,
        err.stack,
      );
      // We don't throw here to prevent re-processing if it's a permanent error (e.g. cart already converted),
      // but in a real-world scenario we might want to dead-letter queue this.
    }
  }
}
