import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayGatewayProvider } from './providers/razorpay.provider';
import { CashfreeGatewayProvider } from './providers/cashfree.provider';
import { PhonePeGatewayProvider } from './providers/phonepe.provider';
import { PaymentGatewayRegistry } from './providers/payment-gateway.registry';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    RazorpayGatewayProvider,
    CashfreeGatewayProvider,
    PhonePeGatewayProvider,
    PaymentGatewayRegistry,
  ],
  exports: [PaymentsService, PaymentGatewayRegistry],
})
export class PaymentsModule {}
