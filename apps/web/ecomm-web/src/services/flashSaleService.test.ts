import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as flashSaleService from './flashSaleService';

describe('flashSaleService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('getActiveFlashSales', () => {
    it('should return active flash sales', async () => {
      const mockSales = [{ id: 'sale-1', name: 'Summer Sale', items: [] }];
      (fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockSales),
      });

      const result = await flashSaleService.getActiveFlashSales();
      expect(result).toEqual(mockSales);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/active'), expect.any(Object));
    });

    it('should throw error on failure', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'API Error' }),
      });

      await expect(flashSaleService.getActiveFlashSales()).rejects.toThrow('API Error');
    });
  });

  describe('getFlashSaleForProduct', () => {
    it('should return flash sale item for product', async () => {
      const mockItem = { id: 'item-1', productId: 'prod-1' };
      (fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockItem),
      });

      const result = await flashSaleService.getFlashSaleForProduct('prod-1');
      expect(result).toEqual(mockItem);
    });

    it('should return null if item not found (404)', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await flashSaleService.getFlashSaleForProduct('prod-1');
      expect(result).toBeNull();
    });

    it('should return null if response body is empty (200 OK)', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        text: async () => '',
      });

      const result = await flashSaleService.getFlashSaleForProduct('prod-1');
      expect(result).toBeNull();
    });
  });

  describe('checkEligibility', () => {
    it('should return eligibility status', async () => {
      const mockEligibility = { eligible: true };
      (fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEligibility),
      });

      const result = await flashSaleService.checkEligibility('item-1', 'token-123');
      expect(result).toEqual(mockEligibility);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/eligibility/item-1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token-123'
          })
        })
      );
    });
  });

  describe('purchaseFlashSaleItem', () => {
    it('should return purchase result', async () => {
      const mockResult = { purchaseId: 'p-1' };
      (fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResult),
      });

      const result = await flashSaleService.purchaseFlashSaleItem('item-1', 'token-123');
      expect(result).toEqual(mockResult);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/purchase'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ flashSaleItemId: 'item-1' })
        })
      );
    });
  });
});
