import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { CacheService } from '../cache';
import {
  GetProductsQueryDto,
  ProductResponseDto,
  PaginatedProductsResponseDto,
  VariantResponseDto,
} from './dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly cacheTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    this.cacheTtl = this.config.get<number>('CACHE_TTL', 300);
  }

  async findAll(query: GetProductsQueryDto): Promise<PaginatedProductsResponseDto> {
    const { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    // Build cache key from query parameters
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    
    // Try to get from cache
    const cached = await this.cache.get<PaginatedProductsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for key: ${cacheKey}`);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Execute queries
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { variants: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result: PaginatedProductsResponseDto = {
      data: products.map((product) => this.mapToDto(product)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages,
      },
    };

    // Store in cache
    await this.cache.set(cacheKey, result, this.cacheTtl);

    return result;
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const cacheKey = `products:${id}`;

    // Try to get from cache
    const cached = await this.cache.get<ProductResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product: ${id}`);
      return cached;
    }

    this.logger.debug(`Cache miss for product: ${id}`);

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const dto = this.mapToDto(product);

    // Store in cache
    await this.cache.set(cacheKey, dto, this.cacheTtl);

    return dto;
  }

  private mapToDto(product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    basePriceInCents: number;
    currency: string;
    description: string | null;
    tags: string[];
    images: string[];
    specifications: unknown;
    isAvailable: boolean;
    weightInGrams: number | null;
    variants: Array<{
      id: string;
      sku: string;
      name: string;
      priceInCents: number | null;
      attributes: unknown;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      basePriceInCents: product.basePriceInCents,
      currency: product.currency,
      description: product.description ?? undefined,
      tags: product.tags,
      images: product.images,
      specifications: product.specifications as ProductResponseDto['specifications'],
      isAvailable: product.isAvailable,
      weightInGrams: product.weightInGrams,
      variants: product.variants.map((v) => this.mapVariantToDto(v)),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private mapVariantToDto(variant: {
    id: string;
    sku: string;
    name: string;
    priceInCents: number | null;
    attributes: unknown;
  }): VariantResponseDto {
    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      priceInCents: variant.priceInCents,
      attributes: variant.attributes as VariantResponseDto['attributes'],
    };
  }
}
