import { FlashSaleDto, FlashSaleItemDto, EligibilityDto, PurchaseResultDto } from '../types/flash-sale';

const FLASH_SALE_API_BASE = typeof window === 'undefined'
  ? `${process.env.PRODUCT_API_URL || 'http://localhost:4002'}/flash-sales`
  : '/api/flash-sales';

export class FlashSaleServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'FlashSaleServiceError';
    this.statusCode = statusCode;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new FlashSaleServiceError(message, response.status);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function getActiveFlashSales(): Promise<FlashSaleDto[]> {
  try {
    const response = await fetch(`${FLASH_SALE_API_BASE}/active`, {
      next: { revalidate: 30 }
    });
    return await handleResponse<FlashSaleDto[]>(response);
  } catch (error) {
    if (error instanceof FlashSaleServiceError) throw error;
    throw new FlashSaleServiceError('Network error or invalid response', 500);
  }
}

export async function getFlashSaleForProduct(productId: string): Promise<FlashSaleItemDto | null> {
  try {
    const response = await fetch(`${FLASH_SALE_API_BASE}/product/${productId}`, {
      next: { revalidate: 30 }
    });
    if (response.status === 404) return null;
    return await handleResponse<FlashSaleItemDto | null>(response);
  } catch (error) {
    if (error instanceof FlashSaleServiceError) throw error;
    throw new FlashSaleServiceError('Network error or invalid response', 500);
  }
}

export async function checkEligibility(flashSaleItemId: string, token: string): Promise<EligibilityDto> {
  try {
    const response = await fetch(`${FLASH_SALE_API_BASE}/eligibility/${flashSaleItemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });
    return await handleResponse<EligibilityDto>(response);
  } catch (error) {
    if (error instanceof FlashSaleServiceError) throw error;
    throw new FlashSaleServiceError('Network error or invalid response', 500);
  }
}

export async function purchaseFlashSaleItem(flashSaleItemId: string, token: string): Promise<PurchaseResultDto> {
  try {
    const response = await fetch(`${FLASH_SALE_API_BASE}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ flashSaleItemId }),
      cache: 'no-store'
    });
    return await handleResponse<PurchaseResultDto>(response);
  } catch (error) {
    if (error instanceof FlashSaleServiceError) throw error;
    throw new FlashSaleServiceError('Network error or invalid response', 500);
  }
}
