import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Stripe PaymentIntent ID', example: 'pi_3abc' })
  id!: string;

  @ApiProperty({ description: 'Amount in smallest currency unit', example: 2000 })
  amount!: number;

  @ApiProperty({ description: 'Three-letter ISO currency code', example: 'usd' })
  currency!: string;

  @ApiProperty({
    description: 'PaymentIntent status',
    example: 'requires_payment_method',
  })
  status!: string;

  @ApiProperty({
    description: 'Client secret for frontend confirmation',
    example: 'pi_3abc_secret_xyz',
  })
  clientSecret!: string;
}
