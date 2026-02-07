import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Nex Ace',
    category: 'Headphone',
    price: 449,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
    description: 'Revolutionize your space with high-fidelity sound and smart technology that adapts to your lifestyle.',
    features: ['Active Noise Cancellation', 'Spatial Audio', '30-hour Battery Life', 'Ultra Soft Earcups'],
    specs: { 'Driver Size': '40mm', 'Weight': '280g', 'Bluetooth': '5.2' },
    isNew: true,
    colors: ['#000000', '#FFFFFF']
  },
  {
    id: '2',
    name: 'Beam (Gen 2)',
    category: 'Premium Smart Soundbar',
    price: 999,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=800',
    description: 'A compact smart soundbar for TV, music and more. Now with Dolby Atmos.',
    features: ['Dolby Atmos', 'Voice Control', 'Apple AirPlay 2', 'WiFi Streaming'],
    specs: { 'Width': '651mm', 'Depth': '100mm', 'HDMI ARC': 'Yes' },
    colors: ['#000000', '#F5F5F5']
  },
  {
    id: '3',
    name: 'Roam 2 Charging Set',
    category: 'Portable Smart Speaker',
    price: 228,
    image: 'https://images.unsplash.com/photo-1512446816042-444d641267d4?auto=format&fit=crop&q=80&w=800',
    description: 'The lightweight, outdoor-ready portable speaker for all your adventures.',
    features: ['IP67 Waterproof', 'Drop Resistant', '10-hour Battery', 'Automatic Trueplay'],
    specs: { 'Weight': '0.43kg', 'Charging': 'Wireless', 'Microphone': 'Built-in' },
    isBestSeller: true,
    colors: ['#000000', '#FFFFFF', '#556B2F']
  },
  {
    id: '4',
    name: 'Move 2',
    category: 'Portable Smart Speaker',
    price: 449,
    image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&q=80&w=800',
    description: 'Powerful stereo sound for indoor and outdoor listening.',
    features: ['Stereo Sound', 'Bluetooth & WiFi', 'Line-In', '24-hour Battery'],
    specs: { 'Height': '241mm', 'Width': '160mm', 'Weight': '3kg' },
    colors: ['#000000', '#F5F5F5', '#8B4513']
  }
];

export const CATEGORIES = ['All', 'Speakers', 'Headphones', 'Soundbars', 'Sets'];
