import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VariantAttributesDto {
  @ApiPropertyOptional({ example: '#000000', description: 'Color hex code' })
  color?: string;

  @ApiPropertyOptional({ example: 'L', description: 'Size' })
  size?: string;

  @ApiPropertyOptional({ example: '256GB', description: 'Storage capacity' })
  storage?: string;

  [key: string]: unknown;
}

export class VariantResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Variant unique identifier',
  })
  id: string;

  @ApiProperty({ example: 'NEX-ACE-BLK', description: 'Stock Keeping Unit' })
  sku: string;

  @ApiProperty({ example: 'Black', description: 'Variant name' })
  name: string;

  @ApiPropertyOptional({
    example: 44900,
    description: 'Price override in cents (null = use product base price)',
  })
  priceInCents: number | null;

  @ApiProperty({
    type: VariantAttributesDto,
    description: 'Variant attributes (color, size, etc.)',
  })
  attributes: VariantAttributesDto;
}

export class ProductSpecificationsDto {
  @ApiPropertyOptional({ example: '40mm' })
  driver_size?: string;

  @ApiPropertyOptional({ example: '30 hours' })
  battery_life?: string;

  @ApiPropertyOptional({ example: '5.2' })
  bluetooth?: string;

  @ApiPropertyOptional({ example: '280g' })
  weight?: string;

  @ApiPropertyOptional({ example: '651mm' })
  width?: string;

  @ApiPropertyOptional({ example: '100mm' })
  height?: string;

  @ApiPropertyOptional({ example: '69mm' })
  depth?: string;

  @ApiPropertyOptional({ example: 'IP67' })
  water_resistance?: string;

  @ApiPropertyOptional({ example: '20Hz - 20kHz' })
  frequency_response?: string;

  @ApiPropertyOptional({ example: 'Active' })
  noise_cancellation?: string;

  @ApiPropertyOptional({ example: 'Dolby Atmos, DTS:X' })
  audio_format?: string;

  @ApiPropertyOptional({ example: 'HDMI eARC, WiFi, Bluetooth' })
  connectivity?: string;
}

export class ProductResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier',
  })
  id: string;

  @ApiProperty({ example: 'Nex Ace', description: 'Product name' })
  name: string;

  @ApiProperty({ example: 'nex-ace', description: 'URL-friendly slug' })
  slug: string;

  @ApiProperty({ example: 'Headphone', description: 'Product category' })
  category: string;

  @ApiProperty({ example: 44900, description: 'Base price in cents' })
  basePriceInCents: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({
    example: 'Premium wireless headphones with active noise cancellation',
    description: 'Product description',
  })
  description?: string;

  @ApiProperty({
    example: ['New Arrival', 'Best Seller'],
    description: 'Product tags',
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    example: ['/images/products/nex-ace-1.jpg'],
    description: 'Product image URLs',
    type: [String],
  })
  images: string[];

  @ApiPropertyOptional({
    type: ProductSpecificationsDto,
    description: 'Technical specifications',
  })
  specifications?: ProductSpecificationsDto;

  @ApiProperty({ example: true, description: 'Product availability' })
  isAvailable: boolean;

  @ApiPropertyOptional({ example: 280, description: 'Weight in grams' })
  weightInGrams?: number | null;

  @ApiProperty({
    type: [VariantResponseDto],
    description: 'Product variants',
  })
  variants: VariantResponseDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
