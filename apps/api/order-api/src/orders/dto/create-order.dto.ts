import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  ValidateNested,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @MaxLength(2)
  country!: string;

  @ApiPropertyOptional({ example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class CreateOrderItemDto {
  @ApiProperty({ example: 'prod-uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'variant-uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: 'NEX-ACE-BLK' })
  @IsString()
  sku!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 34999 })
  @IsInt()
  @Min(0)
  unitPriceInCents!: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Nex Ace' })
  @IsString()
  productName!: string;

  @ApiProperty({ example: 'Midnight Black' })
  @IsString()
  variantName!: string;

  @ApiPropertyOptional({ example: '/images/products/nex-ace-1.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Cart ID to create order from' })
  @IsOptional()
  @IsUUID()
  cartId?: string;

  @ApiPropertyOptional({
    description: 'Direct items (when not using cart)',
    type: [CreateOrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ValidateIf((o) => !o.cartId)
  items?: CreateOrderItemDto[];

  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiPropertyOptional({ example: 'Please leave at the front door' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
