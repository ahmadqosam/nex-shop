import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CheckoutPage from '../page';
import { PRODUCTS } from '../../../constants';
import * as AppContextPkg from '../../../context/AppContext';

// Mock useRouter
const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}));

// Mock Image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('CheckoutPage', () => {
  const addToCartMock = vi.fn();
  const removeFromCartMock = vi.fn();
  const updateQuantityMock = vi.fn();
  const toggleCartMock = vi.fn();
  const clearCartMock = vi.fn();
  const loginMock = vi.fn();
  const logoutMock = vi.fn();

  const defaultContext = {
    cart: [],
    user: null,
    isCartOpen: false,
    addToCart: addToCartMock,
    removeFromCart: removeFromCartMock,
    updateQuantity: updateQuantityMock,
    toggleCart: toggleCartMock,
    clearCart: clearCartMock,
    login: loginMock,
    logout: logoutMock,
  };

  const useAppContextSpy = vi.spyOn(AppContextPkg, 'useAppContext');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders empty bag message when cart is empty', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<CheckoutPage />);
    expect(screen.getByText('Your bag is empty.')).toBeInTheDocument();
  });

  it('renders form segments when cart has items', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      cart: [PRODUCTS[0]],
    });

    render(<CheckoutPage />);
    expect(screen.getByText('1. Contact Information')).toBeInTheDocument();
    expect(screen.getByText('2. Delivery Method')).toBeInTheDocument();
    expect(screen.getByText('3. Payment Method')).toBeInTheDocument();
    expect(screen.getByText(PRODUCTS[0].name)).toBeInTheDocument();
  });

  it('pre-fills form if user is logged in', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      cart: [PRODUCTS[0]],
      user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    });

    render(<CheckoutPage />);
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });

  it('handles order completion flow', async () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      cart: [PRODUCTS[0]],
    });

    render(<CheckoutPage />);

    // Need to agree to terms first
    const terms = screen.getByText(/I accept the/i);
    fireEvent.click(terms);

    const checkoutBtn = screen.getByRole('button', { name: /Checkout/i });
    fireEvent.click(checkoutBtn);

    // Should show processing
    expect(screen.getByText('Processing...')).toBeInTheDocument();

    // Fast forward time
    act(() => {
        vi.advanceTimersByTime(2000);
    });

    // Should show success
    expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    
    // Should clear cart
    expect(clearCartMock).toHaveBeenCalled();

    // Click continue shopping
    fireEvent.click(screen.getByText('Continue Shopping'));
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
