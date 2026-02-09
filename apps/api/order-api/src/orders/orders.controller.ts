import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  GetOrdersQueryDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with pagination and filters' })
  @ApiResponse({ status: 200, type: PaginatedOrdersResponseDto })
  async findAll(
    @Query() query: GetOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async findOne(@Param('id') id: string): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancel(id, dto);
  }
}
