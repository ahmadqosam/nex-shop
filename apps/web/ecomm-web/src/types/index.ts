export * from './flash-sale';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock?: number;
  features?: string[];
  specs?: Record<string, string>;
  isNew?: boolean;
  isBestSeller?: boolean;
  colors?: string[];
  variants?: ProductVariant[];
  flashSale?: {
    flashSaleItemId: string;
    salePriceInCents: number;
    originalPriceInCents: number;
    remainingQuantity: number;
    maxQuantity: number;
    saleEndTime: string;
    saleName: string;
  };
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  attributes: Record<string, string>;
}

export interface CartItem {
  id: string; // This is the API's item ID, not product ID
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  subtotal: number;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddItemDto {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  priceInCents: number;
  currency?: string;
  productName: string;
  variantName: string;
  imageUrl?: string;
}

export interface UpdateQuantityDto {
  quantity: number;
}
