"use client";

import React, { useState } from 'react';
import { ProductCard } from '../../components/ProductCard';
import { Product } from '../../types';
import { CATEGORIES } from '../../constants';
// Lucide imports removed as they weren't used in the original file view, 
// strictly copying logic. If they were used, I'd include them.
// Checking original file view... it used Loader2 and AlertCircle.


interface ProductListClientProps {
  initialProducts: Product[];
}

export default function ProductListClient({ initialProducts }: ProductListClientProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  // We don't need loading state for initial load anymore as it comes from server,
  // but if we were re-fetching on category change we might. 
  // For now, the original logic filtered client-side or re-fetched.
  // The original logic fetched *all* products and then filtered locally or via API?
  // Let's look at the original file content again.
  // It fetched all products on mount. 
  // "const filteredProducts = activeCategory === 'All' ? products : products.filter(...)"
  // So we can just use initialProducts and filter client-side for now.
  
  const [products] = useState<Product[]>(initialProducts);
  
  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(product => product.category === activeCategory);

  return (
    <div className="container mx-auto px-4 py-12 md:px-8">
      <h1 className="text-5xl font-bold mb-12 tracking-tighter">All Products</h1>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-4 mb-12">

        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === category
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl">
          <p className="text-gray-500 text-xl">No products found in this category.</p>
          <button 
             onClick={() => setActiveCategory('All')} 
             className="mt-4 text-black font-bold hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
