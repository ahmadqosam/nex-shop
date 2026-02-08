import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cartService, CartServiceError } from '../cartService';
import { AddItemDto } from '../../types';

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('cartService', () => {
  const API_BASE = '/api/cart';
  const mockCartId = 'cart-123';
  const mockToken = 'test-token';
  const mockCart = { id: mockCartId, items: [] };

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCart', () => {
    it('should fetch cart without params', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      const result = await cartService.getCart();

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}?`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockCart);
    });

    it('should fetch cart with userId and sessionId', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      await cartService.getCart('user-1', 'session-1');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-1'),
        expect.objectContaining({
            method: 'GET'
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('sessionId=session-1'),
         expect.objectContaining({
            method: 'GET'
        })
      );
    });

    it('should include auth token if provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      await cartService.getCart(undefined, undefined, mockToken);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });
  });

  describe('addItem', () => {
    const mockItemDto: AddItemDto = {
      productId: 'p-1',
      variantId: 'v-1',
      sku: 'SKU-1',
      quantity: 1,
      priceInCents: 1000,
      productName: 'Test Product',
      variantName: 'Default',
    };

    it('should add item to cart', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      await cartService.addItem(mockCartId, mockItemDto);

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/${mockCartId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockItemDto),
      });
    });

    it('should throw error on failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid item' }),
      });

      await expect(cartService.addItem(mockCartId, mockItemDto)).rejects.toThrow(
        'Invalid item'
      );
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      await cartService.updateItem(mockCartId, 'item-1', 5);

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/${mockCartId}/items/item-1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 5 }),
      });
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      await cartService.removeItem(mockCartId, 'item-1');

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/${mockCartId}/items/item-1`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('clearCart', () => {
    it('should clear the cart', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // DELETE usually returns empty or success message
      });

      await cartService.clearCart(mockCartId);

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/${mockCartId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('mergeCart', () => {
    it('should merge guest cart into user cart', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCart,
      });

      await cartService.mergeCart('session-1', 'user-1', mockToken);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`${API_BASE}/merge?`),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('sessionId=session-1'),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-1'),
        expect.anything()
      );
    });
  });
});
