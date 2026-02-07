"use client";

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ShieldCheck, CreditCard, Lock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CheckoutPage() {
  const { cart, clearCart } = useAppContext();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 25;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      clearCart();
    }, 2500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 pt-20">
        <div className="bg-white p-12 rounded-[40px] shadow-xl max-w-lg w-full text-center space-y-8">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Order Confirmed!</h1>
            <p className="text-gray-500">Thank you for your purchase. We've sent a confirmation email to your inbox.</p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
         <h2 className="text-2xl font-bold mb-4">Your bag is empty.</h2>
         <Link href="/products" className="underline font-bold">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center space-x-2 mb-12">
          <Link href="/" className="text-gray-400 hover:text-black">Home</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm space-y-8">
                <h2 className="text-2xl font-bold">Shipping Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">First Name</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">Last Name</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">Address</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">City</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">ZIP Code</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Payment Method</h2>
                  <div className="flex space-x-2">
                    <CreditCard size={20} className="text-gray-400" />
                    <Lock size={20} className="text-gray-400" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-6 border-2 border-black rounded-2xl bg-black/5 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                       <div className="w-12 h-8 bg-black rounded flex items-center justify-center text-[10px] text-white font-bold">VISA</div>
                       <span className="font-bold">Credit / Debit Card</span>
                    </div>
                    <div className="w-5 h-5 rounded-full border-4 border-black" />
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <label className="text-xs font-bold uppercase text-gray-400">Card Number</label>
                    <input required placeholder="0000 0000 0000 0000" type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-400">Expiry</label>
                      <input required placeholder="MM/YY" type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-400">CVC</label>
                      <input required placeholder="123" type="password" maxLength={3} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                  </div>
                </div>
              </section>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-black text-white py-6 rounded-full font-bold text-xl hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
              >
                {isProcessing ? 'Processing Securely...' : `Pay $${total.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-5">
             <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm sticky top-32 space-y-8">
               <h2 className="text-2xl font-bold">Order Summary</h2>
               
               <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex space-x-4">
                      <div className="relative w-20 h-20 bg-gray-50 rounded-2xl p-2 overflow-hidden">
                        <Image src={item.image} alt={item.name} fill className="object-contain mix-blend-multiply" />
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between font-bold">
                           <span className="text-sm">{item.name}</span>
                           <span>${(item.price * item.quantity).toFixed(2)}</span>
                         </div>
                         <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
               </div>

               <div className="space-y-4 pt-8 border-t">
                 <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className="font-bold text-black">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                 </div>
                 <div className="flex justify-between text-gray-500">
                    <span>Tax (8%)</span>
                    <span className="font-bold text-black">${tax.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-2xl font-bold pt-4 border-t">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                 </div>
               </div>

               <div className="p-4 bg-gray-50 rounded-2xl flex items-start space-x-3">
                  <ShieldCheck size={20} className="text-green-500 flex-shrink-0" />
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Secure 256-bit SSL encrypted payment. By completing your purchase you agree to our Terms of Service and Privacy Policy.
                  </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
