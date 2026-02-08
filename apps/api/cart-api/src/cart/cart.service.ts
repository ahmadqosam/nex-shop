import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import { CartStatus, Cart, CartItem } from '@prisma/cart-api-client';
import { AddItemDto, UpdateQuantityDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';


type CartWithItems = Cart & { items: CartItem[] };

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private readonly cacheTtl: number;

  // Cache key prefixes
  private readonly CART_KEY = 'cart:';
  private readonly USER_CART_KEY = 'user_cart:';
  private readonly SESSION_CART_KEY = 'session_cart:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.cacheTtl = this.config.get<number>('CACHE_TTL', 300); // 5 min default
  }

  /**
   * Check inventory availability
   */
  private async checkInventory(
    sku: string,
    quantity: number,
  ): Promise<void> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{ quantity: number }>(`/inventory/${sku}`),
      );

      if (data.quantity < quantity) {
        throw new BadRequestException(
          `Insufficient stock for item ${sku}. Available: ${data.quantity}, Required: ${quantity}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new BadRequestException(`Item with SKU ${sku} not found`);
      }
      this.logger.error(`Inventory check failed for ${sku}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build cache key for cart by ID
   */
  private cartCacheKey(cartId: string): string {
    return `${this.CART_KEY}${cartId}`;
  }

  /**
   * Build cache key for user's active cart lookup
   */
  private userCartCacheKey(userId: string): string {
    return `${this.USER_CART_KEY}${userId}`;
  }

  /**
   * Build cache key for session's active cart lookup
   */
  private sessionCartCacheKey(sessionId: string): string {
    return `${this.SESSION_CART_KEY}${sessionId}`;
  }

  /**
   * Cache a cart and update lookup keys
   */
  private async cacheCart(cart: CartWithItems): Promise<void> {
    // Cache the cart by ID
    await this.cache.set(this.cartCacheKey(cart.id), cart, this.cacheTtl);

    // Cache lookup keys (userId -> cartId, sessionId -> cartId)
    if (cart.userId) {
      await this.cache.set(
        this.userCartCacheKey(cart.userId),
        cart.id,
        this.cacheTtl,
      );
    }
    if (cart.sessionId) {
      await this.cache.set(
        this.sessionCartCacheKey(cart.sessionId),
        cart.id,
        this.cacheTtl,
      );
    }
  }

  /**
   * Invalidate all cache entries for a cart
   */
  private async invalidateCartCache(cart: Cart): Promise<void> {
    await this.cache.del(this.cartCacheKey(cart.id));
    if (cart.userId) {
      await this.cache.del(this.userCartCacheKey(cart.userId));
    }
    if (cart.sessionId) {
      await this.cache.del(this.sessionCartCacheKey(cart.sessionId));
    }
    this.logger.debug(`Invalidated cache for cart ${cart.id}`);
  }

  /**
   * Get or create a cart for a user or guest session
   */
  async getOrCreateCart(
    userId?: string,
    sessionId?: string,
  ): Promise<CartWithItems> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Either userId or sessionId is required');
    }

    // Check cache for existing cart lookup
    const lookupKey = userId
      ? this.userCartCacheKey(userId)
      : this.sessionCartCacheKey(sessionId!);

    const cachedCartId = await this.cache.get<string>(lookupKey);

    if (cachedCartId) {
      // Try to get cart from cache
      const cachedCart = await this.cache.get<CartWithItems>(
        this.cartCacheKey(cachedCartId),
      );
      if (cachedCart && cachedCart.status === CartStatus.ACTIVE) {
        this.logger.debug(`Cache HIT for cart ${cachedCartId}`);
        return cachedCart;
      }
    }

    this.logger.debug(`Cache MISS - querying database`);

    // Try to find existing active cart in DB
    const existingCart = await this.prisma.cart.findFirst({
      where: {
        status: CartStatus.ACTIVE,
        ...(userId ? { userId } : { sessionId }),
      },
      include: { items: true },
    });

    if (existingCart) {
      await this.cacheCart(existingCart);
      return existingCart;
    }

    // Create new cart
    const expiresAt = sessionId
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for guest carts
      : null;

    const newCart = await this.prisma.cart.create({
      data: {
        userId,
        sessionId,
        expiresAt,
      },
      include: { items: true },
    });

    await this.cacheCart(newCart);
    this.logger.log(`Created new cart ${newCart.id}`);

    return newCart;
  }

  /**
   * Get cart by ID (with cache)
   */
  async getCartById(cartId: string): Promise<CartWithItems | null> {
    // Check cache first
    const cached = await this.cache.get<CartWithItems>(
      this.cartCacheKey(cartId),
    );
    if (cached) {
      this.logger.debug(`Cache HIT for cart ${cartId}`);
      return cached;
    }

    this.logger.debug(`Cache MISS for cart ${cartId}`);

    // Query DB
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (cart) {
      await this.cacheCart(cart);
    }

    return cart;
  }

  /**
   * Add item to cart (invalidates cache)
   */
  async addItem(cartId: string, dto: AddItemDto): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot add item to cart with status ${cart.status}`,
      );
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId,
          variantId: dto.variantId,
        },
      },
    });

    let newQuantity = dto.quantity;
    if (existingItem) {
      newQuantity += existingItem.quantity;
    }

    // Verify inventory
    await this.checkInventory(dto.sku, newQuantity);

    if (existingItem) {

      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + dto.quantity,
          priceInCents: dto.priceInCents, // Update price snapshot
        },
      });
    } else {
      // Create new item
      await this.prisma.cartItem.create({
        data: {
          cartId,
          productId: dto.productId,
          variantId: dto.variantId,
          sku: dto.sku,
          quantity: dto.quantity,
          priceInCents: dto.priceInCents,
          currency: dto.currency || 'USD',
          productName: dto.productName,
          variantName: dto.variantName,
          imageUrl: dto.imageUrl,
        },
      });
    }

    this.logger.log(`Added item ${dto.sku} to cart ${cartId}`);

    // Invalidate cache and fetch fresh data
    await this.invalidateCartCache(cart);

    const updatedCart = (await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })) as CartWithItems;

    // Re-cache the updated cart
    await this.cacheCart(updatedCart);

    return updatedCart;
  }

  /**
   * Update item quantity (invalidates cache)
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    dto: UpdateQuantityDto,
  ): Promise<CartWithItems> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot update item in cart with status ${item.cart.status}`,
      );
    }

    if (dto.quantity === 0) {
      // Remove item
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      this.logger.log(`Removed item ${itemId} from cart ${cartId}`);
    } else {
      // Verify inventory
      await this.checkInventory(item.sku, dto.quantity);

      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
      this.logger.log(
        `Updated item ${itemId} quantity to ${dto.quantity} in cart ${cartId}`,
      );
    }

    // Invalidate and re-fetch
    await this.invalidateCartCache(item.cart);

    const updatedCart = (await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })) as CartWithItems;

    await this.cacheCart(updatedCart);

    return updatedCart;
  }

  /**
   * Remove item from cart (invalidates cache)
   */
  async removeItem(cartId: string, itemId: string): Promise<CartWithItems> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot remove item from cart with status ${item.cart.status}`,
      );
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    this.logger.log(`Removed item ${itemId} from cart ${cartId}`);

    // Invalidate and re-fetch
    await this.invalidateCartCache(item.cart);

    const updatedCart = (await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })) as CartWithItems;

    await this.cacheCart(updatedCart);

    return updatedCart;
  }

  /**
   * Clear all items from cart (invalidates cache)
   */
  async clearCart(cartId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot clear cart with status ${cart.status}`,
      );
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    this.logger.log(`Cleared all items from cart ${cartId}`);

    // Invalidate and re-fetch
    await this.invalidateCartCache(cart);

    const updatedCart = (await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })) as CartWithItems;

    await this.cacheCart(updatedCart);

    return updatedCart;
  }

  /**
   * Merge guest cart into user cart (on login)
   */
  async mergeGuestCart(
    guestSessionId: string,
    userId: string,
  ): Promise<CartWithItems> {
    const guestCart = await this.prisma.cart.findFirst({
      where: {
        sessionId: guestSessionId,
        status: CartStatus.ACTIVE,
      },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    // Get or create user cart
    const userCart = await this.getOrCreateCart(userId);

    // Merge items
    for (const item of guestCart.items) {
      const existingItem = userCart.items.find(
        (i) => i.variantId === item.variantId,
      );

      if (existingItem) {
        // Add quantities
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity },
        });
      } else {
        // Move item to user cart
        await this.prisma.cartItem.update({
          where: { id: item.id },
          data: { cartId: userCart.id },
        });
      }
    }

    // Mark guest cart as merged
    await this.prisma.cart.update({
      where: { id: guestCart.id },
      data: { status: CartStatus.MERGED },
    });

    this.logger.log(
      `Merged guest cart ${guestCart.id} into user cart ${userCart.id}`,
    );

    // Invalidate both carts
    await this.invalidateCartCache(guestCart);
    await this.invalidateCartCache(userCart);

    // Fetch and cache merged cart
    const mergedCart = (await this.prisma.cart.findUnique({
      where: { id: userCart.id },
      include: { items: true },
    })) as CartWithItems;

    await this.cacheCart(mergedCart);

    return mergedCart;
  }

  /**
   * Get cart summary (totals) - uses cached cart
   */
  async getCartSummary(cartId: string) {
    // Use cached getCartById
    const cart = await this.getCartById(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalInCents = cart.items.reduce(
      (sum, item) => sum + item.priceInCents * item.quantity,
      0,
    );

    return {
      cartId: cart.id,
      itemCount,
      subtotalInCents,
      currency: cart.items[0]?.currency || 'USD',
      items: cart.items,
    };
  }

  /**
   * Convert cart to CONVERTED status (called when order is placed)
   */
  async convertCart(cartId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot convert cart with status ${cart.status}`,
      );
    }

    // Update status to CONVERTED
    const convertedCart = await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: CartStatus.CONVERTED },
      include: { items: true },
    });

    // Invalidate cache (cart is no longer active)
    await this.invalidateCartCache(cart);

    this.logger.log(`Cart ${cartId} converted to CONVERTED status`);

    return convertedCart;
  }
}
