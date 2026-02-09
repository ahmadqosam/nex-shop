import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CheckoutForm from '../CheckoutForm';
import { CheckoutState } from '../../../types/checkout';

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

describe('CheckoutForm', () => {
  const onUpdateMock = vi.fn();

  it('renders all sections', () => {
    render(<CheckoutForm formData={mockFormData} onUpdate={onUpdateMock} />);
    expect(screen.getByText('1. Contact Information')).toBeInTheDocument();
    expect(screen.getByText('2. Delivery Method')).toBeInTheDocument();
    expect(screen.getByText('3. Payment Method')).toBeInTheDocument();
  });

  it('calls onUpdate when contact fields change', () => {
    render(<CheckoutForm formData={mockFormData} onUpdate={onUpdateMock} />);
    
    const firstNameInput = screen.getByPlaceholderText('e.g. Eduard');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    expect(onUpdateMock).toHaveBeenCalledWith('firstName', 'Jane');

    const lastNameInput = screen.getByPlaceholderText('e.g. Franz');
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    expect(onUpdateMock).toHaveBeenCalledWith('lastName', 'Smith');
  });

  it('calls onUpdate when delivery method changes', () => {
    render(<CheckoutForm formData={mockFormData} onUpdate={onUpdateMock} />);
    
    const storeButton = screen.getByText('Store');
    fireEvent.click(storeButton);
    expect(onUpdateMock).toHaveBeenCalledWith('deliveryMethod', 'store');
  });

  it('shows credit card details only when card payment is selected', () => {
    const { rerender } = render(<CheckoutForm formData={mockFormData} onUpdate={onUpdateMock} />);
    expect(screen.getByText('Credit Card Details')).toBeInTheDocument();

    rerender(<CheckoutForm formData={{ ...mockFormData, paymentMethod: 'apple' }} onUpdate={onUpdateMock} />);
    expect(screen.queryByText('Credit Card Details')).not.toBeInTheDocument();
  });
});
