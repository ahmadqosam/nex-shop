"use client";

import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Menu, X, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cart, toggleCart, user } = useAppContext();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navLinks = [
    { name: 'Products', path: '/products' },
    { name: 'Technology', path: '#' },
    { name: 'Learn', path: '#' },
    { name: 'Support', path: '#' },
    { name: 'About Us', path: '#' },
  ];

  return (
    <>
      {/* Top Banner */}
      <div className="bg-primary text-background text-[10px] md:text-xs py-2 text-center relative z-[60]">
        <span className="font-light tracking-wide">Black Friday Flash Sale – 50% Off Sitewide!</span>
        <button className="underline ml-4 hover:text-cta transition-colors">Shop Now</button>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-background/80 hover:text-white" aria-label="Close banner">
          <X size={14} />
        </button>
      </div>

      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background/95 backdrop-blur-md py-4 border-b border-gray-100 shadow-sm' : 'bg-transparent py-6'} mt-[32px]`}>
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-12">
            <Link href="/" className="text-2xl font-bold tracking-tighter font-serif text-primary">NEX</Link>
            
            <div className="hidden lg:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.path} 
                  className={`text-sm font-medium tracking-tight hover:text-cta transition-colors ${isScrolled || pathname !== '/' ? 'text-primary' : 'text-primary'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-6 text-primary">
            <button className="hover:text-cta transition-colors" aria-label="Search"><Search size={20} /></button>
            <Link href={user ? "/profile" : "/login"} className="hover:text-cta transition-colors" aria-label="Account">
               <UserIcon size={20} />
            </Link>
            <button onClick={toggleCart} className="relative hover:text-cta transition-colors" aria-label="Open cart">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-cta text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button 
              className="lg:hidden hover:text-cta transition-colors" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-background pt-24 px-8 lg:hidden">
          <button 
            className="absolute top-8 right-8 hover:text-cta transition-colors" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close mobile menu"
          >
            <X size={32} />
          </button>
          <div className="flex flex-col space-y-8 text-3xl font-bold font-serif text-primary">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.path} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-cta transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
