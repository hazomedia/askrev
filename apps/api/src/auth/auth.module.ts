import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { TotpService } from './totp.service';
import { EmailService } from './email.service';
import { TokenRevocationService } from './token-revocation.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, TotpService, EmailService, TokenRevocationService],
  exports: [AuthService, JwtModule, PassportModule, RolesGuard, TotpService, EmailService, TokenRevocationService],
})
export class AuthModule {}
