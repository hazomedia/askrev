import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentGatewayProvider } from './payment-gateway.interface';
import { PineLabsGatewayProvider } from './pinelabs.provider';
import { RazorpayGatewayProvider } from './razorpay.provider';
import { CashfreeGatewayProvider } from './cashfree.provider';
import { PhonePeGatewayProvider } from './phonepe.provider';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly providers = new Map<string, PaymentGatewayProvider>();

  constructor(
    private readonly pineLabsProvider: PineLabsGatewayProvider,
    private readonly razorpayProvider: RazorpayGatewayProvider,
    private readonly cashfreeProvider: CashfreeGatewayProvider,
    private readonly phonepeProvider: PhonePeGatewayProvider
  ) {
    // Primary Gateway: Pine Labs (Plural)
    this.register(this.pineLabsProvider);
    // Optional Gateways
    this.register(this.razorpayProvider);
    this.register(this.cashfreeProvider);
    this.register(this.phonepeProvider);
  }

  register(provider: PaymentGatewayProvider) {
    this.providers.set(provider.providerId.toUpperCase(), provider);
  }

  getProvider(providerId: string): PaymentGatewayProvider {
    const provider = this.providers.get(providerId.toUpperCase());
    if (!provider) {
      throw new NotFoundException(`Payment gateway provider '${providerId}' is not supported or recognized.`);
    }
    return provider;
  }

  getAllProviders(): PaymentGatewayProvider[] {
    // Primary gateway Pine Labs is prioritized first
    const order = ['PINELABS', 'RAZORPAY', 'CASHFREE', 'PHONEPE'];
    return order
      .map((id) => this.providers.get(id))
      .filter((p): p is PaymentGatewayProvider => Boolean(p));
  }

  getSupportedList(): { id: string; name: string; isFunctional: boolean }[] {
    return this.getAllProviders().map((p) => ({
      id: p.providerId,
      name: p.displayName,
      isFunctional: p.isFunctional,
    }));
  }
}
