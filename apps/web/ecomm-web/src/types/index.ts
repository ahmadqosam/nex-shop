import { User } from './auth';

export type { User };

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
  variants?: ProductVariant[];
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
