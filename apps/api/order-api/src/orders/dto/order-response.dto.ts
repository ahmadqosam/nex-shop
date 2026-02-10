import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/order-api-client';

export class OrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() variantId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPriceInCents!: number;
  @ApiProperty() totalPriceInCents!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() variantName!: string;
  @ApiPropertyOptional() imageUrl?: string | null;
}

export class ShippingAddressResponseDto {
  @ApiProperty() fullName!: string;
  @ApiProperty() addressLine1!: string;
  @ApiPropertyOptional() addressLine2?: string;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiProperty() postalCode!: string;
  @ApiProperty() country!: string;
  @ApiPropertyOptional() phone?: string;
}

export class OrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ type: [OrderItemResponseDto] }) items!: OrderItemResponseDto[];
  @ApiProperty({ type: ShippingAddressResponseDto })
  shippingAddress!: ShippingAddressResponseDto;
  @ApiProperty() subtotalInCents!: number;
  @ApiProperty() shippingCostInCents!: number;
  @ApiProperty() totalInCents!: number;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() notes?: string | null;
  @ApiPropertyOptional() paidAt?: Date | null;
  @ApiPropertyOptional() shippedAt?: Date | null;
  @ApiPropertyOptional() deliveredAt?: Date | null;
  @ApiPropertyOptional() cancelledAt?: Date | null;
  @ApiPropertyOptional() cancellationReason?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasPrevious!: boolean;
  @ApiProperty() hasNext!: boolean;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) data!: OrderResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
