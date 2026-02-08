import React from 'react';
import { getAllProducts } from '../../services/productService';
import ProductListClient from './ProductListClient';

export const revalidate = 3600; // ISR: Revalidate every hour

export default async function ProductListingPage() {
  const initialProducts = await getAllProducts(); // Fetch all products initially

  return <ProductListClient initialProducts={initialProducts} />;
}
