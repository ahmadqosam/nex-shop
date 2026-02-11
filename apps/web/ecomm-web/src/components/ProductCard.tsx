import React from 'react';
import Link from 'next/link';
import { Product } from '../types';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import FlashSaleBadge from './FlashSaleBadge';
import CountdownTimer from './CountdownTimer';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const isFlashSale = !!product.flashSale;

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative bg-secondary/5 aspect-[4/5] overflow-hidden rounded-xl mb-4 group-hover:shadow-xl transition-shadow duration-500">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {product.isNew && (
            <span className="self-start bg-cta text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">New!</span>
          )}
          {product.isBestSeller && (
            <span className="self-start bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Best Seller</span>
          )}
        </div>

        {isFlashSale && (
          <FlashSaleBadge className="absolute top-4 right-4 z-10" />
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
          <div className="flex flex-col items-end">
            {isFlashSale ? (
              <>
                <span className="font-bold text-lg text-red-600">${product.flashSale!.salePriceInCents / 100}</span>
                <span className="text-xs text-secondary line-through">${product.flashSale!.originalPriceInCents / 100}</span>
              </>
            ) : (
              <span className="font-bold text-lg text-primary">${product.price}</span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-secondary font-medium">{product.category}</p>
          {isFlashSale && (
            <span className="text-[10px] font-bold text-red-600 uppercase">
              {product.flashSale!.remainingQuantity} left
            </span>
          )}
        </div>

        {isFlashSale && (
          <div className="pt-1">
            <CountdownTimer endTime={product.flashSale!.saleEndTime} />
          </div>
        )}
        
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
