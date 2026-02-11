import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4002',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4566',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'www.apple.com',
      },
    ],
  },
  async rewrites() {
    const authUrl = process.env.AUTH_API_URL || 'http://localhost:4001';
    const productUrl = process.env.PRODUCT_API_URL || 'http://localhost:4002';
    const inventoryUrl = process.env.INVENTORY_API_URL || 'http://localhost:4003';
    const cartUrl = process.env.CART_API_URL || 'http://localhost:4004';
    const orderUrl = process.env.ORDER_API_URL || 'http://localhost:4005';
    const paymentUrl = process.env.PAYMENT_API_URL || 'http://localhost:4006';

    return [
      {
        source: '/api/auth/:path*',
        destination: `${authUrl}/auth/:path*`,
      },
      {
        source: '/api/docs-json',
        destination: `${productUrl}/api/docs-json`,
      },
      {
        source: '/api/products/:path*',
        destination: `${productUrl}/products/:path*`,
      },
      {
        source: '/images/:path*',
        destination: `${productUrl}/images/:path*`,
      },
      {
        source: '/api/inventory/:path*',
        destination: `${inventoryUrl}/inventory/:path*`,
      },
      {
        source: '/api/cart/:path*',
        destination: `${cartUrl}/cart/:path*`,
      },
      {
        source: '/api/orders/:path*',
        destination: `${orderUrl}/orders/:path*`,
      },
      {
        source: '/api/payments/:path*',
        destination: `${paymentUrl}/payments/:path*`,
      },
    ];
  },
};

export default nextConfig;
