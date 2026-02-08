import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ example: 'NEX-ACE-BLK' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 100, default: 0 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 10, default: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @ApiProperty({ example: 'WH-001', required: false })
  @IsString()
  @IsOptional()
  warehouseCode?: string;
}
