import { Product, ProductResponseDto, PaginatedProductsResponseDto } from '../types';

const PRODUCT_API_URL = process.env.PRODUCT_API_URL || 'http://localhost:4002';

const PRODUCT_API_BASE = typeof window === 'undefined'
  ? `${PRODUCT_API_URL}/products`
  : '/api/products';

export class ProductServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ProductServiceError';
    this.statusCode = statusCode;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new ProductServiceError(message, response.status);
  }
  return response.json();
}

function transformProduct(dto: ProductResponseDto): Product {
  // Extract unique colors from variants if available
  const colors = dto.variants 
    ? Array.from(new Set(
        dto.variants
          .map(v => v.attributes.color)
          .filter((c): c is string => !!c)
      ))
    : [];

  // Hardcoded features as per requirement
  const features = [
    'Active Noise Cancellation',
    'Spatial Audio',
    'High Fidelity Sound',
    'Wireless Connectivity'
  ];

  // Map specifications correctly
  const specs: { [key: string]: string } = {};
  if (dto.specifications) {
    Object.entries(dto.specifications).forEach(([key, value]) => {
      if (value) {
        // Convert snake_case to Title Case (simple version) or utilize key mapping if needed
        // For now, using keys as is or creating a mapping
        const readableKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        specs[readableKey] = value;
      }
    });
  }

  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    price: dto.basePriceInCents / 100, // Convert cents to dollars
    image: (dto.images && dto.images.length > 0) ? dto.images[0] : '',
    description: dto.description || '',
    features: features, 
    specs: specs,
    isNew: new Date(dto.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000, 
    isBestSeller: false, // Default
    colors: colors.length > 0 ? colors : undefined,
  };
}

export async function getAllProducts(category?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  // Map 'All' to empty string or handle logic
  if (category && category !== 'All') {
    params.append('category', category);
  }
  // Optional: Add limit=100 so we see all products for now, until pagination is added to UI
  params.append('limit', '100');
  
  const response = await fetch(`${PRODUCT_API_BASE}?${params.toString()}`);
  const data = await handleResponse<PaginatedProductsResponseDto>(response);
  return data.data.map(transformProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const url = `${PRODUCT_API_BASE}/${id}`;
    
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new ProductServiceError('Failed to fetch product', res.status);
    }
    
    const productDto: ProductResponseDto = await res.json();
    return transformProduct(productDto);
  } catch (error) {
    if (error instanceof ProductServiceError) throw error;
    throw new ProductServiceError('Network error or invalid response', 500);
  }
}
