import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdjustmentType {
  RESTOCK = 'restock',
  SALE = 'sale',
  RETURN = 'return',
  CORRECTION = 'correction',
}

export class AdjustInventoryDto {
  @ApiProperty({ enum: AdjustmentType, example: AdjustmentType.RESTOCK })
  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @ApiProperty({ example: 10, description: 'Positive to add, negative to subtract' })
  @IsInt()
  quantity: number;

  @ApiProperty({ example: 'Purchase Order #123', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
