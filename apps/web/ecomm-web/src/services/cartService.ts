import { Cart, CartItem, AddItemDto } from '../types';

const API_BASE = '/api/cart';

export class CartServiceError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = 'CartServiceError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new CartServiceError(
      errorData.message || response.statusText,
      response.status
    );
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Need to define backend types if not imported, or use any for raw response
interface ApiCart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: ApiCartItem[];
  status: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiCartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  priceInCents: number;
  currency: string;
  productName: string;
  variantName: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

function transformCart(apiCart: ApiCart): Cart {
  return {
    id: apiCart.id,
    userId: apiCart.userId,
    sessionId: apiCart.sessionId,
    items: apiCart.items.map(item => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      name: item.productName, // Alias for compatibility with Product interface/alt text
      variantName: item.variantName,
      sku: item.sku,
      price: item.priceInCents / 100,
      quantity: item.quantity,
      image: item.imageUrl || '',
      subtotal: (item.priceInCents * item.quantity) / 100,
    })),
    totalQuantity: apiCart.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: apiCart.items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0) / 100,
    createdAt: apiCart.createdAt,
    updatedAt: apiCart.updatedAt,
  };
}

export const cartService = {
  async getCart(userId?: string, sessionId?: string, token?: string): Promise<Cart> {
    const headers = getHeaders(token);
    if (userId) {
      (headers as Record<string, string>)['x-user-id'] = userId;
    }
    if (sessionId) {
      (headers as Record<string, string>)['x-session-id'] = sessionId;
    }

    const response = await fetch(`${API_BASE}`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse<ApiCart>(response);
    return transformCart(data);
  },

  async getCartSummary(cartId: string, token?: string): Promise<any> {
    const response = await fetch(`${API_BASE}/${cartId}/summary`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse<any>(response);
  },

  async addItem(cartId: string, item: AddItemDto, token?: string): Promise<Cart> {
    const response = await fetch(`${API_BASE}/${cartId}/items`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(item),
    });
    const data = await handleResponse<ApiCart>(response);
    return transformCart(data);
  },

  async updateItem(
    cartId: string,
    itemId: string,
    quantity: number,
    token?: string
  ): Promise<Cart> {
    const response = await fetch(`${API_BASE}/${cartId}/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ quantity }),
    });
    const data = await handleResponse<ApiCart>(response);
    return transformCart(data);
  },

  async removeItem(cartId: string, itemId: string, token?: string): Promise<Cart> {
    const response = await fetch(`${API_BASE}/${cartId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    const data = await handleResponse<ApiCart>(response);
    return transformCart(data);
  },

  async clearCart(cartId: string, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${cartId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new CartServiceError(
          errorData.message || response.statusText,
          response.status
        );
    }
  },

  async mergeCart(sessionId: string, userId: string, token?: string): Promise<Cart> {
    const params = new URLSearchParams({ sessionId, userId });
    const response = await fetch(`${API_BASE}/merge?${params.toString()}`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    const data = await handleResponse<ApiCart>(response);
    return transformCart(data);
  }
};
