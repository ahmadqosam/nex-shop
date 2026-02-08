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
  return response.json();
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

export const cartService = {
  async getCart(userId?: string, sessionId?: string, token?: string): Promise<Cart> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (sessionId) params.append('sessionId', sessionId);

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse<Cart>(response);
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
    return handleResponse<Cart>(response);
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
    return handleResponse<Cart>(response);
  },

  async removeItem(cartId: string, itemId: string, token?: string): Promise<Cart> {
    const response = await fetch(`${API_BASE}/${cartId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse<Cart>(response);
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
    return handleResponse<Cart>(response);
  }
};
