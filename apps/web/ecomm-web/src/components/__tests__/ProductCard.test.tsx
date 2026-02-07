
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProductCard } from '../ProductCard';
import { PRODUCTS } from '../../constants';

describe('ProductCard', () => {
  const product = PRODUCTS[0];

  it('renders product information correctly', () => {
    render(<ProductCard product={product} />);
    
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(`$${product.price}`)).toBeInTheDocument();
    expect(screen.getByText(product.category)).toBeInTheDocument();
  });

  it('shows "New!" badge when product isNew is true', () => {
    render(<ProductCard product={{ ...product, isNew: true }} />);
    expect(screen.getByText('New!')).toBeInTheDocument();
  });

  it('shows "Best Seller" badge when product isBestSeller is true', () => {
    render(<ProductCard product={{ ...product, isNew: false, isBestSeller: true }} />);
    expect(screen.getByText('Best Seller')).toBeInTheDocument();
  });

  it('links to correct product page', () => {
    render(<ProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/product/${product.id}`);
  });
});
