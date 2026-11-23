import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentGatewayProvider } from './payment-gateway.interface';
import { RazorpayGatewayProvider } from './razorpay.provider';
import { CashfreeGatewayProvider } from './cashfree.provider';
import { PhonePeGatewayProvider } from './phonepe.provider';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly providers = new Map<string, PaymentGatewayProvider>();

  constructor(
    private readonly razorpayProvider: RazorpayGatewayProvider,
    private readonly cashfreeProvider: CashfreeGatewayProvider,
    private readonly phonepeProvider: PhonePeGatewayProvider
  ) {
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
    return Array.from(this.providers.values());
  }

  getSupportedList(): { id: string; name: string; isFunctional: boolean }[] {
    return this.getAllProviders().map((p) => ({
      id: p.providerId,
      name: p.displayName,
      isFunctional: p.isFunctional,
    }));
  }
}
