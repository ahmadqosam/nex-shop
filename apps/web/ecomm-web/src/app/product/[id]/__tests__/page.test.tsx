
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProductDetailClient from '../ProductDetailClient';
import * as AppContextPkg from '../../../../context/AppContext';
import * as navigation from 'next/navigation';

// Mock Image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

// Mock navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('ProductDetailClient', () => {
  const addToCartMock = vi.fn();
  const toggleCartMock = vi.fn(); // Mock toggleCart
  const pushMock = vi.fn();
  const backMock = vi.fn();

  const defaultContext = {
    cart: [],
    user: null,
    isCartOpen: false,
    addToCart: addToCartMock,
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    toggleCart: toggleCartMock, // Add to context
    clearCart: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    isAuthLoading: false,
    authError: null,
    clearAuthError: vi.fn(),
    register: vi.fn(),
  };

  const useAppContextSpy = vi.spyOn(AppContextPkg, 'useAppContext');
  const useRouterMock = vi.mocked(navigation.useRouter);

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 999,
    description: 'Test Description',
    image: '/test.jpg',
    category: 'Test Category',
    features: [],
    specs: { 'Battery': '24h' },
    isNew: false,
    colors: ['#000000', '#FFFFFF']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextSpy.mockReturnValue(defaultContext);
    useRouterMock.mockReturnValue({ push: pushMock, back: backMock } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders product details correctly', () => {
    render(<ProductDetailClient product={mockProduct} />);
    
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price}`)).toBeInTheDocument();
  });

  it('handles back button', () => {
    render(<ProductDetailClient product={mockProduct} />);
    
    const backBtn = screen.getByText('Back to Collection');
    fireEvent.click(backBtn);
    expect(backMock).toHaveBeenCalled();
  });

  it('updates quantity', () => {
    render(<ProductDetailClient product={mockProduct} />);
    
    const qtyDisplay = screen.getByText('1');
    const plusBtn = qtyDisplay.nextSibling as HTMLElement; 
    
    fireEvent.click(plusBtn);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('adds to cart', () => {
    render(<ProductDetailClient product={mockProduct} />);
    
    const addBtn = screen.getByText(/Add to Bag/);
    fireEvent.click(addBtn);
    
    expect(addToCartMock).toHaveBeenCalled(); // verify called
    expect(toggleCartMock).toHaveBeenCalled(); // verify cart opened
  });
});
