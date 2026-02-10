"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CheckoutForm from '../../components/checkout/CheckoutForm';
import OrderSummary from '../../components/checkout/OrderSummary';
import OrderConfirmation from '../../components/checkout/OrderConfirmation';
import OrderProcessing from '../../components/checkout/OrderProcessing';
import { CheckoutState } from '../../types/checkout';
import { orderService, CreateOrderDto } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';

const INITIAL_STATE: CheckoutState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  deliveryMethod: 'delivery',
  deliveryDate: new Date().toISOString().split('T')[0],
  convenientTime: '1 pm - 6 pm',
  city: 'New Jersey',
  address: '',
  zipCode: '',
  paymentMethod: 'card',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  cardHolder: '',
  agreeToTerms: false,
};

export default function CheckoutPage() {

  const { cart, user, clearCart, accessToken } = useAppContext();
  const router = useRouter();
  const [formData, setFormData] = useState<CheckoutState>(INITIAL_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.name.split(' ')[0] || '',
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        email: user.email,
      }));
    }
  }, [user]);

  const handleUpdateField = <K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckout = async () => {
    if (!user || !accessToken) {
      alert('Please login to checkout');
      return;
    }
    
    setIsProcessing(true);
    try {
      // 1. Create Order
      const orderDto: CreateOrderDto = {
        userId: user.id || '', 
        email: formData.email,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceInCents: Math.round(item.price * 100),
          productName: item.productName,
          variantName: item.variantName,
          imageUrl: item.image,
          currency: 'USD'
        })),
        shippingAddress: {
          fullName: `${formData.firstName} ${formData.lastName}`,
          addressLine1: formData.address,
          city: formData.city,
          state: 'NJ', 
          postalCode: formData.zipCode,
          country: 'US',
          phone: formData.phone,
        },
      };

      const order = await orderService.createOrder(orderDto, accessToken);
      console.log('Order created:', order);

      // 2. Create Payment Intent
      const paymentDto = {
        amount: order.totalInCents,
        currency: order.currency.toLowerCase(),
        metadata: {
          orderId: order.id,
        },
      };

      const payment = await paymentService.createPayment(paymentDto, accessToken);
      console.log('Payment intent created:', payment);

      // 3. Confirm (Simulation)
      // In a real app with Stripe.js, we would confirmCardPayment here using payment.clientSecret
      
      setIsConfirmed(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseConfirmation = () => {
    router.push('/');
  };

  if (isProcessing) {
    return <OrderProcessing />;
  }

  if (isConfirmed) {
    return (
      <div className="pt-32 pb-24 bg-white min-h-screen">
        <div className="container mx-auto px-4">
          <OrderConfirmation 
            firstName={formData.firstName || 'Customer'} 
            email={formData.email}
            onClose={handleCloseConfirmation} 
          />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
         <h2 className="text-2xl font-bold mb-4 text-black">Your bag is empty.</h2>
         <Link href="/products" className="underline font-bold text-black">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="text-4xl font-bold tracking-tight text-black">Checkout</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Form Side */}
          <div className="flex-grow w-full lg:max-w-3xl">
            <CheckoutForm 
              formData={formData} 
              onUpdate={handleUpdateField} 
            />
          </div>

          {/* Summary Side */}
          <div className="w-full lg:w-[400px] lg:sticky lg:top-32">
            <OrderSummary 
              products={cart} 
              formData={formData} 
              onUpdate={handleUpdateField}
              onCheckout={handleCheckout}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
