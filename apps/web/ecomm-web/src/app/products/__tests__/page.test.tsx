
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductListClient from '../ProductListClient';
import { Product } from '../../../types';
import { CATEGORIES } from '../../../constants';

// Mock ProductCard
vi.mock('../../../components/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) => <div data-testid="product-card">{product.name}</div>,
}));

describe('ProductListClient', () => {
    const mockProducts: Product[] = [
        { 
          id: '1', name: 'Product 1', category: CATEGORIES[0] || 'Category1', price: 100, image: '', description: '', 
          features: [], specs: {}, colors: [], isNew: false, isBestSeller: false 
        },
        { 
          id: '2', name: 'Product 2', category: CATEGORIES[1] || 'Category2', price: 200, image: '', description: '', 
          features: [], specs: {}, colors: [], isNew: false, isBestSeller: false 
        },
    ];

  it('renders categories', () => {
    render(<ProductListClient initialProducts={mockProducts} />);
    // Check for "All" button specifically
    const allButtons = screen.getAllByRole('button', { name: 'All' });
    expect(allButtons.length).toBeGreaterThan(0);

    CATEGORIES.forEach(cat => {
      // Use getAllByText to avoid ambiguity if category name appears elsewhere
      expect(screen.getAllByText(cat).length).toBeGreaterThan(0);
    });
  });

  it('displays initial products', () => {
    render(<ProductListClient initialProducts={mockProducts} />);
    expect(screen.getAllByTestId('product-card')).toHaveLength(2);
  });

  it('filters products client-side', () => {
    // Only use categories that actually exist in constants to ensure button match
    const cat1 = CATEGORIES[1]; // Use 'Speakers' or similar, NOT 'All'[0]
    const products = [
        { ...mockProducts[0], category: cat1 },
        { ...mockProducts[1], category: 'Other' }
    ];

    render(<ProductListClient initialProducts={products} />);
    
    // Click Category
    const categoryBtn = screen.getByRole('button', { name: cat1 });
    fireEvent.click(categoryBtn);
    
    // Should show 1 product
    expect(screen.getAllByTestId('product-card')).toHaveLength(1);
    expect(screen.getByText(products[0].name)).toBeInTheDocument();
  });
  
  it('shows no results message when empty', () => {
     render(<ProductListClient initialProducts={[]} />);
     expect(screen.getByText(/No products found/i)).toBeInTheDocument();
  });
});
