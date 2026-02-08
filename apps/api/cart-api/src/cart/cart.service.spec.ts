import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import { CartStatus } from '@prisma/cart-api-client';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';


describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let cache: any;
  let httpService: any;



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
    const mockPrisma = {
      cart: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn().mockReturnValue(300),
    };

    const mockHttpService = {
      get: jest.fn(),
    };


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: ConfigService, useValue: mockConfig },
        { provide: HttpService, useValue: mockHttpService },
      ],

    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get(PrismaService);
    cache = module.get(CacheService);
    httpService = module.get(HttpService);
  });


  describe('getOrCreateCart', () => {
    it('should throw BadRequestException if no userId or sessionId provided', async () => {
      await expect(service.getOrCreateCart()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return cached cart if exists', async () => {
      cache.get
        .mockResolvedValueOnce('cart-123') // lookup key
        .mockResolvedValueOnce(mockCart); // cart data

      const result = await service.getOrCreateCart('user-123');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.findFirst).not.toHaveBeenCalled();
    });

    it('should query DB and cache if not in cache', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findFirst.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-123');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.findFirst).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });

    it('should create new cart if none exists', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-123');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.create).toHaveBeenCalled();
    });

    it('should set expiresAt for guest carts', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({
        ...mockCart,
        sessionId: 'session-123',
        userId: null,
        expiresAt: new Date(),
      });

      await service.getOrCreateCart(undefined, 'session-123');

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-123',
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getCartById', () => {
    it('should return cached cart', async () => {
      cache.get.mockResolvedValue(mockCartWithItems);

      const result = await service.getCartById('cart-123');

      expect(result).toEqual(mockCartWithItems);
      expect(prisma.cart.findUnique).not.toHaveBeenCalled();
    });

    it('should query DB if not cached', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findUnique.mockResolvedValue(mockCartWithItems);

      const result = await service.getCartById('cart-123');

      expect(result).toEqual(mockCartWithItems);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return null if cart not found', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCartById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addItem', () => {
    const addItemDto = {
      productId: 'prod-123',
      variantId: 'var-123',
      sku: 'SKU-001',
      quantity: 1,
      priceInCents: 9999,
      productName: 'Test Product',
      variantName: 'Black',
    };

    it('should throw NotFoundException if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.addItem('cart-123', addItemDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if cart not active', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        ...mockCart,
        status: CartStatus.MERGED,
      });

      await expect(service.addItem('cart-123', addItemDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new item if not exists', async () => {
      prisma.cart.findUnique
        .mockResolvedValueOnce(mockCart) // First call for validation
        .mockResolvedValue(mockCartWithItems); // Second call for return
      prisma.cartItem.findUnique.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue(mockCartItem);
      httpService.get.mockReturnValue(of({ data: { quantity: 10 } }));


      await service.addItem('cart-123', addItemDto);

      expect(prisma.cartItem.create).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalled(); // Invalidated
    });

    it('should update quantity if item exists', async () => {
      prisma.cart.findUnique
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValue(mockCartWithItems);
      prisma.cartItem.findUnique.mockResolvedValue(mockCartItem);
      prisma.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
      });
      httpService.get.mockReturnValue(of({ data: { quantity: 10 } }));

      await service.addItem('cart-123', addItemDto);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          quantity: 3, // 2 + 1
          priceInCents: 9999,
        },
      });
    });
  });

  describe('updateItemQuantity', () => {
    it('should throw NotFoundException if item not found', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItemQuantity('cart-123', 'item-123', { quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update quantity', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        ...mockCartItem,
        cart: mockCart,
      });
      prisma.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      });
      prisma.cart.findUnique.mockResolvedValue(mockCartWithItems);

      prisma.cart.findUnique.mockResolvedValue(mockCartWithItems);
      httpService.get.mockReturnValue(of({ data: { quantity: 10 } }));

      await service.updateItemQuantity('cart-123', 'item-123', { quantity: 5 });


      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { quantity: 5 },
      });
    });

    it('should delete item if quantity is 0', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        ...mockCartItem,
        cart: mockCart,
      });
      prisma.cart.findUnique.mockResolvedValue({ ...mockCart, items: [] });

      await service.updateItemQuantity('cart-123', 'item-123', { quantity: 0 });

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123' },
      });
    });
  });

  describe('removeItem', () => {
    it('should throw NotFoundException if item not found', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem('cart-123', 'item-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete item and invalidate cache', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        ...mockCartItem,
        cart: mockCart,
      });
      prisma.cart.findUnique.mockResolvedValue({ ...mockCart, items: [] });

      await service.removeItem('cart-123', 'item-123');

      expect(prisma.cartItem.delete).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalled();
    });
  });

  describe('clearCart', () => {
    it('should throw NotFoundException if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.clearCart('cart-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete all items and invalidate cache', async () => {
      prisma.cart.findUnique
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValue({ ...mockCart, items: [] });

      await service.clearCart('cart-123');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-123' },
      });
      expect(cache.del).toHaveBeenCalled();
    });
  });

  describe('getCartSummary', () => {
    it('should throw NotFoundException if cart not found', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.getCartSummary('cart-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate totals correctly', async () => {
      cache.get.mockResolvedValue(null);
      prisma.cart.findUnique.mockResolvedValue({
        ...mockCart,
        items: [
          { ...mockCartItem, quantity: 2, priceInCents: 1000 },
          { ...mockCartItem, id: 'item-2', quantity: 3, priceInCents: 500 },
        ],
      });

      const result = await service.getCartSummary('cart-123');

      expect(result.itemCount).toBe(5); // 2 + 3
      expect(result.subtotalInCents).toBe(3500); // (2*1000) + (3*500)
    });
  });

  describe('mergeGuestCart', () => {
    it('should return user cart if guest cart is empty', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      cache.get.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue(mockCart);

      await service.mergeGuestCart('session-123', 'user-123');

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('should merge items and mark guest cart as merged', async () => {
      const guestCart = {
        ...mockCart,
        id: 'guest-cart',
        userId: null,
        sessionId: 'session-123',
        items: [mockCartItem],
      };

      prisma.cart.findFirst.mockResolvedValue(guestCart);
      cache.get.mockResolvedValue(null);
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.cart.create.mockResolvedValue({ ...mockCart, items: [] });

      await service.mergeGuestCart('session-123', 'user-123');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'guest-cart' },
        data: { status: CartStatus.MERGED },
      });
    });
  });

  describe('convertCart', () => {
    it('should throw NotFoundException if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.convertCart('cart-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if cart not active', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        ...mockCart,
        status: CartStatus.MERGED,
      });

      await expect(service.convertCart('cart-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update status to CONVERTED and invalidate cache', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.cart.update.mockResolvedValue({
        ...mockCart,
        status: CartStatus.CONVERTED,
        items: [],
      });

      const result = await service.convertCart('cart-123');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-123' },
        data: { status: CartStatus.CONVERTED },
        include: { items: true },
      });
      expect(result.status).toBe(CartStatus.CONVERTED);
      expect(cache.del).toHaveBeenCalled();
    });
  });
});
