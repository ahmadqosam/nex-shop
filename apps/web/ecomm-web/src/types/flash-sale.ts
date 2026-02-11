export interface FlashSaleItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  salePriceInCents: number;
  maxQuantity: number;
  soldCount: number;
  remainingQuantity: number;
  productName: string;
  productImage: string;
  originalPriceInCents: number;
  category: string;
}

export interface FlashSaleDto {
  id: string;
  name: string;
  startTime: string; // ISO Date string
  endTime: string;   // ISO Date string
  isActive: boolean;
  items: FlashSaleItemDto[];
}

export interface EligibilityDto {
  eligible: boolean;
  reason?: string;
  flashSaleItemId?: string;
  salePriceInCents?: number;
  remainingQuantity?: number;
}

export interface PurchaseResultDto {
  purchaseId: string;
  flashSaleItemId: string;
  salePriceInCents: number;
  productId: string;
  variantId?: string | null;
  message: string;
}
