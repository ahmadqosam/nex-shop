import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqsModule } from '@ssut/nestjs-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { CacheModule } from './cache';
import { InventoryModule } from './inventory/inventory.module';
import { configValidationSchema } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    CacheModule,
    InventoryModule,
    SqsModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const queueUrl = configService.get<string>(
          'INVENTORY_ORDER_EVENTS_QUEUE_URL',
          'http://localhost:4566/000000000000/inventory-order-events-queue',
        );
        return {
          consumers: [
            {
              name: 'inventory-order-events',
              queueUrl,
              region: 'us-east-1',
              sqs: new SQSClient({
                region: 'us-east-1',
                credentials: {
                  accessKeyId: configService.get<string>(
                    'AWS_ACCESS_KEY_ID',
                    'test',
                  ),
                  secretAccessKey: configService.get<string>(
                    'AWS_SECRET_ACCESS_KEY',
                    'test',
                  ),
                },
                endpoint: configService.get<string>(
                  'AWS_ENDPOINT',
                  'http://localhost:4566',
                ),
              }),
            },
          ],
          producers: [],
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
