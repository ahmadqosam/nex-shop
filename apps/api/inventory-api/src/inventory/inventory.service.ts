import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly cacheTtl: number;

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get<number>('CACHE_TTL', 300);
  }

  async create(dto: CreateInventoryDto) {
    const exists = await this.prisma.inventory.findUnique({
      where: { sku: dto.sku },
    });

    if (exists) {
      throw new BadRequestException(`Inventory for SKU ${dto.sku} already exists`);
    }

    const inventory = await this.prisma.inventory.create({
      data: {
        sku: dto.sku,
        quantity: dto.quantity,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
        warehouseCode: dto.warehouseCode,
      },
    });

    // Initial adjustment record
    await this.prisma.inventoryAdjustment.create({
      data: {
        inventoryId: inventory.id,
        adjustmentType: 'initial',
        quantity: dto.quantity,
        reason: 'Initial creation',
      },
    });

    await this.cacheService.set(`inventory:${dto.sku}`, inventory.quantity, this.cacheTtl);

    return inventory;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventory.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySku(sku: string) {
    // Try cache first for quantity
    // const cachedQty = await this.cacheService.get<number>(`inventory:${sku}`);
    
    const inventory = await this.prisma.inventory.findUnique({
      where: { sku },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory not found for SKU ${sku}`);
    }

    return inventory;
  }

  async adjustStock(sku: string, dto: AdjustInventoryDto) {
    const inventory = await this.findBySku(sku);

    const newQuantity = inventory.quantity + dto.quantity;

    if (newQuantity < 0) {
      throw new BadRequestException('Insufficient stock for adjustment');
    }

    // Transaction to update inventory and create adjustment record
    const [updatedInventory] = await this.prisma.$transaction([
      this.prisma.inventory.update({
        where: { sku },
        data: { quantity: newQuantity },
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          inventoryId: inventory.id,
          adjustmentType: dto.adjustmentType,
          quantity: dto.quantity,
          reason: dto.reason,
        },
      }),
    ]);

    await this.cacheService.set(`inventory:${sku}`, updatedInventory.quantity, this.cacheTtl);

    return updatedInventory;
  }

  async reserveStock(sku: string, quantity: number) {
    const inventory = await this.findBySku(sku);

    if (inventory.quantity - inventory.reserved < quantity) {
      throw new BadRequestException('Insufficient available stock for reservation');
    }

    const updatedInventory = await this.prisma.inventory.update({
      where: { sku },
      data: {
        reserved: { increment: quantity },
      },
    });

    return updatedInventory;
  }

  async releaseStock(sku: string, quantity: number) {
    const inventory = await this.findBySku(sku);

    if (inventory.reserved < quantity) {
      throw new BadRequestException('Cannot release more than reserved');
    }

    const updatedInventory = await this.prisma.inventory.update({
      where: { sku },
      data: {
        reserved: { decrement: quantity },
      },
    });

    return updatedInventory;
  }

  async getLowStock() {
    return this.prisma.inventory.findMany({
      where: {
        quantity: {
          lte: this.prisma.inventory.fields.lowStockThreshold,
        },
      },
    });
  }
}
