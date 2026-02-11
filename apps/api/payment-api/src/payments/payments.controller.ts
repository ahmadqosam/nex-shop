import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBody,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { StripeService } from '../stripe/stripe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check' })
  async getHealth(): Promise<string> {
    return 'OK';
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Payment request from user ${user.sub}`);
    return this.paymentsService.createPayment(dto, user.sub);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, type: WebhookResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ): Promise<WebhookResponseDto> {
    let event;
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.paymentsService.handleWebhookEvent(event);
    return { received: true };
  }
}
