import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { CacheModule } from '../cache';
import { FlashSaleController } from './flash-sale.controller';
import { FlashSaleService } from './flash-sale.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [FlashSaleController],
  providers: [FlashSaleService],
  exports: [FlashSaleService],
})
export class FlashSaleModule {}


