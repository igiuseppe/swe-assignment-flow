import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendWhatsAppDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  template: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

