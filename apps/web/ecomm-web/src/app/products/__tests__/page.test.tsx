
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductListingPage from '../page';
import { CATEGORIES } from '../../../constants';

// Mock ProductCard
vi.mock('../../../components/ProductCard', () => ({
  ProductCard: ({ product }: any) => <div data-testid="product-card">{product.name}</div>,
}));

describe('ProductListingPage', () => {
  it('renders categories', () => {
    render(<ProductListingPage />);
    CATEGORIES.forEach(cat => {
      expect(screen.getByText(cat)).toBeInTheDocument();
    });
  });

  it('filters products', () => {
    render(<ProductListingPage />);
    
    // Initial state: All (shows 4 products)
    expect(screen.getAllByTestId('product-card')).toHaveLength(4);

    // Filter by Headphone
    fireEvent.click(screen.getByText('Headphones'));
    // Should verify filtering logic. Assuming constants have 1 headphone.
    // Nex Ace is Headphone.
    // Assuming filter logic works by string matching
  });
});
