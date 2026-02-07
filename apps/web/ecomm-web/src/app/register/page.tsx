"use client";

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterPage() {
  const { register, isAuthLoading, authError, clearAuthError } = useAppContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, name || undefined);
      router.push('/');
    } catch {
      // Error is already set in context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/5 px-4 font-sans">
      <div className="bg-background p-8 md:p-16 rounded-[40px] shadow-2xl max-w-lg w-full space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter mb-4 font-serif text-primary">Create Account</h1>
          <p className="text-secondary font-medium">Join Nex for exclusive access to premium audio gear.</p>
        </div>

        {authError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between items-center">
            <span>{authError}</span>
            <button onClick={clearAuthError} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary/70">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40" size={20} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isAuthLoading}
                className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-cta/10 transition-all text-primary disabled:opacity-50" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary/70">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40" size={20} />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isAuthLoading}
                className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-cta/10 transition-all text-primary disabled:opacity-50" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary/70">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40" size={20} />
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                disabled={isAuthLoading}
                className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-cta/10 transition-all text-primary disabled:opacity-50" 
              />
            </div>
            <p className="text-[10px] text-secondary/50">Minimum 8 characters</p>
          </div>

          <button 
            type="submit"
            disabled={isAuthLoading}
            className="w-full bg-primary text-background py-5 rounded-full font-bold text-lg hover:bg-cta transition-all flex items-center justify-center space-x-4 group shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isAuthLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="text-center space-y-6">
          <div className="flex items-center space-x-4 text-secondary/30">
            <div className="flex-1 h-px bg-current" />
            <span className="text-[10px] font-bold uppercase tracking-widest">or sign up with</span>
            <div className="flex-1 h-px bg-current" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button className="flex items-center justify-center space-x-2 border-2 border-secondary/10 rounded-2xl py-3 hover:bg-secondary/5 transition-colors">
                <Image src="https://www.google.com/favicon.ico" alt="Google" width={16} height={16} className="w-4 h-4" />
                <span className="text-sm font-bold text-primary">Google</span>
             </button>
             <button className="flex items-center justify-center space-x-2 border-2 border-secondary/10 rounded-2xl py-3 hover:bg-secondary/5 transition-colors">
                <Image src="https://www.apple.com/favicon.ico" alt="Apple" width={16} height={16} className="w-4 h-4" />
                <span className="text-sm font-bold text-primary">Apple</span>
             </button>
          </div>

          <p className="text-sm text-secondary">
            Already have an account? <Link href="/login" className="font-bold text-primary underline hover:text-cta transition-colors">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
