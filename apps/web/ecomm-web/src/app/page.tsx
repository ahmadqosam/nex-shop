import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductCard } from '../components/ProductCard';
import { getAllProducts } from '../services/productService';
import FlashSaleBadge from '../components/FlashSaleBadge';
import CountdownTimer from '../components/CountdownTimer';
import { Zap } from 'lucide-react';

export const revalidate = 3600; // ISR: Revalidate every hour

export default async function HomePage() {
  const products = await getAllProducts();
  const featuredProduct = products.length > 0 ? products[0] : null;
  const flashSaleProduct = products.find(p => !!p.flashSale);

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[700px] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Headphone" 
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="container mx-auto px-8 relative z-10 flex flex-col md:flex-row items-end justify-between h-full pb-20">
          <div className="max-w-2xl text-white">
            <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-8 leading-[0.8]">
              Listen <br /> Without Limits
            </h1>
            <p className="text-lg md:text-xl font-light opacity-90 max-w-sm mb-10">
              Revolutionize your space with high-fidelity sound and smart technology that adapts to your lifestyle.
            </p>
            <Link href="/products" className="inline-flex items-center space-x-4 bg-white text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform">
              <span>Explore All Products</span>
              <ArrowRight size={20} />
            </Link>
          </div>

          {featuredProduct && (
            <Link href={`/product/${featuredProduct.id}`}>
                <div className="hidden md:block bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl max-w-xs group cursor-pointer decoration-transparent">
                    <div className="relative overflow-hidden rounded-2xl mb-4 bg-gray-200 aspect-square">
                    <Image 
                        src={featuredProduct.image} 
                        alt="Featured Product" 
                        fill
                        className="object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-110" 
                        />
                    </div>
                    <div className="flex justify-between items-center text-left">
                    <div>
                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{featuredProduct.name}</p>
                        <p className="text-white font-bold">See the Product Details</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full text-white">
                        <ArrowRight size={18} />
                    </div>
                    </div>
                </div>
            </Link>
          )}
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 bg-white text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          {featuredProduct && (
            <div className="mb-12 relative h-64 md:h-96 w-full max-w-lg mx-auto overflow-visible">
                <Image 
                src={featuredProduct.image} 
                alt="Headphone Float" 
                fill
                className="object-contain drop-shadow-2xl animate-bounce-slow"
                />
            </div>
          )}
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight">
            From pioneering wireless audio to designing state-of-the-art speakers, Nex's commitment to innovation that drives and inspires.
          </h2>
        </div>
      </section>

      {/* Grid Gallery / Feature Products */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
             <div className="max-w-xl">
               <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Designed for seamless sound and advanced technology.</h2>
             </div>
             <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-200 relative">
                   <Image src="https://picsum.photos/seed/face/200" alt="Reviewer" fill className="object-cover" />
                 </div>
                 <div className="text-sm">
                   <p className="font-bold">Amazing clarity.</p>
                   <p className="text-gray-500">Alex J., Music Producer</p>
                 </div>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href="/products" className="bg-black text-white px-10 py-4 rounded-full font-bold hover:scale-105 transition-all">
              Explore All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Immersive Harmony Section */}
      <section className="py-32 bg-[#F8F8F8] overflow-hidden">
        <div className="container mx-auto px-4 relative flex flex-col items-center">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-5">
            <span className="text-9xl font-bold uppercase tracking-widest mb-4">Vibe</span>
            <span className="text-9xl font-bold uppercase tracking-widest mb-4">Groove</span>
            <span className="text-9xl font-bold uppercase tracking-widest mb-4 text-red-600">Harmony</span>
            <span className="text-9xl font-bold uppercase tracking-widest">Move</span>
          </div>
          
          <div className="text-center z-10 space-y-8">
            <h3 className="text-6xl md:text-8xl font-bold tracking-tighter text-gray-200">Harmony</h3>
            <div className="flex items-center justify-center space-x-8 text-4xl md:text-6xl font-bold tracking-tighter">
               <span className="text-gray-100">Harmony</span>
               <div className="relative">
                 <span className="text-red-600 relative z-10">Harmony</span>
                 <div className="absolute -top-12 -right-12 w-48 h-64 rotate-12 bg-gray-200 rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform hover:rotate-0 hover:scale-110 transition-all duration-500 cursor-pointer">
                    <Image src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=800" alt="Person listening" fill className="object-cover" />
                 </div>
               </div>
               <span className="text-gray-100">Harmony</span>
            </div>
            <h3 className="text-6xl md:text-8xl font-bold tracking-tighter text-gray-200">Amplify</h3>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-24 bg-black text-white rounded-[40px] mx-4 my-8 md:mx-8">
        <div className="container mx-auto px-8">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter max-w-3xl mb-24">
            Unmatched quality, smart features, and innovative technologies
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
               <div className="space-y-4">
                 <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Play size={24} />
                 </div>
                 <h4 className="text-2xl font-bold">Superior Sound Quality</h4>
                 <p className="text-gray-400 text-lg leading-relaxed">
                   With high-resolution audio technology, Nex delivers a rich, immersive sound experience that adapts to your room perfectly.
                 </p>
               </div>

               <div className="flex space-x-4 pt-10">
                 <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ArrowRight size={20} className="rotate-180" />
                 </button>
                 <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ArrowRight size={20} />
                 </button>
               </div>

               <div className="relative h-48 w-full max-w-xs overflow-hidden rounded-2xl bg-gray-900 group">
                  <Image src="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600" alt="Driver" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <p className="font-bold">Next-gen drivers</p>
                  </div>
               </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden aspect-video group">
               <Image src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=1200" alt="Tech Showcase" fill className="object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-12 flex flex-col justify-end">
                 <p className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2">Nex Arc Ultra</p>
                 <h4 className="text-3xl font-bold">Premium Smart Soundbar</h4>
               </div>
               <button className="absolute bottom-12 right-12 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Play size={20} />
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Banner / Featured Flash Sale */}
      <section className="py-24 container mx-auto px-4 md:px-8">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-center mb-16">
          {flashSaleProduct ? 'Limited Time Events' : 'Special Offers Just for You'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {flashSaleProduct ? (
            <>
              <div className="relative rounded-[40px] overflow-hidden aspect-[4/3] group bg-[#F5F5F7]">
                <Image 
                  src={flashSaleProduct.image} 
                  alt={flashSaleProduct.name} 
                  fill 
                  className="object-contain p-20 group-hover:scale-105 transition-transform duration-1000 mix-blend-multiply" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-12 flex flex-col justify-end text-white">
                  <div className="mb-2">
                    <FlashSaleBadge />
                  </div>
                  <h4 className="text-4xl font-bold mb-2">{flashSaleProduct.name}</h4>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-red-500">${flashSaleProduct.flashSale!.salePriceInCents / 100}</span>
                    <span className="text-lg line-through opacity-60">${flashSaleProduct.flashSale!.originalPriceInCents / 100}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-[40px] p-12 flex flex-col items-center justify-center text-center text-white relative overflow-hidden group">
                <div className="absolute top-10 right-10 bg-white/10 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  LIVE NOW
                </div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-600/20 blur-[100px] rounded-full" />
                
                <Zap size={48} className="text-red-600 mb-8" fill="currentColor" />
                
                <h4 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6 leading-none">
                  {flashSaleProduct.flashSale!.saleName}
                </h4>
                <div className="text-xl text-white/70 mb-10 max-w-sm">
                  Exclusive member-only prices. <br />
                  Ends in <span className="text-white font-bold inline-block min-w-[100px] text-left ml-1">
                    <CountdownTimer endTime={flashSaleProduct.flashSale!.saleEndTime} mode="compact" />
                  </span>
                </div>
                
                <Link 
                  href={`/product/${flashSaleProduct.id}`} 
                  className="flex items-center space-x-2 bg-white text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform"
                >
                  <span>Shop the Sale</span>
                  <ArrowRight size={20} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="relative rounded-[40px] overflow-hidden aspect-[4/3] group">
                <Image src="https://images.unsplash.com/photo-1512446816042-444d641267d4?auto=format&fit=crop&q=80&w=1200" alt="Roam 2" fill className="object-cover group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-12 flex flex-col justify-end text-white">
                  <h4 className="text-3xl font-bold mb-2">Roam 2</h4>
                  <p className="text-white/80">Ultra Portable Smart Speaker</p>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-[40px] p-12 flex flex-col items-center justify-center text-center text-white relative overflow-hidden group">
                <div className="absolute top-10 right-10 bg-white/10 text-xs font-bold px-4 py-2 rounded-full">Black Friday Only!</div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-600/20 blur-[100px] rounded-full" />
                
                <h4 className="text-5xl md:text-6xl font-bold tracking-tighter mb-10 leading-none">
                  Black Friday Flash <br /> Sale – 50% Off <br /> Sitewide!
                </h4>
                
                <Link href="/products" className="flex items-center space-x-2 bg-white text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform">
                  <span>Check Offers</span>
                  <ArrowRight size={20} />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 bg-black text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
        <div className="container mx-auto px-4 relative z-10 max-w-2xl">
           <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-tight">Transform your listening experience with Nex</h2>
           <p className="text-xl text-gray-400 mb-12">Don't miss out on our latest deals and exclusive offers!</p>
           <button className="bg-white text-black px-12 py-5 rounded-full font-bold text-lg hover:bg-gray-200 transition-all">Shop Now</button>
        </div>
      </section>
    </div>
  );
}
