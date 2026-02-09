import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrderSummary from '../OrderSummary';
import { CheckoutState } from '../../../types/checkout';
import { CartItem } from '../../../types';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

const mockProducts: CartItem[] = [
  {
    id: '1',
    name: 'Test Product',
    price: 100,
    quantity: 1,
    category: 'Test',
    image: '/test.jpg',
    description: 'Test description',
    features: [],
    specs: {},
  }
];

const mockFormData: CheckoutState = {
  firstName: 'John',
  lastName: 'Doe',
  phone: '1234567890',
  email: 'john@example.com',
  deliveryMethod: 'delivery',
  deliveryDate: '2026-02-15',
  convenientTime: '1 pm - 6 pm',
  city: 'New York',
  address: '123 Main St',
  zipCode: '10001',
  paymentMethod: 'card',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  cardHolder: '',
  agreeToTerms: true,
};

describe('OrderSummary', () => {
  const onUpdateMock = vi.fn();
  const onCheckoutMock = vi.fn();

  it('renders order details and totals', () => {
    render(
      <OrderSummary 
        products={mockProducts} 
        formData={mockFormData} 
        onUpdate={onUpdateMock} 
        onCheckout={onCheckoutMock} 
      />
    );
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
    // Total should be 100 + 25 shipping + 8 tax = 133
    expect(screen.getByText('$133.00')).toBeInTheDocument();
  });

  it('calculates free shipping for orders over $500', () => {
    const expensiveProducts = [{ ...mockProducts[0], price: 600 }];
    render(
      <OrderSummary 
        products={expensiveProducts} 
        formData={mockFormData} 
        onUpdate={onUpdateMock} 
        onCheckout={onCheckoutMock} 
      />
    );
    expect(screen.getByText('Free')).toBeInTheDocument();
    // Total should be 600 + 0 shipping + 48 tax = 648
    expect(screen.getByText('$648.00')).toBeInTheDocument();
  });

  it('calls onCheckout when checkout button is clicked', () => {
    render(
      <OrderSummary 
        products={mockProducts} 
        formData={mockFormData} 
        onUpdate={onUpdateMock} 
        onCheckout={onCheckoutMock} 
      />
    );
    
    const checkoutButton = screen.getByRole('button', { name: /Checkout/i });
    fireEvent.click(checkoutButton);
    expect(onCheckoutMock).toHaveBeenCalled();
  });

  it('disables checkout button if terms are not agreed', () => {
    render(
      <OrderSummary 
        products={mockProducts} 
        formData={{ ...mockFormData, agreeToTerms: false }} 
        onUpdate={onUpdateMock} 
        onCheckout={onCheckoutMock} 
      />
    );
    
    const checkoutButton = screen.getByRole('button', { name: /Checkout/i });
    expect(checkoutButton).toBeDisabled();
  });
});
