import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import { OrderStatus, Order, OrderItem } from '@prisma/order-api-client';
import {
  CreateOrderDto,
  CreateOrderItemDto,
  GetOrdersQueryDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto';

type OrderWithItems = Order & { items: OrderItem[] };

interface CartResponse {
  id: string;
  status: string;
  items: Array<{
    productId: string;
    variantId: string;
    sku: string;
    quantity: number;
    priceInCents: number;
    currency: string;
    productName: string;
    variantName: string;
    imageUrl?: string;
  }>;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly cacheTtl: number;
  private readonly cartApiUrl: string;
  private readonly inventoryApiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.cacheTtl = this.config.get<number>('CACHE_TTL', 300);
    this.cartApiUrl = this.config.get<string>(
      'CART_API_URL',
      'http://localhost:4004',
    );
    this.inventoryApiUrl = this.config.get<string>(
      'INVENTORY_API_URL',
      'http://localhost:4003',
    );
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = randomBytes(2).toString('hex').toUpperCase();
    return `ORD-${date}-${rand}`;
  }

  private mapToDto(order: OrderWithItems): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      email: order.email,
      status: order.status,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        totalPriceInCents: item.totalPriceInCents,
        currency: item.currency,
        productName: item.productName,
        variantName: item.variantName,
        imageUrl: item.imageUrl,
      })),
      shippingAddress:
        order.shippingAddress as unknown as OrderResponseDto['shippingAddress'],
      subtotalInCents: order.subtotalInCents,
      shippingCostInCents: order.shippingCostInCents,
      totalInCents: order.totalInCents,
      currency: order.currency,
      notes: order.notes,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private async fetchCart(cartId: string): Promise<CartResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CartResponse>(`${this.cartApiUrl}/cart/${cartId}`),
      );
      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new NotFoundException(`Cart "${cartId}" not found`);
      }
      this.logger.error(`Failed to fetch cart ${cartId}: ${error.message}`);
      throw new BadRequestException('Failed to fetch cart');
    }
  }

  private async convertCart(cartId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.cartApiUrl}/cart/${cartId}/convert`),
      );
      this.logger.log(`Cart ${cartId} converted`);
    } catch (error: any) {
      this.logger.warn(`Failed to convert cart ${cartId}: ${error.message}`);
    }
  }

  private async reserveInventory(sku: string, quantity: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.inventoryApiUrl}/inventory/${sku}/reserve`,
          { quantity },
        ),
      );
      this.logger.debug(`Reserved ${quantity} of ${sku}`);
    } catch (error: any) {
      this.logger.warn(
        `Failed to reserve inventory for ${sku}: ${error.message}`,
      );
    }
  }

  private async releaseInventory(sku: string, quantity: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.inventoryApiUrl}/inventory/${sku}/release`,
          { quantity },
        ),
      );
      this.logger.debug(`Released ${quantity} of ${sku}`);
    } catch (error: any) {
      this.logger.warn(
        `Failed to release inventory for ${sku}: ${error.message}`,
      );
    }
  }

  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    let orderItems: CreateOrderItemDto[];

    if (dto.cartId) {
      const cart = await this.fetchCart(dto.cartId);

      if (cart.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Cart is not active (status: ${cart.status})`,
        );
      }
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      orderItems = cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        quantity: item.quantity,
        unitPriceInCents: item.priceInCents,
        currency: item.currency,
        productName: item.productName,
        variantName: item.variantName,
        imageUrl: item.imageUrl,
      }));
    } else if (dto.items && dto.items.length > 0) {
      orderItems = dto.items;
    } else {
      throw new BadRequestException('Either cartId or items must be provided');
    }

    // Reserve inventory (best-effort)
    for (const item of orderItems) {
      await this.reserveInventory(item.sku, item.quantity);
    }

    const subtotalInCents = orderItems.reduce(
      (sum, item) => sum + item.unitPriceInCents * item.quantity,
      0,
    );
    const shippingCostInCents = 0;
    const totalInCents = subtotalInCents + shippingCostInCents;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId: dto.userId,
        email: dto.email,
        shippingAddress: dto.shippingAddress as any,
        subtotalInCents,
        shippingCostInCents,
        totalInCents,
        currency: orderItems[0]?.currency || 'USD',
        notes: dto.notes,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            totalPriceInCents: item.unitPriceInCents * item.quantity,
            currency: item.currency || 'USD',
            productName: item.productName,
            variantName: item.variantName,
            imageUrl: item.imageUrl,
          })),
        },
      },
      include: { items: true },
    });

    // Convert cart (best-effort)
    if (dto.cartId) {
      await this.convertCart(dto.cartId);
    }

    // Invalidate user order list cache
    await this.cache.delByPattern(`orders:list:*`);

    this.logger.log(
      `Created order ${order.orderNumber} for user ${dto.userId}`,
    );

    return this.mapToDto(order);
  }

  async findAll(query: GetOrdersQueryDto): Promise<PaginatedOrdersResponseDto> {
    const {
      page = 1,
      limit = 10,
      userId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const cacheKey = `orders:list:${JSON.stringify(query)}`;
    const cached = await this.cache.get<PaginatedOrdersResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for key: ${cacheKey}`);

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result: PaginatedOrdersResponseDto = {
      data: orders.map((order) => this.mapToDto(order)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages,
      },
    };

    await this.cache.set(cacheKey, result, this.cacheTtl);

    return result;
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const cacheKey = `order:${id}`;
    const cached = await this.cache.get<OrderResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for order: ${id}`);
      return cached;
    }

    this.logger.debug(`Cache miss for order: ${id}`);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const dto = this.mapToDto(order);
    await this.cache.set(cacheKey, dto, this.cacheTtl);

    return dto;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}`,
      );
    }

    const updateData: Record<string, unknown> = { status: dto.status };

    switch (dto.status) {
      case OrderStatus.CONFIRMED:
        updateData.paidAt = new Date();
        break;
      case OrderStatus.SHIPPED:
        updateData.shippedAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        updateData.deliveredAt = new Date();
        break;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    await this.cache.del(`order:${id}`);
    await this.cache.delByPattern(`orders:list:*`);

    this.logger.log(
      `Order ${order.orderNumber} status: ${order.status} → ${dto.status}`,
    );

    return this.mapToDto(updated);
  }

  async cancel(id: string, dto: CancelOrderDto): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const cancellable: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
      },
      include: { items: true },
    });

    // Release reserved inventory (best-effort)
    for (const item of order.items) {
      await this.releaseInventory(item.sku, item.quantity);
    }

    await this.cache.del(`order:${id}`);
    await this.cache.delByPattern(`orders:list:*`);

    this.logger.log(`Order ${order.orderNumber} cancelled`);

    return this.mapToDto(updated);
  }
}
