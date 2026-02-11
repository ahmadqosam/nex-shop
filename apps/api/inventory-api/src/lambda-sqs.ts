import { NestFactory } from '@nestjs/core';
import { Context, SQSEvent, SQSHandler } from 'aws-lambda';
import { AppModule } from './app.module';
import { InventoryService } from './inventory/inventory.service';
import { INestApplicationContext, Logger } from '@nestjs/common';

let cachedApp: INestApplicationContext;

async function bootstrap() {
  if (!cachedApp) {
    cachedApp = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });
    await cachedApp.init();
  }
  return cachedApp;
}

export const handler: SQSHandler = async (
  event: SQSEvent,
  context: Context,
) => {
  const app = await bootstrap();
  const service = app.get(InventoryService);
  const logger = new Logger('SQSHandler');

  logger.log(`Received ${event.Records.length} records`);

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);
        const message = body.Message ? JSON.parse(body.Message) : body;

        if (message.eventType === 'ORDER_CONFIRMED') {
          logger.log(`Processing ORDER_CONFIRMED for order ${message.orderId}`);
          await service.syncOrderItems(message.items);
        } else {
          logger.warn(`Ignoring event type: ${message.eventType}`);
        }
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error processing record ${record.messageId}: ${err.message}`,
          err.stack,
        );
      }
    }),
  );
};
