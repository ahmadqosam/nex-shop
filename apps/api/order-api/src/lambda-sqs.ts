import { NestFactory } from '@nestjs/core';
import { Context, SQSEvent, SQSHandler } from 'aws-lambda';
import { AppModule } from './app.module';
import { OrderEventsService } from './orders/order-events.service';
import { INestApplicationContext, Logger } from '@nestjs/common';

let cachedApp: INestApplicationContext;

async function bootstrap() {
  if (!cachedApp) {
    cachedApp = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });
    // This is needed to ensure the app is fully initialized (e.g. database connections)
    await cachedApp.init();
  }
  return cachedApp;
}

export const handler: SQSHandler = async (
  event: SQSEvent,
  context: Context,
) => {
  const app = await bootstrap();
  const service = app.get(OrderEventsService);
  const logger = new Logger('SQSHandler');

  logger.log(`Received ${event.Records.length} records`);

  // Process records in parallel (or sequential if order matters, but here independent)
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);

        // SNS wraps the message, so we might need to unwrap it if it came from SNS->SQS subscription
        const message = body.Message ? JSON.parse(body.Message) : body;

        if (message.eventType === 'payment_intent.succeeded') {
          await service.handlePaymentSuccess(message);
        } else {
          logger.warn(`Ignoring event type: ${message.eventType}`);
        }
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error processing record ${record.messageId}: ${err.message}`,
          err.stack,
        );
        // If we throw here, the entire batch might be retried or this single message returned to queue
        // For simplicity in this iteration, we log and swallow to avoid infinite retry loops for bad data
        // Ideally we would use batchItemFailures for partial batch failure
      }
    }),
  );
};
