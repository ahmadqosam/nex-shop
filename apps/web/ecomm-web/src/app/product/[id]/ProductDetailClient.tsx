"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import { Product } from '../../../types';
import { useAppContext } from '../../../context/AppContext';

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart, toggleCart } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price, // API returns price in dollars now
      image: product.image,
      quantity: quantity,
      color: selectedColor
    } as any, quantity);

    toggleCart();

    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  return (
    <div className="pt-32 pb-24 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-secondary hover:text-primary transition-colors mb-12 group"
        >
          <div className="p-2 rounded-full border border-secondary/20 group-hover:border-primary/50 transition-colors">
            <ArrowLeft size={16} />
          </div>
          <span className="font-bold text-sm tracking-wide uppercase">Back to Collection</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
          {/* Image Gallery */}
          <div className="space-y-6">
            <div className="relative aspect-square bg-[#F5F5F7] rounded-3xl overflow-hidden cursor-zoom-in group">
               <Image 
                 src={product.image} 
                 alt={product.name} 
                 fill
                 className="object-contain p-12 transition-transform duration-500 group-hover:scale-110"
                 priority
               />
               <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                 {product.isNew ? 'New Arrival' : 'Best Seller'}
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               {[1, 2].map((i) => (
                 <div key={i} className="relative aspect-square bg-[#F5F5F7] rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                    <Image 
                      src={product.image} // In a real app, these would be different views
                      alt={`${product.name} view ${i}`}
                      fill
                      className="object-contain p-8"
                    />
                 </div>
               ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:py-8">
            <div className="mb-10">
              <h4 className="text-secondary font-bold uppercase tracking-widest mb-4 text-sm">{product.category}</h4>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6 text-primary">{product.name}</h1>
              <div className="flex items-baseline space-x-4 mb-8">
                 <span className="text-3xl font-bold">${product.price}</span>
                 <span className="text-secondary text-lg">Free Shipping & Returns</span>
              </div>
              <p className="text-secondary text-lg leading-relaxed max-w-lg mb-8">
                {product.description}
              </p>
            </div>

            {/* Filters / Selectors */}
            <div className="space-y-8 border-t border-secondary/10 pt-10 mb-10">
              {/* Color Selector */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-secondary mb-4">Select Finish</span>
                <div className="flex space-x-4">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${
                        selectedColor === color ? 'border-primary scale-110' : 'border-transparent hover:scale-110'
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-full border border-black/5" 
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-secondary mb-4">Quantity</span>
                <div className="inline-flex items-center space-x-6 border border-secondary/20 rounded-full px-4 py-3">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/10 text-secondary hover:text-primary transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-lg font-bold w-4 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/10 text-secondary hover:text-primary transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button 
                onClick={handleAddToCart}
                disabled={isAdding}
                className={`w-full py-5 rounded-full font-bold text-lg flex items-center justify-center space-x-3 transition-all ${
                  isAdding ? 'bg-green-600 text-white' : 'bg-cta hover:bg-primary text-white'
                }`}
              >
                 {isAdding ? (
                   <>
                     <Check size={20} />
                     <span>Added to Bag</span>
                   </>
                 ) : (
                   <>
                     <ShoppingBag size={20} />
                     <span>Add to Bag — ${(product.price * quantity).toFixed(2)}</span>
                   </>
                 )}
              </button>
              <p className="text-xs text-center text-secondary">
                Secure checkout · 2-year warranty · 30-day returns
              </p>
            </div>

            {/* Specifications */}
            <div className="mt-16 pt-16 border-t border-secondary/10">
               <h3 className="text-2xl font-bold mb-8">Technical Specifications</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                 {Object.entries(product.specs).map(([key, value]) => (
                   <div key={key} className="flex justify-between border-b border-light-gray pb-2">
                     <span className="text-secondary font-medium capitalize">{key.replace('_', ' ')}</span>
                     <span className="font-bold">{value}</span>
                   </div>
                 ))}
                 <div className="flex justify-between border-b border-light-gray pb-2">
                    <span className="text-secondary font-medium capitalize">In the box</span>
                    <span className="font-bold">Manual, Cable, Warranty</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
