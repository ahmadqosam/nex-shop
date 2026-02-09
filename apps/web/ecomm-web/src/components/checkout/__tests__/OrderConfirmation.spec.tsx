import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrderConfirmation from '../OrderConfirmation';

describe('OrderConfirmation', () => {
  const onCloseMock = vi.fn();

  it('renders confirmation message with user name', () => {
    render(
      <OrderConfirmation 
        firstName="John" 
        email="john@example.com"
        onClose={onCloseMock} 
      />
    );
    
    expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    expect(screen.getByText(/Thank you for your purchase, /i)).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onClose when continue shopping button is clicked', () => {
    render(
      <OrderConfirmation 
        firstName="John" 
        email="john@example.com"
        onClose={onCloseMock} 
      />
    );
    
    const continueButton = screen.getByText('Continue Shopping');
    fireEvent.click(continueButton);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
