import React from 'react';
import { notFound } from 'next/navigation';
import { getProductById, getAllProducts } from '../../../services/productService';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 3600; // ISR: Revalidate every hour

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({
    id: product.id,
  }));
}

export default async function ProductDetailPage({ params }: Props) {
  let product;

  try {
    const { id } = await params;
    product = await getProductById(id);
  } catch {
    // Log error if needed
    notFound();
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
