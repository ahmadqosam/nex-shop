import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
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
    const apiUrl = process.env.AUTH_API_URL || 'http://localhost:4001';
    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
      {
        source: '/api/docs-json',
        destination: `${apiUrl}/api/docs-json`,
      },
    ];
  },
};

export default nextConfig;
