import { Global, Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [RateLimiterService, EncryptionService],
  exports: [RateLimiterService, EncryptionService],
})
export class CommonModule {}
