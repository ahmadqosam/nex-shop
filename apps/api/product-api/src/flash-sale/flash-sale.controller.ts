import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FlashSaleService } from './flash-sale.service';
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
import { CurrentUser, JwtPayload, Public, Role, Roles } from '../auth';

@ApiTags('Flash Sales')
@Controller('flash-sales')
export class FlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'Get active flash sales with items' })
  @ApiResponse({
    status: 200,
    type: [FlashSaleResponseDto],
  })
  async getActiveFlashSales(): Promise<FlashSaleResponseDto[]> {
    return this.flashSaleService.getActiveFlashSales();
  }

  @Get('product/:productId')
  @Public()
  @ApiOperation({
    summary: 'Get flash sale information for a specific product',
  })
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({
    status: 200,
    type: FlashSaleItemResponseDto,
  })
  async getFlashSaleForProduct(
    @Param('productId') productId: string,
  ): Promise<FlashSaleItemResponseDto | null> {
    return this.flashSaleService.getFlashSaleForProduct(productId);
  }

  @Get('eligibility/:flashSaleItemId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check user eligibility for flash sale item' })
  @ApiParam({ name: 'flashSaleItemId', type: String })
  @ApiResponse({
    status: 200,
    type: EligibilityResponseDto,
  })
  async checkEligibility(
    @Param('flashSaleItemId') flashSaleItemId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EligibilityResponseDto> {
    return this.flashSaleService.checkEligibility(user.sub, flashSaleItemId);
  }

  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a flash sale item (one per user)' })
  @ApiResponse({
    status: 201,
    type: PurchaseResultDto,
  })
  async purchase(
    @Body() dto: PurchaseFlashSaleItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseResultDto> {
    return this.flashSaleService.purchaseFlashSaleItem(user.sub, dto);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new flash sale' })
  @ApiResponse({
    status: 201,
    type: FlashSaleResponseDto,
  })
  async create(
    @Body() dto: CreateFlashSaleDto,
  ): Promise<FlashSaleResponseDto> {
    return this.flashSaleService.createFlashSale(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Update an existing flash sale' })
  @ApiResponse({
    status: 200,
    type: FlashSaleResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFlashSaleDto,
  ): Promise<FlashSaleResponseDto> {
    return this.flashSaleService.updateFlashSale(id, dto);
  }

  @Post(':flashSaleId/items')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'flashSaleId', type: String })
  @ApiOperation({ summary: 'Add an item to a flash sale' })
  @ApiResponse({
    status: 201,
    type: FlashSaleItemResponseDto,
  })
  async addItem(
    @Param('flashSaleId') flashSaleId: string,
    @Body() dto: AddFlashSaleItemDto,
  ): Promise<FlashSaleItemResponseDto> {
    return this.flashSaleService.addItemToFlashSale(flashSaleId, dto);
  }

  @Delete(':flashSaleId/items/:itemId')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'flashSaleId', type: String })
  @ApiParam({ name: 'itemId', type: String })
  @ApiOperation({ summary: 'Remove an item from a flash sale' })
  @ApiResponse({ status: 204 })
  async removeItem(
    @Param('flashSaleId') flashSaleId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.flashSaleService.removeItemFromFlashSale(flashSaleId, itemId);
  }
}


