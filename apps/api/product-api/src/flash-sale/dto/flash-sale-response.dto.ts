import { ApiProperty } from '@nestjs/swagger';

export class FlashSaleItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ required: false, nullable: true })
  variantId: string | null;

  @ApiProperty()
  salePriceInCents: number;

  @ApiProperty()
  maxQuantity: number;

  @ApiProperty()
  soldCount: number;

  @ApiProperty()
  remainingQuantity: number;

  @ApiProperty({ required: false })
  productName?: string;

  @ApiProperty({ required: false })
  productImage?: string;

  @ApiProperty({ required: false })
  originalPriceInCents?: number;

  @ApiProperty({ required: false })
  category?: string;
}

export class FlashSaleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [FlashSaleItemResponseDto] })
  items: FlashSaleItemResponseDto[];
}

export class EligibilityResponseDto {
  @ApiProperty()
  eligible: boolean;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  flashSaleItemId?: string;

  @ApiProperty({ required: false })
  salePriceInCents?: number;

  @ApiProperty({ required: false })
  remainingQuantity?: number;
}

export class PurchaseResultDto {
  @ApiProperty()
  purchaseId: string;

  @ApiProperty()
  flashSaleItemId: string;

  @ApiProperty()
  salePriceInCents: number;

  @ApiProperty()
  productId: string;

  @ApiProperty({ required: false })
  variantId?: string | null;

  @ApiProperty()
  message: string;
}


