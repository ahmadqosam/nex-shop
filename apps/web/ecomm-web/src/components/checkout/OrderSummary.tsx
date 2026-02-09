"use client";

import React, { useState } from 'react';
import { CartItem } from '../../types';
import { CheckoutState } from '../../types/checkout';
import { X, ChevronRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import Image from 'next/image';

interface Props {
  products: CartItem[];
  formData: CheckoutState;
  onUpdate: <K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) => void;
  onCheckout: () => void;
  isProcessing?: boolean;
}

const OrderSummary: React.FC<Props> = ({ products, formData, onUpdate, onCheckout, isProcessing }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextItem = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevItem = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const currentProduct = products[currentIndex];

  // Totals calculations
  // Note: Existing products from constants don't have originalPrice, so we use price
  const subtotal = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 25;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 text-center">
        <h2 className="text-2xl font-bold mb-4">Order</h2>
        <p className="text-gray-400">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 transition-all duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-black">Order</h2>
        <span className="text-[10px] font-bold bg-gray-100 text-black px-2 py-1 rounded-full uppercase tracking-tighter">
          {products.length} {products.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>
      
      {/* Product Carousel Card */}
      <div className="relative bg-[#F9F9F9] rounded-2xl p-6 mb-8 group overflow-hidden">
        {/* Carousel Navigation */}
        {products.length > 1 && (
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
            <button 
              onClick={prevItem}
              className="p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors pointer-events-auto border border-gray-100"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex gap-2 items-center">
              <button className="p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors pointer-events-auto border border-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={nextItem}
                className="p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors pointer-events-auto border border-gray-100"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        <div className="relative w-full aspect-square mb-6 overflow-hidden rounded-xl bg-white shadow-inner">
          <div className="absolute inset-0">
            <Image 
              key={currentProduct.id}
              src={currentProduct.image} 
              alt={currentProduct.name} 
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-contain transition-all duration-700 ease-in-out transform group-hover:scale-110" 
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-bold leading-tight min-h-[3rem] text-black">{currentProduct.name}</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <div>Quantity: <span className="text-black">{currentProduct.quantity}</span></div>
          </div>
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-2xl font-bold text-black">${currentProduct.price}</span>
          </div>
        </div>

        {/* Carousel Indicators */}
        {products.length > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-4 bg-black' : 'w-1 bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Subtotal</span>
          <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Shipping</span>
          <span className="font-bold text-green-500">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Tax (8%)</span>
          <span className="font-bold text-black">${tax.toFixed(2)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-baseline pt-6 border-t border-gray-100 mb-8">
        <span className="text-xl font-bold text-black font-sans">TOTAL</span>
        <span className="text-3xl font-bold text-black">${total.toFixed(2)}</span>
      </div>

      {/* Action */}
      <div className="space-y-6">
        <button 
          onClick={onCheckout}
          disabled={isProcessing || !formData.agreeToTerms}
          className="w-full bg-primary hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-black/5 group"
        >
          {isProcessing ? 'Processing...' : 'Checkout'}
          {!isProcessing && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        </button>

        <label className="flex items-center gap-4 cursor-pointer group px-1">
          <div className="relative flex items-center flex-shrink-0">
            <input 
              type="checkbox" 
              checked={formData.agreeToTerms}
              onChange={(e) => onUpdate('agreeToTerms', e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-5 h-5 border-2 border-gray-200 rounded-md peer-checked:bg-cta peer-checked:border-cta transition-all flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-gray-400 font-medium leading-tight group-hover:text-gray-600 transition-colors">
            By confirming the order, I accept the{' '}
            <a href="#" className="underline text-gray-600 hover:text-cta transition-colors">terms of use</a>
          </span>
        </label>
      </div>
    </div>
  );
};

export default OrderSummary;
