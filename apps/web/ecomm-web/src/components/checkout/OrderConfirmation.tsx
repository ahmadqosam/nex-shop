"use client";

import React from 'react';
import { Check, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface Props {
  firstName: string;
  email: string;
  onClose: () => void;
}

const OrderConfirmation: React.FC<Props> = ({ firstName, email, onClose }) => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-center">
      <div className="mb-10 inline-flex items-center justify-center w-24 h-24 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-200 overflow-hidden">
        <Check className="w-12 h-12 text-white stroke-[3.5px]" />
      </div>

      <h1 className="text-5xl font-bold mb-4 tracking-tight text-black">Order Confirmed</h1>
      <p className="text-xl text-gray-500 mb-12">
        Thank you for your purchase, <span className="text-black font-semibold">{firstName}</span>! 
        Your Nex experience is on its way.
      </p>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 mb-12 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order Number</p>
            <p className="text-lg font-bold text-black">#SS-9284712</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estimated Delivery</p>
            <p className="text-lg font-bold text-black">February 15, 2026</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Shipping Method</p>
            <p className="text-lg font-bold text-black">Premium Courier (Free)</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Confirmation Email</p>
            <p className="text-lg font-bold truncate text-black">{email}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={onClose}
          className="bg-black text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 group"
        >
          <ShoppingBag className="w-5 h-5" />
          Continue Shopping
        </button>
        <button className="bg-white border border-gray-200 text-black px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all group">
          Track Order
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <p className="mt-12 text-sm text-gray-400">
        Having issues with your order? <a href="#" className="underline font-medium text-gray-600 transition-colors">Contact our concierge team</a>
      </p>
    </div>
  );
};

export default OrderConfirmation;
