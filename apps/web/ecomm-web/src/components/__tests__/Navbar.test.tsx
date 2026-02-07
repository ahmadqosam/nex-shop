
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Navbar } from '../Navbar';
import * as AppContextPkg from '../../context/AppContext';

// Mock useRouter/usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Navbar', () => {
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

  it('renders navbar correctly', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<Navbar />);

    expect(screen.getByText('NEX')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText(/Flash Sale/)).toBeInTheDocument();
  });

  it('renders with user logged in', () => {
    useAppContextSpy.mockReturnValue({ 
        ...defaultContext, 
        user: { id: '1', name: 'Test User', email: 'test@test.com' } 
    });
    render(<Navbar />);
    // Should link to profile
    const userLink = screen.getAllByRole('link').find(link => link.getAttribute('href') === '/profile');
    expect(userLink).toBeInTheDocument();
  });

  it('renders with items in cart', () => {
    useAppContextSpy.mockReturnValue({ 
        ...defaultContext, 
        cart: [{ id: '1', name: 'P1', price: 100, image: '', category: '', description: '', quantity: 5 }]
    });
    render(<Navbar />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens and closes mobile menu', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<Navbar />);
    
    const menuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(menuButton);
    
    const productsLinks = screen.getAllByText('Products');
    expect(productsLinks.length).toBeGreaterThan(1); // Desktop + Mobile

    fireEvent.click(menuButton);
  });

  it('toggles cart sidebar', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<Navbar />);
    
    const cartButton = screen.getByLabelText('Open cart');
    fireEvent.click(cartButton);
    expect(toggleCartMock).toHaveBeenCalled();
  });

  it('updates style on scroll', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<Navbar />);
    
    // Initial state
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('bg-transparent');

    // Scroll
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    fireEvent.scroll(window);
    
    expect(nav.className).toContain('bg-background/95');
  });

  it('closes mobile menu on interaction', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<Navbar />);
    
    const toggleBtn = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(toggleBtn);
    
    // Click close button
    const closeBtn = screen.getByLabelText('Close mobile menu');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    
    expect(closeBtn).not.toBeInTheDocument();
  });

  it('closes mobile menu when link is clicked', () => {
    useAppContextSpy.mockReturnValue(defaultContext);
    render(<Navbar />);
    
    // Open menu
    const toggleBtn = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(toggleBtn);
    
    // Click a link in mobile menu
    const productLinks = screen.getAllByText('Products');
    fireEvent.click(productLinks[productLinks.length - 1]);
    
    // Should be closed.
    const closeBtn = screen.queryByLabelText('Close mobile menu');
    expect(closeBtn).not.toBeInTheDocument();
  });
});
