export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  features: string[];
  specs: { [key: string]: string };
  isNew?: boolean;
  isBestSeller?: boolean;
  colors?: string[];
  stock?: number;
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

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
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

export interface AppState {
  cart: CartItem[];
  user: User | null;
  isCartOpen: boolean;
}

// API DTOs
export interface VariantAttributesDto {
  color?: string;
  size?: string;
  storage?: string;
  [key: string]: string | undefined;
}

export interface VariantResponseDto {
  id: string;
  sku: string;
  name: string;
  priceInCents: number | null;
  attributes: VariantAttributesDto;
}

export interface ProductSpecificationsDto {
  driver_size?: string;
  battery_life?: string;
  bluetooth?: string;
  weight?: string;
  width?: string;
  height?: string;
  depth?: string;
  water_resistance?: string;
  frequency_response?: string;
  noise_cancellation?: string;
  audio_format?: string;
  connectivity?: string;
  [key: string]: string | undefined;
}

export interface ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  category: string;
  basePriceInCents: number;
  currency: string;
  description: string;
  tags: string[];
  images: string[];
  specifications: ProductSpecificationsDto;
  isAvailable: boolean;
  weightInGrams: number;
  variants: VariantResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PaginatedProductsResponseDto {
  data: ProductResponseDto[];
  meta: PaginationMetaDto;
}
