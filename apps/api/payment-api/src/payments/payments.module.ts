import { Module } from '@nestjs/common';
import { SnsModule } from '../sns/sns.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [StripeModule, SnsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
