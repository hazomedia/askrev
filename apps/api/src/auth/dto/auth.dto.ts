import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Sponsor referral code is required for registration' })
  sponsorMemberId: string;

  @IsString()
  @IsOptional()
  @IsIn(['LEFT', 'RIGHT'], { message: 'Placement leg must be either LEFT or RIGHT' })
  side?: 'LEFT' | 'RIGHT';

  @IsString()
  @IsOptional()
  initialPackage?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  totpCode?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password reset token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;
}




export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  secret?: string;
}

export class MfaEnrollmentSetupDto {
  @IsString()
  @IsNotEmpty({ message: 'Enrollment token is required' })
  enrollmentToken: string;
}

export class MfaEnrollmentConfirmDto {
  @IsString()
  @IsNotEmpty({ message: 'Enrollment token is required' })
  enrollmentToken: string;

  @IsString()
  @IsNotEmpty({ message: 'TOTP 6-digit verification code is required' })
  code: string;

  @IsString()
  @IsOptional()
  secret?: string;
}

export class DisableMfaDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(12)
  newPassword: string;

  @IsString()
  @MinLength(12)
  confirmPassword: string;

  @IsString()
  @IsOptional()
  totpCode?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}

export class ServiceTokenRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Client ID is required' })
  clientId: string;

  @IsString()
  @IsNotEmpty({ message: 'Client secret is required' })
  clientSecret: string;

  @IsString()
  @IsOptional()
  scope?: string;
}





