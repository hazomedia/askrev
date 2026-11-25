import { IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class InitiateSupportSessionDto {
  @IsString()
  @IsNotEmpty()
  targetMemberId: string;

  /**
   * Mandatory Super Admin reauthentication:
   * Current administrator password must be verified to prevent unauthorized session initiation.
   */
  @IsString()
  @MinLength(8, { message: 'Administrator password is required for fresh reauthentication.' })
  adminPassword: string;

  /**
   * Verified Member Consent:
   * Single-use 6-character consent verification code generated or verified by the member.
   * A manually entered text reference alone is strictly rejected.
   */
  @IsString()
  @Length(6, 6, { message: 'Member consent code must be exactly 6 characters.' })
  consentCode: string;

  @IsString()
  @MinLength(8, { message: 'Support reason must be at least 8 characters explaining the inquiry or ticket.' })
  reason: string;

  @IsString()
  @MinLength(3, { message: 'Ticket reference or customer incident ID must be at least 3 characters.' })
  consentReference: string;
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
