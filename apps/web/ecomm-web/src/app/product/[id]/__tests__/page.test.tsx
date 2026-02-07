
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProductDetailPage from '../page';
import { PRODUCTS } from '../../../../constants';
import * as AppContextPkg from '../../../../context/AppContext';
import * as navigation from 'next/navigation';

// Mock Image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

describe('ProductDetailPage', () => {
  const addToCartMock = vi.fn();
  const toggleCartMock = vi.fn();
  const pushMock = vi.fn();
  const backMock = vi.fn();

  const defaultContext = {
    cart: [],
    user: null,
    isCartOpen: false,
    addToCart: addToCartMock,
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    toggleCart: toggleCartMock,
    clearCart: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  };

  const useAppContextSpy = vi.spyOn(AppContextPkg, 'useAppContext');
  const useParamsSpy = vi.spyOn(navigation, 'useParams'); // This might fail if mock above overrides it.
  // Actually, if we mock the module with vi.mock, spyOn might not work on the import if it's already mocked to a function.
  // However, we set useParams: vi.fn().
  // So we can just use the mocked function if we import it?
  // But vi.mock hoists.
  // Let's use the mocked module directly if possible or re-mock.
  
  // Better approach: use import of mocked module.
  const useParamsMock = navigation.useParams as unknown as ReturnType<typeof vi.fn>;
  const useRouterMock = navigation.useRouter as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextSpy.mockReturnValue(defaultContext);
    useRouterMock.mockReturnValue({ push: pushMock, back: backMock });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders product not found when id is invalid', () => {
    useParamsMock.mockReturnValue({ id: 'invalid-id' });
    render(<ProductDetailPage />);
    
    expect(screen.getByText('Product not found.')).toBeInTheDocument();
    
    // Go to shop link
    const link = screen.getByText('Go to shop');
    fireEvent.click(link);
    expect(pushMock).toHaveBeenCalledWith('/products');
  });

  it('renders product details correctly', () => {
    const product = PRODUCTS[0];
    useParamsMock.mockReturnValue({ id: product.id });
    render(<ProductDetailPage />);
    
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(`$${product.price}`)).toBeInTheDocument();
    expect(screen.getByText(product.description)).toBeInTheDocument();
  });

  it('handles back button', () => {
    useParamsMock.mockReturnValue({ id: PRODUCTS[0].id });
    render(<ProductDetailPage />);
    
    const backBtn = screen.getByText('Back');
    fireEvent.click(backBtn);
    expect(backMock).toHaveBeenCalled();
  });

  it('handles zoom effect', () => {
    useParamsMock.mockReturnValue({ id: PRODUCTS[0].id });
    render(<ProductDetailPage />);
    
    const container = screen.getByText('Hover to zoom').parentElement!;
    // Mouse move
    fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
    // We can't easily check style on the inner div without testId or digging.
    // The inner div has style prop.
    // Let's look for the one with mix-blend-multiply
    // Or simpler: verify no error.
    
    // Mouse leave
    fireEvent.mouseLeave(container);
  });

  it('selects color', () => {
    const product = PRODUCTS[0];
    useParamsMock.mockReturnValue({ id: product.id });
    render(<ProductDetailPage />);
    
    if (product.colors && product.colors.length > 0) {
        const colorBtn = screen.getByLabelText('Select color 0');
        fireEvent.click(colorBtn);
        // Verify state change visually (class)
        expect(colorBtn).toHaveClass('border-primary');
    }
  });

  it('updates quantity', () => {
    useParamsMock.mockReturnValue({ id: PRODUCTS[0].id });
    render(<ProductDetailPage />);
    
    const qtyDisplay = screen.getByText('1');
    const plusBtn = qtyDisplay.nextSibling as HTMLElement; // Assuming structure
    const minusBtn = qtyDisplay.previousSibling as HTMLElement;

    // Increase
    fireEvent.click(plusBtn);
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Decrease
    fireEvent.click(minusBtn);
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Decrease again (min 1)
    fireEvent.click(minusBtn);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('adds to cart', () => {
    const product = PRODUCTS[0];
    useParamsMock.mockReturnValue({ id: product.id });
    render(<ProductDetailPage />);
    
    const addBtn = screen.getByText('Add to Bag');
    fireEvent.click(addBtn);
    
    expect(addToCartMock).toHaveBeenCalledWith(product, 1);
    expect(toggleCartMock).toHaveBeenCalled();
  });
});
