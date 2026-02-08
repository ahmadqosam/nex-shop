import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartStatus } from '@prisma/cart-api-client';

describe('CartController', () => {
  let controller: CartController;
  let service: jest.Mocked<CartService>;

  const mockCart = {
    id: 'cart-123',
    userId: 'user-123',
    sessionId: null,
    status: CartStatus.ACTIVE,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockCartItem = {
    id: 'item-123',
    cartId: 'cart-123',
    productId: 'prod-123',
    variantId: 'var-123',
    sku: 'SKU-001',
    quantity: 2,
    priceInCents: 9999,
    currency: 'USD',
    productName: 'Test Product',
    variantName: 'Black',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCartWithItems = { ...mockCart, items: [mockCartItem] };

  beforeEach(async () => {
    const mockService = {
      getOrCreateCart: jest.fn(),
      getCartById: jest.fn(),
      getCartSummary: jest.fn(),
      addItem: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      mergeGuestCart: jest.fn(),
      convertCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockService }],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get(CartService);
  });

  describe('getCart', () => {
    it('should call getOrCreateCart with userId', async () => {
      service.getOrCreateCart.mockResolvedValue(mockCart);

      const result = await controller.getCart('user-123', undefined);

      expect(service.getOrCreateCart).toHaveBeenCalledWith(
        'user-123',
        undefined,
      );
      expect(result).toEqual(mockCart);
    });

    it('should call getOrCreateCart with sessionId', async () => {
      service.getOrCreateCart.mockResolvedValue(mockCart);

      const result = await controller.getCart(undefined, 'session-123');

      expect(service.getOrCreateCart).toHaveBeenCalledWith(
        undefined,
        'session-123',
      );
      expect(result).toEqual(mockCart);
    });
  });

  describe('getCartById', () => {
    it('should call getCartById with cartId', async () => {
      service.getCartById.mockResolvedValue(mockCartWithItems);

      const result = await controller.getCartById('cart-123');

      expect(service.getCartById).toHaveBeenCalledWith('cart-123');
      expect(result).toEqual(mockCartWithItems);
    });
  });

  describe('getCartSummary', () => {
    it('should call getCartSummary with cartId', async () => {
      const mockSummary = {
        cartId: 'cart-123',
        itemCount: 2,
        subtotalInCents: 19998,
        currency: 'USD',
        items: [mockCartItem],
      };
      service.getCartSummary.mockResolvedValue(mockSummary);

      const result = await controller.getCartSummary('cart-123');

      expect(service.getCartSummary).toHaveBeenCalledWith('cart-123');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('addItem', () => {
    it('should call addItem with cartId and dto', async () => {
      const dto = {
        productId: 'prod-123',
        variantId: 'var-123',
        sku: 'SKU-001',
        quantity: 1,
        priceInCents: 9999,
        productName: 'Test Product',
        variantName: 'Black',
      };
      service.addItem.mockResolvedValue(mockCartWithItems);

      const result = await controller.addItem('cart-123', dto);

      expect(service.addItem).toHaveBeenCalledWith('cart-123', dto);
      expect(result).toEqual(mockCartWithItems);
    });
  });

  describe('updateItemQuantity', () => {
    it('should call updateItemQuantity with correct params', async () => {
      const dto = { quantity: 5 };
      service.updateItemQuantity.mockResolvedValue(mockCartWithItems);

      const result = await controller.updateItemQuantity(
        'cart-123',
        'item-123',
        dto,
      );

      expect(service.updateItemQuantity).toHaveBeenCalledWith(
        'cart-123',
        'item-123',
        dto,
      );
      expect(result).toEqual(mockCartWithItems);
    });
  });

  describe('removeItem', () => {
    it('should call removeItem with correct params', async () => {
      service.removeItem.mockResolvedValue({ ...mockCart, items: [] });

      const result = await controller.removeItem('cart-123', 'item-123');

      expect(service.removeItem).toHaveBeenCalledWith('cart-123', 'item-123');
      expect(result.items).toEqual([]);
    });
  });

  describe('clearCart', () => {
    it('should call clearCart with cartId', async () => {
      service.clearCart.mockResolvedValue({ ...mockCart, items: [] });

      const result = await controller.clearCart('cart-123');

      expect(service.clearCart).toHaveBeenCalledWith('cart-123');
      expect(result.items).toEqual([]);
    });
  });

  describe('mergeCart', () => {
    it('should call mergeGuestCart with sessionId and userId', async () => {
      service.mergeGuestCart.mockResolvedValue(mockCartWithItems);

      const result = await controller.mergeCart('session-123', 'user-123');

      expect(service.mergeGuestCart).toHaveBeenCalledWith(
        'session-123',
        'user-123',
      );
      expect(result).toEqual(mockCartWithItems);
    });
  });

  describe('convertCart', () => {
    it('should call convertCart with cartId', async () => {
      const convertedCart = { ...mockCartWithItems, status: CartStatus.CONVERTED };
      service.convertCart.mockResolvedValue(convertedCart);

      const result = await controller.convertCart('cart-123');

      expect(service.convertCart).toHaveBeenCalledWith('cart-123');
      expect(result).toEqual(convertedCart);
    });
  });
});
