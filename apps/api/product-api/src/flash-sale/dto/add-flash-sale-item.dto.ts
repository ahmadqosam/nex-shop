import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddFlashSaleItemDto {
  @ApiProperty({ description: 'ID of the product to add to the flash sale' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Optional variant ID if the flash sale targets a specific variant',
    required: false,
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({
    description: 'Sale price in cents',
    example: 9900,
  })
  @IsInt()
  @Min(1)
  salePriceInCents: number;

  @ApiProperty({
    description: 'Maximum quantity available for this flash sale item',
    example: 100,
  })
  @IsInt()
  @Min(1)
  maxQuantity: number;
}


