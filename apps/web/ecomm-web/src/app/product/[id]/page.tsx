"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PRODUCTS } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { ArrowLeft, Check, Plus, Minus, Shield, Truck, RotateCcw } from 'lucide-react';
import Image from 'next/image';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, toggleCart } = useAppContext();
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomStyle, setZoomStyle] = useState({});

  const id = params?.id as string;
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    return (
      <div className="pt-40 text-center">
        <h2 className="text-3xl font-bold">Product not found.</h2>
        <button onClick={() => router.push('/products')} className="mt-4 underline">Go to shop</button>
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(1.8)'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ transform: 'scale(1)', transformOrigin: 'center' });
  };

  return (
    <div className="pt-24 pb-24">
      <div className="container mx-auto px-4 md:px-8">
        <button 
          onClick={() => router.back()} 
          className="flex items-center space-x-2 text-sm font-bold mb-12 hover:text-cta transition-colors text-primary"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Immersive Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div 
              className="relative bg-secondary/5 rounded-3xl aspect-square overflow-hidden cursor-zoom-in group"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
               <div className="w-full h-full p-20 transition-transform duration-200 ease-out mix-blend-multiply" style={zoomStyle}>
                  <div className="relative w-full h-full">
                    <Image 
                      src={product.image} 
                      alt={product.name} 
                      fill
                      className="object-contain"
                    />
                  </div>
               </div>
               <div className="absolute bottom-8 right-8 text-xs font-bold text-secondary pointer-events-none group-hover:text-primary transition-colors">Hover to zoom</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="relative bg-secondary/5 rounded-2xl aspect-video overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800" alt="Detail 1" fill className="object-cover hover:scale-105 transition-transform duration-700" />
               </div>
               <div className="relative bg-secondary/5 rounded-2xl aspect-video overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800" alt="Detail 2" fill className="object-cover hover:scale-105 transition-transform duration-700" />
               </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-5 space-y-10">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-secondary/70 uppercase tracking-widest mb-4">
                 <span>{product.category}</span>
                 {product.isNew && <span className="text-cta">• New Arrival</span>}
              </div>
              <h1 className="text-5xl font-bold tracking-tighter mb-4 font-serif text-primary">{product.name}</h1>
              <p className="text-2xl font-bold text-primary">${product.price}</p>
            </div>

            <p className="text-secondary text-lg leading-relaxed">{product.description}</p>

            {product.colors && (
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest text-primary">Colors</p>
                <div className="flex space-x-4">
                  {product.colors.map((color, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedColor(idx)}
                      aria-label={`Select color ${idx}`}
                      className={`w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === idx ? 'border-primary' : 'border-transparent'}`}
                    >
                      <div className="w-8 h-8 rounded-full border border-secondary/10 shadow-inner" style={{ backgroundColor: color }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">Quantity</p>
              <div className="flex items-center border-2 border-secondary/10 rounded-full w-fit px-4 py-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:text-cta transition-colors text-primary" aria-label="Decrease quantity">
                  <Minus size={20} />
                </button>
                <span className="text-xl font-bold px-8 text-primary">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:text-cta transition-colors text-primary" aria-label="Increase quantity">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-col space-y-4 pt-4">
              <button 
                onClick={() => {
                  addToCart(product, quantity);
                  toggleCart();
                }}
                className="w-full bg-primary text-background py-5 rounded-full font-bold text-lg hover:bg-cta transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 hover:shadow-cta/30"
              >
                Add to Bag
              </button>
              <button className="w-full bg-transparent text-primary border-2 border-secondary/20 py-5 rounded-full font-bold text-lg hover:border-primary transition-all">
                Add to Wishlist
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-secondary/10">
               <div className="flex items-center space-x-3">
                  <Truck size={20} className="text-secondary" />
                  <div className="text-[10px] leading-tight font-bold uppercase tracking-wider text-primary">Free <br />Shipping</div>
               </div>
               <div className="flex items-center space-x-3">
                  <RotateCcw size={20} className="text-secondary" />
                  <div className="text-[10px] leading-tight font-bold uppercase tracking-wider text-primary">30-Day <br />Return</div>
               </div>
               <div className="flex items-center space-x-3">
                  <Shield size={20} className="text-secondary" />
                  <div className="text-[10px] leading-tight font-bold uppercase tracking-wider text-primary">2-Year <br />Warranty</div>
               </div>
            </div>

            {/* Specifications */}
            <div className="pt-12">
               <h3 className="text-xl font-bold mb-6 font-serif text-primary">Specifications</h3>
               <div className="space-y-4">
                 {Object.entries(product.specs).map(([key, value]) => (
                   <div key={key} className="flex justify-between border-b border-secondary/10 pb-4">
                     <span className="text-secondary font-medium">{key}</span>
                     <span className="font-bold text-primary">{value}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Section */}
      <section className="mt-32 py-32 bg-primary text-background">
        <div className="container mx-auto px-4 md:px-8">
           <div className="max-w-4xl mx-auto text-center space-y-12">
             <h2 className="text-5xl md:text-8xl font-bold tracking-tighter font-serif">Pure Sound. <br />No Distractions.</h2>
             <div className="relative aspect-video rounded-[40px] overflow-hidden bg-gray-900 shadow-2xl">
               <Image src="https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=2000" alt="Narrative" fill className="object-cover opacity-80" />
             </div>
             <p className="text-xl md:text-2xl text-secondary/80 leading-relaxed max-w-2xl mx-auto">
               Every component has been custom-designed to provide unparalleled acoustic precision, ensuring you hear every detail exactly as the artist intended.
             </p>
           </div>
        </div>
      </section>
    </div>
  );
}
