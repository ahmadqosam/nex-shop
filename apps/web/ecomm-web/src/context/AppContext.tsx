"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, CartItem, User, AddItemDto } from '../types';
import { AuthState } from '../types/auth';
import * as authService from '../services/authService';
import { cartService } from '../services/cartService';

interface AppContextType {
  cart: CartItem[];
  cartId: string | null;
  user: User | null;
  isCartOpen: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  addToCart: (product: Product, quantity?: number, selectedVariant?: { id: string; name: string; sku: string; price: number }) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'nex_user';
const SESSION_STORAGE_KEY = 'nex_session_id';
const REFRESH_BUFFER_MS = 60000; // Refresh 1 minute before expiry

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    expiresAt: null,
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session and load user/cart
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load user
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) setUser(JSON.parse(savedUser));

      // Load or create session ID
      let currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
      }
      setSessionId(currentSessionId);
    }
  }, []);

  // Fetch cart when session or user is ready
  useEffect(() => {
    const fetchCart = async () => {
      if (!sessionId) return;
      
      try {
        const cart = await cartService.getCart(
          user?.id, 
          sessionId, 
          authState.accessToken || undefined
        );
        setCartId(cart.id);
        setCartItems(cart.items);
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      }
    };

    fetchCart();
  }, [sessionId, user?.id, authState.accessToken]);

  // Persist user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
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

  const addToCart = async (
    product: Product, 
    quantity: number = 1,
    selectedVariant?: { id: string; name: string; sku: string; price: number }
  ) => {
    if (!cartId) return;

    try {
      const priceToUse = selectedVariant ? selectedVariant.price : product.price;
      // Convert to cents for API if price is in dollars/float, assumes input is dollars
      const priceInCents = Math.round(priceToUse * 100);

      const dto: AddItemDto = {
        productId: product.id,
        variantId: selectedVariant?.id || 'default', // cart-api requires these
        sku: selectedVariant?.sku || 'default-sku',
        quantity,
        priceInCents,
        productName: product.name,
        variantName: selectedVariant?.name || 'Standard',
        imageUrl: selectedVariant && 'image' in selectedVariant && typeof selectedVariant.image === 'string' 
          ? selectedVariant.image 
          : product.image,
      };

      const updatedCart = await cartService.addItem(
        cartId, 
        dto, 
        authState.accessToken || undefined
      );
      setCartItems(updatedCart.items);
      setIsCartOpen(true);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      // Could set an error state here to show to user
    }
  };

  const removeFromCart = async (itemId: string) => { // items in cart use item ID not product ID
    if (!cartId) return;
    try {
      const updatedCart = await cartService.removeItem(
        cartId, 
        itemId, 
        authState.accessToken || undefined
      );
      setCartItems(updatedCart.items);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!cartId) return;
    if (quantity < 1) {
      return removeFromCart(itemId);
    }

    try {
      const updatedCart = await cartService.updateItem(
        cartId, 
        itemId, 
        quantity, 
        authState.accessToken || undefined
      );
      setCartItems(updatedCart.items);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const clearCart = async () => {
    if (!cartId) return;
    try {
      await cartService.clearCart(cartId, authState.accessToken || undefined);
      setCartItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  const toggleCart = () => setIsCartOpen(prev => !prev);
  const clearAuthError = () => setAuthError(null);

  const login = async (email: string, password: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const response = await authService.login({ email, password });
      const token = response.accessToken;
      
      setAuthState({
        accessToken: token,
        expiresAt: Date.now() + response.expiresIn * 1000,
      });
      setUser({ id: email, email, name: email.split('@')[0] });

      // Merge cart
      if (sessionId) {
        const mergedCart = await cartService.mergeCart(sessionId, email, token); // user ID is email in this simple app?
        // Note: Real user ID might be needed if not email.
        // Assuming user.id is correct here. If not, we need to decode token.
        setCartId(mergedCart.id);
        setCartItems(mergedCart.items);
      }
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
      const token = response.accessToken;
      
      setAuthState({
        accessToken: token,
        expiresAt: Date.now() + response.expiresIn * 1000,
      });
      setUser({ id: email, email, name: name || email.split('@')[0] });
      
      // Merge cart also for register? Usually just create new or claim guest cart.
      if (sessionId) {
        const mergedCart = await cartService.mergeCart(sessionId, email, token);
        setCartId(mergedCart.id);
        setCartItems(mergedCart.items);
      }
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
      // Ignore
    } finally {
      setUser(null);
      setAuthState({ accessToken: null, expiresAt: null });
      setCartItems([]); // Clear cart locally
      setCartId(null);  // Reset cart ID so we get a guest one next
      // We keep session ID in localStorage, so next load might pick it up if generic
      // ideally generated new guest session
      if (typeof window !== 'undefined') {
         localStorage.removeItem(SESSION_STORAGE_KEY);
         const newSessionId = crypto.randomUUID();
         localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
         setSessionId(newSessionId);
      }

      setIsAuthLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{
      cart: cartItems,
      cartId,
      user, 
      isCartOpen, 
      isAuthLoading, 
      authError,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      toggleCart,
      login, 
      register, 
      logout, 
      clearAuthError
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

