import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class InitiateSupportSessionDto {
  @IsString()
  @IsNotEmpty()
  targetMemberId: string;

  @IsString()
  @MinLength(8, { message: 'Support reason must be at least 8 characters explaining the inquiry or ticket.' })
  reason: string;

  @IsString()
  @MinLength(3, { message: 'Member consent reference or ticket ID must be at least 3 characters.' })
  consentReference: string;
}

export class ExitSupportSessionDto {
  @IsString()
  @IsOptional()
  supportToken?: string;
}
