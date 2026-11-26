import { IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class InitiateSupportSessionDto {
  @IsString()
  @IsNotEmpty()
  targetMemberId: string;

  /**
   * Super Admin reauthentication (optional for direct one-click session initiation by authenticated Super Admin)
   */
  @IsString()
  @IsOptional()
  adminPassword?: string;

  /**
   * Member Consent (handled via authorized support-access policy or optional 6-char consent code)
   */
  @IsString()
  @IsOptional()
  consentCode?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  consentReference?: string;
}

export class ExchangeSupportSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Single-use exchange code is required.' })
  exchangeCode: string;
}

export class ExitSupportSessionDto {
  @IsString()
  @IsOptional()
  supportSessionId?: string;

  @IsString()
  @IsOptional()
  supportToken?: string;
}

export class GrantSupportConsentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
