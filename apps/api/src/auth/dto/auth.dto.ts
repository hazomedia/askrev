import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MembershipPackage } from '@askrev/shared';

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
  @IsOptional()
  sponsorMemberId?: string;

  @IsOptional()
  initialPackage?: MembershipPackage;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
