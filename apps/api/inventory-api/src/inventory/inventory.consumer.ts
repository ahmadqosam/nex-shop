import { Injectable, Logger } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { InventoryService } from './inventory.service';
import { Message } from '@aws-sdk/client-sqs';

@Injectable()
export class InventoryConsumer {
  private readonly logger = new Logger(InventoryConsumer.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @SqsMessageHandler('inventory-order-events', false)
  async handleOrderEvent(message: Message) {
    try {
      const body = JSON.parse(message.Body as string);
      const event = JSON.parse(body.Message);

      if (event.eventType === 'ORDER_CONFIRMED') {
        this.logger.log(`Received ORDER_CONFIRMED event for order ${event.orderId}`);
        await this.inventoryService.syncOrderItems(event.items);
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle order event: ${error.message}`, error.stack);
    }
  }
}
