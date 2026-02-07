import React from 'react';
import Link from 'next/link';
import { Product } from '../types';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative bg-secondary/5 aspect-[4/5] overflow-hidden rounded-xl mb-4 group-hover:shadow-xl transition-shadow duration-500">
        {product.isNew && (
          <span className="absolute top-4 left-4 z-10 bg-cta text-white text-[10px] font-bold px-2 py-1 rounded">New!</span>
        )}
        {product.isBestSeller && (
          <span className="absolute top-4 left-4 z-10 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded">Best Seller</span>
        )}
        
        <div className="w-full h-full p-8 transition-transform duration-700 group-hover:scale-110">
          <Image 
            src={product.image} 
            alt={product.name} 
            fill
            className="object-contain mix-blend-multiply"
          />
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-primary/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
           <div className="bg-background/90 backdrop-blur-sm px-6 py-3 rounded-full flex items-center space-x-2 font-bold font-serif text-primary transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-lg">
             <span>Shop Now</span>
             <ArrowRight size={16} />
           </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg tracking-tight font-serif text-primary group-hover:text-cta transition-colors">{product.name}</h3>
          <span className="font-bold text-lg text-primary">${product.price}</span>
        </div>
        <p className="text-sm text-secondary font-medium">{product.category}</p>
        
        {product.colors && (
          <div className="flex space-x-1.5 pt-2">
            {product.colors.map((color, i) => (
              <div 
                key={i} 
                className="w-3 h-3 rounded-full border border-secondary/20" 
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};
