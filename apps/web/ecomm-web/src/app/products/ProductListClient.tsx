"use client";

import React, { useState } from 'react';
import { ProductCard } from '../../components/ProductCard';
import { Product } from '../../types';
import { CATEGORIES } from '../../constants';
import { Zap } from 'lucide-react';

interface ProductListClientProps {
  initialProducts: Product[];
}

export default function ProductListClient({ initialProducts }: ProductListClientProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [flashSaleOnly, setFlashSaleOnly] = useState(false);
  const [products] = useState<Product[]>(initialProducts);
  
  const filteredProducts = products.filter(product => {
    const categoryMatch = activeCategory === 'All' || product.category === activeCategory;
    const flashSaleMatch = !flashSaleOnly || !!product.flashSale;
    return categoryMatch && flashSaleMatch;
  });

  return (
    <div className="container mx-auto px-4 py-12 md:px-8">
      <h1 className="text-5xl font-bold mb-12 tracking-tighter">All Products</h1>

      {/* Category Filter & Flash Sale Toggle */}
      <div className="flex flex-wrap items-center gap-4 mb-12">
        <div className="flex flex-wrap gap-2">
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

        <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>

        <button
          onClick={() => setFlashSaleOnly(!flashSaleOnly)}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all border-2 ${
            flashSaleOnly
              ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105'
              : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
          }`}
        >
          <Zap size={16} fill={flashSaleOnly ? "white" : "red"} />
          <span>Flash Sale</span>
        </button>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl">
          <p className="text-gray-500 text-xl">No products found for the selected filters.</p>
          <button 
             onClick={() => {
               setActiveCategory('All');
               setFlashSaleOnly(false);
             }} 
             className="mt-4 text-black font-bold hover:underline"
          >
            Clear all filters
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
