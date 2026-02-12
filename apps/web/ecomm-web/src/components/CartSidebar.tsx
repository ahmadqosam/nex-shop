"use client";

import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export const CartSidebar: React.FC = () => {
  const { cart, isCartOpen, toggleCart, removeFromCart, updateQuantity } = useAppContext();
  const router = useRouter();

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={toggleCart}
      />
      <div className="relative w-full max-w-md bg-background h-full flex flex-col shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold font-serif text-primary">Your Bag ({cart.length})</h2>
          <button onClick={toggleCart} className="p-2 hover:bg-secondary/10 rounded-full transition-colors" aria-label="Close cart">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="bg-secondary/10 p-6 rounded-full">
                <ShoppingBag size={48} className="text-secondary/50" />
              </div>
              <p className="text-secondary font-medium">Your bag is empty.</p>
              <button 
                onClick={toggleCart}
                className="bg-primary text-background px-8 py-3 rounded-full font-bold hover:bg-cta transition-colors"
                aria-label="Start Shopping"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex space-x-4 border-b pb-6 last:border-0 border-secondary/10">
                <div className="relative w-24 h-24 bg-secondary/5 rounded overflow-hidden">
                  <Image src={item.image} alt={item.name || item.productName} fill className="object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between">
                      <h3 className="font-bold font-serif text-primary">{item.productName}</h3>
                      <p className="font-bold text-primary">${item.price}</p>
                    </div>
                    <p className="text-sm text-secondary">{item.category}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border rounded-full px-2 border-secondary/20">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:text-cta transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-4 font-medium text-primary">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:text-cta transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs text-red-500 underline hover:text-red-600 transition-colors"
                      aria-label="Remove item"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-secondary/10 bg-secondary/5">
            <div className="flex justify-between items-center mb-6">
              <span className="text-secondary font-medium">Subtotal</span>
              <span className="text-2xl font-bold font-serif text-primary">${total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-secondary/80 mb-6 text-center">
              Shipping and taxes calculated at checkout.
            </p>
            <button 
              onClick={() => {
                router.push('/checkout');
                toggleCart();
              }}
              className="w-full bg-cta text-white py-4 rounded-full font-bold hover:bg-yellow-600 transition-all transform active:scale-[0.98] shadow-lg shadow-cta/20"
            >
              Checkout Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
