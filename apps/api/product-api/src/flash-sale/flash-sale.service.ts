import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import {
  AddFlashSaleItemDto,
  CreateFlashSaleDto,
  EligibilityResponseDto,
  FlashSaleItemResponseDto,
  FlashSaleResponseDto,
  PurchaseFlashSaleItemDto,
  PurchaseResultDto,
  UpdateFlashSaleDto,
} from './dto';

@Injectable()
export class FlashSaleService {
  private readonly logger = new Logger(FlashSaleService.name);
  private readonly cacheTtlSeconds = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getActiveFlashSales(): Promise<FlashSaleResponseDto[]> {
    const cacheKey = 'flash-sales:active';
    const cached = await this.cache.get<FlashSaleResponseDto[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for active flash sales');
      return cached;
    }

    this.logger.debug('Cache miss for active flash sales');
    const now = new Date();

    const flashSales = await this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const result = flashSales.map((sale) => this.mapFlashSaleToDto(sale));

    await this.cache.set(cacheKey, result, this.cacheTtlSeconds);

    return result;
  }

  async getFlashSaleForProduct(
    productId: string,
    variantId?: string,
  ): Promise<FlashSaleItemResponseDto | null> {
    const cacheKey = `flash-sales:product:${productId}:${
      variantId ?? 'no-variant'
    }`;
    const cached = await this.cache.get<FlashSaleItemResponseDto | null>(
      cacheKey,
    );
    if (cached) {
      this.logger.debug(
        `Cache hit for flash sale product ${productId}, variant ${variantId}`,
      );
      return cached;
    }

    this.logger.debug(
      `Cache miss for flash sale product ${productId}, variant ${variantId}`,
    );

    const now = new Date();

    const item = await this.prisma.flashSaleItem.findFirst({
      where: {
        productId,
        variantId: variantId ?? null,
        flashSale: {
          isActive: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      },
      include: {
        product: true,
        variant: true,
        flashSale: true,
      },
    });

    if (!item) {
      await this.cache.set(cacheKey, null, this.cacheTtlSeconds);
      return null;
    }

    const dto = this.mapFlashSaleItemToDto(item);
    await this.cache.set(cacheKey, dto, this.cacheTtlSeconds);
    return dto;
  }

  async checkEligibility(
    userId: string,
    flashSaleItemId: string,
  ): Promise<EligibilityResponseDto> {
    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: flashSaleItemId },
      include: {
        flashSale: true,
      },
    });

    if (!item) {
      return {
        eligible: false,
        reason: 'Flash sale item not found',
      };
    }

    const now = new Date();

    if (!item.flashSale.isActive) {
      return {
        eligible: false,
        reason: 'Flash sale is not active',
      };
    }

    if (item.flashSale.startTime > now) {
      return {
        eligible: false,
        reason: 'Flash sale has not started yet',
      };
    }

    if (item.flashSale.endTime < now) {
      return {
        eligible: false,
        reason: 'Flash sale has ended',
      };
    }

    if (item.soldCount >= item.maxQuantity) {
      return {
        eligible: false,
        reason: 'Sold out',
        remainingQuantity: 0,
      };
    }

    const existingPurchase = await this.prisma.flashSalePurchase.findFirst({
      where: {
        userId,
        flashSaleItemId,
      },
    });

    if (existingPurchase) {
      return {
        eligible: false,
        reason: 'Already purchased',
      };
    }

    return {
      eligible: true,
      flashSaleItemId: item.id,
      salePriceInCents: item.salePriceInCents,
      remainingQuantity: item.maxQuantity - item.soldCount,
    };
  }

  async purchaseFlashSaleItem(
    userId: string,
    dto: PurchaseFlashSaleItemDto,
  ): Promise<PurchaseResultDto> {
    const { flashSaleItemId } = dto;

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const item = await tx.flashSaleItem.findUnique({
            where: { id: flashSaleItemId },
            include: {
              flashSale: true,
            },
          });

          if (!item) {
            throw new NotFoundException('Flash sale item not found');
          }

          const now = new Date();

          if (!item.flashSale.isActive) {
            throw new BadRequestException('Flash sale is not active');
          }

          if (item.flashSale.startTime > now) {
            throw new BadRequestException('Flash sale has not started yet');
          }

          if (item.flashSale.endTime < now) {
            throw new BadRequestException('Flash sale has ended');
          }

          if (item.soldCount >= item.maxQuantity) {
            throw new ConflictException('Sold out');
          }

          const existingPurchase = await tx.flashSalePurchase.findFirst({
            where: {
              userId,
              flashSaleItemId,
            },
          });

          if (existingPurchase) {
            throw new ConflictException('Already purchased');
          }

          const updateResult = await tx.flashSaleItem.updateMany({
            where: {
              id: flashSaleItemId,
              version: item.version,
              soldCount: item.soldCount,
            },
            data: {
              soldCount: {
                increment: 1,
              },
              version: {
                increment: 1,
              },
            },
          });

          if (updateResult.count === 0) {
            throw new ConflictException(
              'Flash sale item was updated concurrently. Please try again.',
            );
          }

          const purchase = await tx.flashSalePurchase.create({
            data: {
              userId,
              flashSaleItemId,
            },
          });

          return {
            purchaseId: purchase.id,
            flashSaleItemId: item.id,
            salePriceInCents: item.salePriceInCents,
            productId: item.productId,
            variantId: item.variantId,
            message: 'Purchase successful',
          } satisfies PurchaseResultDto;
        },
        {
          isolationLevel: 'Serializable',
        },
      );

      // Invalidate related caches after a successful purchase
      await this.cache.del('flash-sales:active');
      await this.cache.delByPattern('flash-sales:product:*');

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to purchase flash sale item ${flashSaleItemId} for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createFlashSale(
    dto: CreateFlashSaleDto,
  ): Promise<FlashSaleResponseDto> {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const sale = await this.prisma.flashSale.create({
      data: {
        name: dto.name,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        isActive: dto.isActive ?? true,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await this.invalidateSaleCaches();

    return this.mapFlashSaleToDto(sale);
  }

  async updateFlashSale(
    id: string,
    dto: UpdateFlashSaleDto,
  ): Promise<FlashSaleResponseDto> {
    const existing = await this.prisma.flashSale.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Flash sale not found');
    }

    if (dto.startTime && dto.endTime) {
      if (new Date(dto.endTime) <= new Date(dto.startTime)) {
        throw new BadRequestException('endTime must be after startTime');
      }
    }

    const sale = await this.prisma.flashSale.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        startTime: dto.startTime
          ? new Date(dto.startTime)
          : existing.startTime,
        endTime: dto.endTime ? new Date(dto.endTime) : existing.endTime,
        isActive:
          dto.isActive === undefined ? existing.isActive : dto.isActive,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await this.invalidateSaleCaches();

    return this.mapFlashSaleToDto(sale);
  }

  async addItemToFlashSale(
    flashSaleId: string,
    dto: AddFlashSaleItemDto,
  ): Promise<FlashSaleItemResponseDto> {
    const sale = await this.prisma.flashSale.findUnique({
      where: { id: flashSaleId },
    });

    if (!sale) {
      throw new NotFoundException('Flash sale not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let variant = null;
    if (dto.variantId) {
      variant = await this.prisma.variant.findUnique({
        where: { id: dto.variantId },
      });

      if (!variant || variant.productId !== dto.productId) {
        throw new BadRequestException(
          'Variant not found for the specified product',
        );
      }
    }

    const item = await this.prisma.flashSaleItem.create({
      data: {
        flashSaleId,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        salePriceInCents: dto.salePriceInCents,
        maxQuantity: dto.maxQuantity,
      },
      include: {
        product: true,
        variant: true,
      },
    });

    await this.invalidateSaleCaches();

    return this.mapFlashSaleItemToDto(item);
  }

  async removeItemFromFlashSale(
    flashSaleId: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.flashSaleId !== flashSaleId) {
      throw new NotFoundException('Flash sale item not found in this sale');
    }

    await this.prisma.flashSaleItem.delete({
      where: { id: itemId },
    });

    await this.invalidateSaleCaches();
  }

  private async invalidateSaleCaches(): Promise<void> {
    await this.cache.del('flash-sales:active');
    await this.cache.delByPattern('flash-sales:product:*');
  }

  private mapFlashSaleToDto(sale: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    items: Array<{
      id: string;
      productId: string;
      variantId: string | null;
      salePriceInCents: number;
      maxQuantity: number;
      soldCount: number;
      product: {
        name: string;
        images: string[];
        basePriceInCents: number;
        category: string;
      };
      variant: {
        priceInCents: number | null;
      } | null;
    }>;
  }): FlashSaleResponseDto {
    return {
      id: sale.id,
      name: sale.name,
      startTime: sale.startTime,
      endTime: sale.endTime,
      isActive: sale.isActive,
      items: sale.items.map((item) =>
        this.mapFlashSaleItemToDto({
          ...item,
          flashSale: {
            id: sale.id,
            name: sale.name,
            startTime: sale.startTime,
            endTime: sale.endTime,
            isActive: sale.isActive,
          },
        } as any),
      ),
    };
  }

  private mapFlashSaleItemToDto(item: {
    id: string;
    productId: string;
    variantId: string | null;
    salePriceInCents: number;
    maxQuantity: number;
    soldCount: number;
    product: {
      name: string;
      images: string[];
      basePriceInCents: number;
      category: string;
    };
    variant: {
      priceInCents: number | null;
    } | null;
  }): FlashSaleItemResponseDto {
    const originalPriceInCents =
      item.variant?.priceInCents ?? item.product.basePriceInCents;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      salePriceInCents: item.salePriceInCents,
      maxQuantity: item.maxQuantity,
      soldCount: item.soldCount,
      remainingQuantity: item.maxQuantity - item.soldCount,
      productName: item.product.name,
      productImage: item.product.images[0],
      originalPriceInCents,
      category: item.product.category,
    };
  }
}


