const API_BASE = '/api/payments';

export interface CreatePaymentDto {
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export const paymentService = {
  async createPayment(data: CreatePaymentDto, token?: string): Promise<PaymentResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create payment');
    }

    return response.json();
  }
};
