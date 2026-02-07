
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CartSidebar } from '../CartSidebar';
import { PRODUCTS } from '../../constants';
// Import as namespace to spy
import * as AppContextPkg from '../../context/AppContext';

// Mock useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock Image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('CartSidebar', () => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    useAppContextSpy.mockReturnValue({ ...defaultContext, isCartOpen: false });
    render(<CartSidebar />);
    expect(screen.queryByText('Your Bag')).not.toBeInTheDocument();
  });

  it('renders empty cart message when open and empty', () => {
    useAppContextSpy.mockReturnValue({ ...defaultContext, isCartOpen: true, cart: [] });
    render(<CartSidebar />);
    expect(screen.getByText('Your bag is empty.')).toBeInTheDocument();
  });

  it('renders items when cart is populated', () => {
    useAppContextSpy.mockReturnValue({ 
      ...defaultContext, 
      isCartOpen: true, 
      cart: [{ ...PRODUCTS[0], quantity: 1 }] 
    });
    render(<CartSidebar />);
    expect(screen.getByText('Your Bag (1)')).toBeInTheDocument();
    expect(screen.getByText(PRODUCTS[0].name)).toBeInTheDocument();
  });

  it('calls updateQuantity when +/- buttons clicked', () => {
    useAppContextSpy.mockReturnValue({ 
      ...defaultContext, 
      isCartOpen: true, 
      cart: [{ ...PRODUCTS[0], quantity: 1 }] 
    });
    render(<CartSidebar />);

    const plusButtons = screen.getAllByLabelText('Increase quantity');
    fireEvent.click(plusButtons[0]);
    expect(updateQuantityMock).toHaveBeenCalledWith(PRODUCTS[0].id, 2);

    const minusButtons = screen.getAllByLabelText('Decrease quantity');
    fireEvent.click(minusButtons[0]);
    expect(updateQuantityMock).toHaveBeenCalledWith(PRODUCTS[0].id, 0);
  });

  it('calls removeFromCart when remove button clicked', () => {
    useAppContextSpy.mockReturnValue({ 
      ...defaultContext, 
      isCartOpen: true, 
      cart: [{ ...PRODUCTS[0], quantity: 1 }] 
    });
    render(<CartSidebar />);

    const removeButtons = screen.getAllByLabelText('Remove item');
    fireEvent.click(removeButtons[0]);
    expect(removeFromCartMock).toHaveBeenCalledWith(PRODUCTS[0].id);
  });

  it('navigates to checkout', () => {
    useAppContextSpy.mockReturnValue({ 
      ...defaultContext, 
      isCartOpen: true, 
      cart: [{ ...PRODUCTS[0], quantity: 1 }] 
    });
    render(<CartSidebar />);

    const checkoutBtn = screen.getByText('Checkout Now');
    fireEvent.click(checkoutBtn);

    expect(toggleCartMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/checkout');
  });
});
