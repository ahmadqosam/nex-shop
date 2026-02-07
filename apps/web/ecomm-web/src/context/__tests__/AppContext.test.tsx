
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider, useAppContext } from '../AppContext';
import { PRODUCTS } from '../../constants';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes from local storage', () => {
    const savedCart = JSON.stringify([{ ...PRODUCTS[0], quantity: 2 }]);
    const savedUser = JSON.stringify({ name: 'Stored User', email: 'stored@test.com' });

    // We need to set items before render
    localStorage.setItem('nex_cart', savedCart);
    localStorage.setItem('nex_user', savedUser);

    const { result } = renderHook(() => useAppContext(), { wrapper });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.user?.name).toBe('Stored User');
  });

  it('provides initial state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.cart).toEqual([]);
    expect(result.current.user).toBeNull();
    expect(result.current.isCartOpen).toBe(false);
  });

  it('adds items to cart', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const product = PRODUCTS[0];

    act(() => {
      result.current.addToCart(product);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe(product.id);
    expect(result.current.cart[0].quantity).toBe(1);

    act(() => {
      result.current.addToCart(product, 2);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);

    // Add another product to test map branches
    const product2 = PRODUCTS[1];
    act(() => {
        result.current.addToCart(product2);
    });
    expect(result.current.cart).toHaveLength(2);

    // Update first product again
    act(() => {
        result.current.addToCart(product, 1);
    });
    expect(result.current.cart[0].quantity).toBe(4); // 3 + 1
    expect(result.current.cart[1].quantity).toBe(1); // Unchanged
  });

  it('removes items from cart', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const product = PRODUCTS[0];

    act(() => {
      result.current.addToCart(product);
    });

    act(() => {
      result.current.removeFromCart(product.id);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it('updates quantity', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const product = PRODUCTS[0];

    act(() => {
      result.current.addToCart(product);
    });

    act(() => {
      result.current.updateQuantity(product.id, 5);
    });

    expect(result.current.cart[0].quantity).toBe(5);

    // Add second item
    const product2 = PRODUCTS[1];
    act(() => {
        result.current.addToCart(product2);
    });

    // Update first item
    act(() => {
        result.current.updateQuantity(product.id, 6);
    });

    expect(result.current.cart[0].quantity).toBe(6);
    expect(result.current.cart[1].quantity).toBe(1); // Unchanged

    act(() => {
      result.current.updateQuantity(product.id, 0);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe(product2.id); // Should remain
  });

  it('clears cart', () => {
     const { result } = renderHook(() => useAppContext(), { wrapper });
     act(() => result.current.addToCart(PRODUCTS[0]));
     act(() => result.current.clearCart());
     expect(result.current.cart).toHaveLength(0);
  });

  it('toggles cart', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.isCartOpen).toBe(false);

    act(() => {
      result.current.toggleCart();
    });

    expect(result.current.isCartOpen).toBe(true);
  });

  it('handles login and logout', async () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'Password123');
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('test@example.com');
    // Check local storage (only user persisted, NOT tokens)
    expect(localStorage.getItem('nex_user')).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('nex_user')).toBeNull();
  });
});
