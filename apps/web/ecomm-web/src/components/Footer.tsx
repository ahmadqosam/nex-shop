import React from 'react';
import { Instagram, Twitter, Facebook, Linkedin, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white pt-24 pb-8 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
          <div className="md:col-span-8 space-y-12">
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-none">
              Ready to Experience the <br /> Future of Sound?
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 pt-12">
               <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone</p>
                  <p className="text-xl font-bold">+1 800 680 2345</p>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">E-mail</p>
                  <p className="text-xl font-bold">support@nex.com</p>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Address</p>
                  <p className="text-xl font-bold">614 Chapala Street, <br />Santa Barbara, CA 93101</p>
               </div>
            </div>

            <div className="pt-12 space-y-8">
               <p className="text-xl font-bold max-w-md">Sign up for the latest updates and exclusive offers</p>
               <div className="flex max-w-lg border-b-2 border-black pb-2 items-center">
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    className="flex-1 bg-transparent text-xl font-medium outline-none"
                  />
                  <button className="p-2 hover:translate-x-1 transition-transform">
                    <ArrowRight size={24} />
                  </button>
               </div>
               <button className="bg-black text-white px-10 py-3 rounded-full font-bold text-sm uppercase tracking-widest">Subscribe</button>
            </div>
          </div>

          <div className="md:col-span-4 bg-[#F8F8F8] rounded-[40px] overflow-hidden relative group h-[600px]">
             <Image 
               src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800" 
               alt="Nex Ace Premium Wireless Headphone" 
               fill
               className="object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-105"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent p-12 flex flex-col justify-end text-white z-10">
                <p className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2">Nex Ace</p>
                <p className="text-2xl font-bold">Premium Headphone</p>
                <button className="mt-6 flex items-center space-x-2 text-sm font-bold underline underline-offset-4">
                   <span>See Product Specification</span>
                   <ArrowRight size={16} />
                </button>
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-gray-100 space-y-8 md:space-y-0">
          <div className="flex space-x-8">
            <Instagram size={20} className="hover:text-gray-500 cursor-pointer transition-colors" />
            <Twitter size={20} className="hover:text-gray-500 cursor-pointer transition-colors" />
            <Facebook size={20} className="hover:text-gray-500 cursor-pointer transition-colors" />
            <Linkedin size={20} className="hover:text-gray-500 cursor-pointer transition-colors" />
          </div>

          <div className="flex space-x-12 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-black">Privacy Policy</a>
            <a href="#" className="hover:text-black">Terms and Conditions</a>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            All rights reserved © Nex 2024
          </p>
        </div>
      </div>
    </footer>
  );
};
