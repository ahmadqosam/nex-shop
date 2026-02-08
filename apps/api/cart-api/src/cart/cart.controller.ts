import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddItemDto, UpdateQuantityDto } from './dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get or create cart for user/session' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'Authenticated user ID',
    required: false,
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Guest session ID',
    required: false,
  })
  async getCart(
    @Headers('x-user-id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getOrCreateCart(userId, sessionId);
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  async getCartById(@Param('cartId') cartId: string) {
    return this.cartService.getCartById(cartId);
  }

  @Get(':cartId/summary')
  @ApiOperation({ summary: 'Get cart summary with totals' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  async getCartSummary(@Param('cartId') cartId: string) {
    return this.cartService.getCartSummary(cartId);
  }

  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  async addItem(@Param('cartId') cartId: string, @Body() dto: AddItemDto) {
    return this.cartService.addItem(cartId, dto);
  }

  @Put(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Update item quantity' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  async updateItemQuantity(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    return this.cartService.updateItemQuantity(cartId, itemId, dto);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  async removeItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(cartId, itemId);
  }

  @Delete(':cartId')
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  async clearCart(@Param('cartId') cartId: string) {
    return this.cartService.clearCart(cartId);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into user cart (on login)' })
  @ApiQuery({ name: 'sessionId', description: 'Guest session ID' })
  @ApiQuery({ name: 'userId', description: 'Authenticated user ID' })
  async mergeCart(
    @Query('sessionId') sessionId: string,
    @Query('userId') userId: string,
  ) {
    return this.cartService.mergeGuestCart(sessionId, userId);
  }

  @Post(':cartId/convert')
  @ApiOperation({ summary: 'Convert cart to CONVERTED status (on checkout)' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  async convertCart(@Param('cartId') cartId: string) {
    return this.cartService.convertCart(cartId);
  }
}
