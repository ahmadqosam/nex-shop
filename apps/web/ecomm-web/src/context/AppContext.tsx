"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, CartItem, User } from '../types';
import { AuthState } from '../types/auth';
import * as authService from '../services/authService';

interface AppContextType {
  cart: CartItem[];
  user: User | null;
  isCartOpen: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'nex_user';
const CART_STORAGE_KEY = 'nex_cart';
const REFRESH_BUFFER_MS = 60000; // Refresh 1 minute before expiry

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    expiresAt: null,
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted state on mount (only cart and user - tokens are NOT persisted)
  useEffect(() => {
    /* v8 ignore start */
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) setUser(JSON.parse(savedUser));
    }
    /* v8 ignore stop */
  }, []);

  // Persist cart
  useEffect(() => {
    /* v8 ignore start */
    if (typeof window !== 'undefined') {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
    /* v8 ignore stop */
  }, [cart]);

  // Persist user
  useEffect(() => {
    /* v8 ignore start */
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    /* v8 ignore stop */
  }, [user]);

  // Setup token refresh (refresh token is in httpOnly cookie, managed by browser)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (!authState.expiresAt) return;

    const timeUntilExpiry = authState.expiresAt - Date.now();
    const refreshIn = Math.max(timeUntilExpiry - REFRESH_BUFFER_MS, 0);

    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await authService.refreshToken();
        setAuthState({
          accessToken: response.accessToken,
          expiresAt: Date.now() + response.expiresIn * 1000,
        });
      } catch {
        // Token refresh failed, logout
        setUser(null);
        setAuthState({ accessToken: null, expiresAt: null });
      }
    }, refreshIn);
  }, [authState.expiresAt]);

  useEffect(() => {
    scheduleRefresh();
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [scheduleRefresh]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item));
  };

  const clearCart = () => setCart([]);

  const toggleCart = () => setIsCartOpen(prev => !prev);

  const clearAuthError = () => setAuthError(null);

  const login = async (email: string, password: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const response = await authService.login({ email, password });
      setAuthState({
        accessToken: response.accessToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
      });
      // Decode JWT to get user info (simplified - just use email)
      setUser({ id: email, email, name: email.split('@')[0] });
    } catch (error) {
      if (error instanceof authService.AuthServiceError) {
        setAuthError(error.message);
      } else {
        setAuthError('An unexpected error occurred');
      }
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const response = await authService.register({ email, password, name });
      setAuthState({
        accessToken: response.accessToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
      });
      setUser({ id: email, email, name: name || email.split('@')[0] });
    } catch (error) {
      if (error instanceof authService.AuthServiceError) {
        setAuthError(error.message);
      } else {
        setAuthError('An unexpected error occurred');
      }
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    setIsAuthLoading(true);
    try {
      if (authState.accessToken) {
        await authService.logout(authState.accessToken);
      }
    } catch {
      // Ignore logout errors, clear state anyway
    } finally {
      setUser(null);
      setAuthState({ accessToken: null, expiresAt: null });
      setIsAuthLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{
      cart, user, isCartOpen, isAuthLoading, authError,
      addToCart, removeFromCart, updateQuantity, clearCart, toggleCart,
      login, register, logout, clearAuthError
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  /* v8 ignore start */
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  /* v8 ignore stop */
  return context;
};
