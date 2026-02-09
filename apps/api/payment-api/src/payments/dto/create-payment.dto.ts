import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, Min, IsOptional, IsObject } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Amount in smallest currency unit (e.g. cents)',
    example: 2000,
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({
    description: 'Three-letter ISO currency code',
    example: 'usd',
  })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({
    description: 'Optional key-value metadata',
    example: { orderId: 'order-123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
