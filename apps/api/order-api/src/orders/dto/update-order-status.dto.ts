import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/order-api-client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: 'CONFIRMED' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
