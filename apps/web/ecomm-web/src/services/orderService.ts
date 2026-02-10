const API_BASE = '/api/orders';

export interface CreateOrderItemDto {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  unitPriceInCents: number;
  currency?: string;
  productName: string;
  variantName: string;
  imageUrl?: string;
}

export interface ShippingAddressDto {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateOrderDto {
  cartId?: string;
  items?: CreateOrderItemDto[];
  userId: string;
  email: string;
  shippingAddress: ShippingAddressDto;
  notes?: string;
}

export interface OrderResponse {
  id: string;
  status: string;
  totalInCents: number;
  currency: string;
}

export const orderService = {
  async createOrder(data: CreateOrderDto, token?: string): Promise<OrderResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create order');
    }

    return response.json();
  }
};
