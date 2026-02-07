export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  features: string[];
  specs: { [key: string]: string };
  isNew?: boolean;
  isBestSeller?: boolean;
  colors?: string[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AppState {
  cart: CartItem[];
  user: User | null;
  isCartOpen: boolean;
}
