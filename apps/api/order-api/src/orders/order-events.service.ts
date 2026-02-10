import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto';
import { OrderStatus } from '@prisma/order-api-client';

interface PaymentEvent {
  eventType: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
}

@Injectable()
export class OrderEventsService {
  private readonly logger = new Logger(OrderEventsService.name);

  constructor(private readonly ordersService: OrdersService) {}

  async handlePaymentSuccess(event: PaymentEvent): Promise<void> {
    this.logger.log(
      `Handling payment success event for paymentIntentId: ${event.paymentIntentId}`,
    );

    const orderId = event.metadata?.orderId;
    if (!orderId) {
      this.logger.warn(
        `No orderId found in payment event metadata for paymentIntentId: ${event.paymentIntentId}`,
      );
      return;
    }

    try {
      const updateDto: UpdateOrderStatusDto = {
        status: OrderStatus.CONFIRMED,
      };
      await this.ordersService.updateStatus(orderId, updateDto);
      this.logger.log(
        `Successfully updated order ${orderId} to CONFIRMED for paymentIntentId: ${event.paymentIntentId}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to update order ${orderId}: ${err.message}`,
        err.stack,
      );
      // We don't throw here to prevent re-processing if it's a permanent error
    }
  }
}
