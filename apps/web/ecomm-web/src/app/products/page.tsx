"use client";

import React, { useState } from 'react';
import { PRODUCTS, CATEGORIES } from '../../constants';
import { ProductCard } from '../../components/ProductCard';
import { SlidersHorizontal } from 'lucide-react';

export default function ProductListingPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProducts = activeCategory === 'All' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category.toLowerCase().includes(activeCategory.toLowerCase().slice(0, -1)));

  return (
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-8 md:space-y-0">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 font-serif text-primary">The Nex Collection</h1>
            <p className="text-secondary max-w-md text-lg">Premium speakers and headphones designed for ultimate clarity and depth.</p>
          </div>
          
          <div className="flex items-center space-x-8 border-b border-secondary/20 pb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-lg font-bold transition-all ${activeCategory === cat ? 'text-primary border-b-2 border-cta pb-4 -mb-[18px]' : 'text-secondary hover:text-primary'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
           <p className="text-sm font-medium text-secondary">Showing {filteredProducts.length} results</p>
           <button className="flex items-center space-x-2 text-sm font-bold border border-secondary/20 rounded-full px-6 py-2.5 hover:bg-secondary/5 text-primary transition-colors">
             <SlidersHorizontal size={16} />
             <span>Filter & Sort</span>
           </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
