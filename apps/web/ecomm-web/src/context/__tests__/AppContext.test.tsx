
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppProvider, useAppContext } from '../AppContext';
import { PRODUCTS } from '../../constants';
import { cartService } from '../../services/cartService';

// Mock authService
vi.mock('../../services/authService', () => ({
  login: vi.fn().mockResolvedValue({ accessToken: 'mock-token', expiresIn: 900 }),
  register: vi.fn().mockResolvedValue({ accessToken: 'mock-token', expiresIn: 900 }),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshToken: vi.fn().mockResolvedValue({ accessToken: 'new-token', expiresIn: 900 }),
  AuthServiceError: class AuthServiceError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = 'AuthServiceError';
      this.statusCode = statusCode;
    }
  },
}));

// Mock cartService
vi.mock('../../services/cartService', () => ({
  cartService: {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    mergeCart: vi.fn(),
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  const mockCart = {
    id: 'cart-123',
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
  };

  const mockCartWithItem = {
    ...mockCart,
    items: [{
      id: 'item-1',
      productId: PRODUCTS[0].id,
      quantity: 1,
      price: PRODUCTS[0].price,
      productName: PRODUCTS[0].name,
      variantName: 'Standard',
    }]
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.clearAllMocks();
    (cartService.getCart as any).mockResolvedValue(mockCart);
  });

  it('initializes and fetches cart', async () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.cartId).toBe('cart-123');
    });

    expect(localStorage.getItem('nex_session_id')).toBeTruthy();
    expect(cartService.getCart).toHaveBeenCalled();
  });

  it('adds items to cart', async () => {
    (cartService.addItem as any).mockResolvedValue(mockCartWithItem);
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Wait for init
    await waitFor(() => expect(result.current.cartId).toBe('cart-123'));

    await act(async () => {
      await result.current.addToCart(PRODUCTS[0]);
    });

    expect(cartService.addItem).toHaveBeenCalledWith(
      'cart-123',
      expect.objectContaining({ productId: PRODUCTS[0].id }),
      undefined
    );
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.isCartOpen).toBe(true);
  });

  it('updates quantity', async () => {
    // Initial fetch
    (cartService.getCart as any).mockResolvedValueOnce(mockCartWithItem);
    
    // Update response
    const updatedCart = {
      ...mockCartWithItem,
      items: [{ ...mockCartWithItem.items[0], quantity: 5 }]
    };
    (cartService.updateItem as any).mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Wait for initial load
    await waitFor(() => {
        expect(result.current.cart.length).toBe(1);
    });

    await act(async () => {
      await result.current.updateQuantity('item-1', 5);
    });

    expect(cartService.updateItem).toHaveBeenCalledWith(
      'cart-123',
      'item-1',
      5,
      undefined
    );
    
    await waitFor(() => {
        expect(result.current.cart[0].quantity).toBe(5);
    });
  });

  it('removes item when quantity is 0', async () => {
    (cartService.getCart as any).mockResolvedValueOnce(mockCartWithItem);
    (cartService.removeItem as any).mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useAppContext(), { wrapper });
    await waitFor(() => expect(result.current.cart).toHaveLength(1));

    await act(async () => {
      await result.current.updateQuantity('item-1', 0);
    });

    expect(cartService.removeItem).toHaveBeenCalledWith(
      'cart-123',
      'item-1',
      undefined
    );
     await waitFor(() => {
        expect(result.current.cart).toHaveLength(0);
    });
  });

  it('merges cart on login', async () => {
    const mockEmptyGuestCart = { ...mockCart, id: 'guest-cart' };
    (cartService.getCart as any).mockResolvedValueOnce(mockEmptyGuestCart); // 1. Initial guest cart
    
    // 2. Re-fetch triggered by cleanup/login effect or race? 
    // Actually login triggers user update -> triggers fetchCart.
    // So we expect getCart to be called again.
    (cartService.getCart as any).mockResolvedValueOnce(mockCartWithItem); 

    (cartService.mergeCart as any).mockResolvedValueOnce(mockCartWithItem);
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    await waitFor(() => expect(result.current.cartId).toBe('guest-cart'));
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(cartService.mergeCart).toHaveBeenCalledWith(
      expect.any(String), // sessionId
      'test@example.com',
      'mock-token'
    );
    expect(result.current.cart).toHaveLength(1);
  });

  it('clears local state on logout', async () => {
    // 1. Initial load
    (cartService.getCart as any).mockResolvedValueOnce(mockCartWithItem);
    
    // 2. Login merge
    (cartService.mergeCart as any).mockResolvedValueOnce(mockCartWithItem);

    // 3. Logout triggers re-fetch (with new session) -> should be empty
    (cartService.getCart as any).mockResolvedValueOnce(mockCart); 

    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Wait for initial load
    await waitFor(() => expect(result.current.cartId).toBe('cart-123'));

    // Simulate logged in state
    await act(async () => {
      await result.current.login('test@example.com', 'pwd');
    });

    await act(async () => {
        await result.current.logout();
    });

    await waitFor(() => {
         expect(result.current.cart).toEqual([]);
         expect(result.current.user).toBeNull();
    });
   
    // Session ID should be regenerated
    expect(localStorage.getItem('nex_session_id')).toBeTruthy();
  });
});
