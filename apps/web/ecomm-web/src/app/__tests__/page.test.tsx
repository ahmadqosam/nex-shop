
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from '../page';

// Mock ProductCard
vi.mock('../../components/ProductCard', () => ({
  ProductCard: ({ product }: any) => <div data-testid="product-card">{product.name}</div>,
}));

// Mock Image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('HomePage', () => {
  it('renders hero section', () => {
    render(<HomePage />);
    expect(screen.getByText(/Listen/)).toBeInTheDocument();
    expect(screen.getByText(/Without Limits/)).toBeInTheDocument();
  });

  it('renders featured products', () => {
    render(<HomePage />);
    // Check if ProductCards are rendered
    const products = screen.getAllByTestId('product-card');
    expect(products.length).toBeGreaterThan(0);
  });
});
