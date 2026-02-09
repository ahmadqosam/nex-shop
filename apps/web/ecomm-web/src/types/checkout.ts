export type DeliveryMethod = 'store' | 'delivery';
export type PaymentMethod = 'card' | 'apple' | 'other';

export interface CheckoutState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  deliveryDate: string;
  convenientTime: string;
  city: string;
  address: string;
  zipCode: string;
  paymentMethod: PaymentMethod;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardHolder: string;
  agreeToTerms: boolean;
}
