import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqsModule } from '@ssut/nestjs-sqs';
import { SNSClient } from '@aws-sdk/client-sns';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEventsService } from './order-events.service';
import { SqsConsumerService } from './sqs-consumer.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 5000 }),
    SqsModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') === 'development';
        if (!isDev) return { consumers: [], producers: [] };

        return {
          consumers: [
            {
              name: 'order-payment-events-queue',
              queueUrl: config.get('SQS_QUEUE_URL', 'http://localhost:4566/000000000000/order-payment-events-queue'),
              region: config.get('AWS_REGION', 'us-east-1'),
            },
          ],
          producers: [], // We only consume
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderEventsService,
    SqsConsumerService,
    {
      provide: SNSClient,
      useFactory: (config: ConfigService) => {
        return new SNSClient({
          region: config.get('AWS_REGION', 'us-east-1'),
          endpoint: config.get('SNS_ENDPOINT', 'http://localhost:4566'),
          credentials: {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'test'),
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'test'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [OrdersService, OrderEventsService, SNSClient],
})
export class OrdersModule {}
