"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingBag, Check, Zap, Loader2, AlertCircle } from 'lucide-react';
import { Product } from '../../../types';
import { useAppContext } from '../../../context/AppContext';
import { checkEligibility, purchaseFlashSaleItem, FlashSaleServiceError } from '../../../services/flashSaleService';
import FlashSaleBadge from '../../../components/FlashSaleBadge';
import CountdownTimer from '../../../components/CountdownTimer';

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart, toggleCart, user, accessToken } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '');
  const [isAdding, setIsAdding] = useState(false);

  // Flash Sale State
  const isFlashSale = !!product.flashSale;
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    loading: boolean;
  }>({ eligible: false, loading: isFlashSale && !!user });
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'purchasing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEligibility = useCallback(async () => {
    if (!isFlashSale || !user || !accessToken) return;

    setEligibility(prev => ({ ...prev, loading: true }));
    try {
      const result = await checkEligibility(product.flashSale!.flashSaleItemId, accessToken);
      setEligibility({
        eligible: result.eligible,
        reason: result.reason,
        loading: false
      });
    } catch (error) {
      console.error('Failed to check eligibility:', error);
      setEligibility({ eligible: false, reason: 'Failed to verify eligibility', loading: false });
    }
  }, [isFlashSale, user, accessToken, product.flashSale]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  const handleAddToCart = () => {
    setIsAdding(true);
    
    const variant = product.variants?.find(v => v.attributes.color === selectedColor);
    
    addToCart({
      ...product,
      stock: product.stock || 0,
    }, quantity, variant);

    toggleCart();

    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  const handleFlashSalePurchase = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!accessToken || !product.flashSale) return;

    setPurchaseStatus('purchasing');
    setErrorMessage(null);

    try {
      const result = await purchaseFlashSaleItem(product.flashSale.flashSaleItemId, accessToken);
      setPurchaseStatus('success');
      // Redirect to confirmation or show success
      router.push(`/checkout/confirmation?orderId=${result.purchaseId}`);
    } catch (error) {
      setPurchaseStatus('error');
      if (error instanceof FlashSaleServiceError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred during purchase.');
      }
    }
  };

  return (
    <div className="pt-24 pb-24 bg-white relative">
      {/* Flash Sale Banner */}
      {isFlashSale && (
        <div className="bg-red-600 text-white py-3 px-4 sticky top-16 z-20 shadow-md">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white text-red-600 p-1.5 rounded-full">
                <Zap size={18} fill="currentColor" />
              </div>
              <div>
                <span className="font-bold uppercase tracking-tight text-sm">Active {product.flashSale!.saleName}</span>
                <p className="text-[10px] opacity-90 uppercase font-bold">Limited quantities available</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold opacity-80">Sale Ends In</span>
                <CountdownTimer 
                  endTime={product.flashSale!.saleEndTime} 
                  mode="compact" 
                  className="text-white font-bold"
                />
              </div>
              <div className="h-10 w-px bg-white/20 hidden md:block"></div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold opacity-80">{product.flashSale!.remainingQuantity} of {product.flashSale!.maxQuantity} left</span>
                <div className="w-32 h-2 bg-white/20 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000" 
                    style={{ width: `${(product.flashSale!.remainingQuantity / product.flashSale!.maxQuantity) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 md:px-8 mt-12">
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
               <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                 {isFlashSale ? (
                   <FlashSaleBadge className="shadow-lg" />
                 ) : (
                   <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                     {product.isNew ? 'New Arrival' : 'Best Seller'}
                   </div>
                 )}
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               {[1, 2].map((i) => (
                 <div key={i} className="relative aspect-square bg-[#F5F5F7] rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                    <Image 
                      src={product.image} 
                      alt={`${product.name} Detail View ${i}`}
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
              <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6 text-primary leading-none">{product.name}</h1>
              
              <div className="mb-8">
                {isFlashSale ? (
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-4">
                      <span className="text-5xl font-bold text-red-600">${product.flashSale!.salePriceInCents / 100}</span>
                      <span className="text-2xl text-secondary line-through opacity-50">${product.flashSale!.originalPriceInCents / 100}</span>
                      <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">
                        {Math.round((1 - (product.flashSale!.salePriceInCents / product.flashSale!.originalPriceInCents)) * 100)}% OFF
                      </span>
                    </div>
                    <p className="text-red-600 font-bold text-sm mt-2 flex items-center gap-1">
                      <Zap size={14} fill="currentColor" /> Flash Sale price exclusively for members
                    </p>
                  </div>
                ) : (
                  <div className="flex items-baseline space-x-4">
                    <span className="text-3xl font-bold">${product.price}</span>
                    <span className="text-secondary text-lg">Free Shipping & Returns</span>
                  </div>
                )}
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
                  {product.colors?.map(color => (
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
              {!isFlashSale && (
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
              )}
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {isFlashSale ? (
                <div className="space-y-4">
                  {!user ? (
                    <button 
                      onClick={() => router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))}
                      className="w-full py-5 rounded-full font-bold text-lg bg-primary text-white hover:bg-cta transition-all"
                    >
                      Login to Purchase Flash Sale
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={handleFlashSalePurchase}
                        disabled={!eligibility.eligible || eligibility.loading || purchaseStatus === 'purchasing'}
                        className={`w-full py-5 rounded-full font-bold text-lg flex items-center justify-center space-x-3 transition-all ${
                          !eligibility.eligible && !eligibility.loading
                            ? 'bg-secondary/10 text-secondary cursor-not-allowed shadow-inner' 
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-[0.98]'
                        }`}
                      >
                         {eligibility.loading ? (
                           <Loader2 size={24} className="animate-spin" />
                         ) : purchaseStatus === 'purchasing' ? (
                           <Loader2 size={24} className="animate-spin" />
                         ) : !eligibility.eligible ? (
                           <span>{eligibility.reason || 'Not Eligible'}</span>
                         ) : (
                           <>
                             <Zap size={20} fill="currentColor" />
                             <span>Buy Now — ${product.flashSale!.salePriceInCents / 100}</span>
                           </>
                         )}
                      </button>

                      {errorMessage && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                          <AlertCircle size={18} />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <p className="text-[10px] text-center text-secondary uppercase tracking-widest font-bold">
                        Maximum 1 unit per customer per event
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className={`w-full py-5 rounded-full font-bold text-lg flex items-center justify-center space-x-3 transition-all ${
                    isAdding ? 'bg-green-600 text-white' : 'bg-cta hover:bg-primary text-white shadow-lg active:scale-[0.98]'
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
              )}
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
