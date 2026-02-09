import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
