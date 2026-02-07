
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CheckoutPage from '../page';
import { PRODUCTS } from '../../../constants';
import * as AppContextPkg from '../../../context/AppContext';

// Mock useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
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

  it('renders form when cart has items', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      cart: [PRODUCTS[0]],
    });

    render(<CheckoutPage />);
    expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    expect(screen.getByText(PRODUCTS[0].name)).toBeInTheDocument();
    // Default shipping < 500
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('calculates free shipping for orders over $500', () => {
     useAppContextSpy.mockReturnValue({
      ...defaultContext,
      cart: [{ ...PRODUCTS[0], quantity: 2 }], // 299 * 2 = 598 > 500
    });

    render(<CheckoutPage />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('handles order submission and success flow', async () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      cart: [PRODUCTS[0]],
    });

    render(<CheckoutPage />);

    // Fill form (all inputs are required)
    const inputs = screen.getAllByRole('textbox');
    // We have: First Name, Last Name, Address, City, Zip, Card, Expiry, CVC (password type?)
    // CVC is type="password".
    
    // Helper to fill input
    inputs.forEach(input => {
        fireEvent.change(input, { target: { value: 'Test' } });
    });
    
    // CVC
    // There is one password input for CVC
    // We can find it by placeholder "123" or by type?
    // Let's use generic verify.
    // Or simpler: fill inputs by placeholder or label?
    // Labels are "First Name", etc.
    // I'll assume `getAllByRole('textbox')` covers text inputs.
    // CVC is password, so it's not 'textbox' role usually?
    // Let's find by placeholder '123'
    const cvc = screen.getByPlaceholderText('123');
    fireEvent.change(cvc, { target: { value: '123' } });

    const submitBtn = screen.getByText(/Pay \$/);
    fireEvent.click(submitBtn);

    // Should show processing
    expect(screen.getByText('Processing Securely...')).toBeInTheDocument();

    // Fast forward time
    act(() => {
        vi.advanceTimersByTime(2500);
    });

    // Should show success
    expect(screen.getByText('Order Confirmed!')).toBeInTheDocument();
    
    // Should clear cart
    expect(clearCartMock).toHaveBeenCalled();

    // Click back to home
    fireEvent.click(screen.getByText('Back to Home'));
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
