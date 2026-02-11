import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create inventory for a SKU' })
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all inventory items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.inventoryService.findAll(page, limit);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get items with low stock' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get(':sku')
  @ApiOperation({ summary: 'Get inventory by SKU' })
  findOne(@Param('sku') sku: string) {
    return this.inventoryService.findBySku(sku);
  }

  @Patch(':sku/adjust')
  @ApiOperation({ summary: 'Adjust stock level' })
  adjust(
    @Param('sku') sku: string,
    @Body() adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustStock(sku, adjustInventoryDto);
  }

  @Post(':sku/reserve')
  @ApiOperation({ summary: 'Reserve stock' })
  reserve(
    @Param('sku') sku: string,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.inventoryService.reserveStock(sku, quantity);
  }

  @Post(':sku/release')
  @ApiOperation({ summary: 'Release reserved stock' })
  release(
    @Param('sku') sku: string,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.inventoryService.releaseStock(sku, quantity);
  }
}
