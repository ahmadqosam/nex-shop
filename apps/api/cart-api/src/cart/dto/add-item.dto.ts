import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class AddItemDto {
  @ApiProperty({ description: 'Product ID from product-api' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Variant ID from product-api' })
  @IsString()
  variantId: string;

  @ApiProperty({ description: 'SKU of the variant' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Quantity to add', minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Price in cents at time of adding' })
  @IsInt()
  @IsPositive()
  priceInCents: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Product name for display' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Variant name for display' })
  @IsString()
  variantName: string;

  @ApiProperty({ description: 'Image URL for display', required: false })
  @IsOptional()
  imageUrl?: string;
}
