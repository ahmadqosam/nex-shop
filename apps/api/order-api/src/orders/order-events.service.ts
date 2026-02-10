import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
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
  private readonly topicArn: string;

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly snsClient: SNSClient,
    private readonly config: ConfigService,
  ) {
    this.topicArn = this.config.get<string>(
      'ORDER_EVENTS_TOPIC_ARN',
      'arn:aws:sns:us-east-1:000000000000:order-events',
    );
  }

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
      const order = await this.ordersService.updateStatus(orderId, updateDto);
      this.logger.log(
        `Successfully updated order ${orderId} to CONFIRMED for paymentIntentId: ${event.paymentIntentId}`,
      );

      // Publish order confirmed event is handled in OrdersService.updateStatus
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to update order ${orderId}: ${err.message}`,
        err.stack,
      );
      // We don't throw here to prevent re-processing if it's a permanent error
    }
  }

  async publishOrderConfirmed(order: any): Promise<void> {
    try {
      const event = {
        eventType: 'ORDER_CONFIRMED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        email: order.email,
        totalInCents: order.totalInCents,
        currency: order.currency,
        items: order.items,
        occurredAt: new Date().toISOString(),
      };

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(event),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'ORDER_CONFIRMED',
          },
        },
      });

      await this.snsClient.send(command);
      this.logger.log(`Published ORDER_CONFIRMED event for order ${order.id}`);
    } catch (error) {
       const err = error as Error;
      this.logger.error(
        `Failed to publish ORDER_CONFIRMED event for order ${order.id}: ${err.message}`,
        err.stack,
      );
    }
  }
}
