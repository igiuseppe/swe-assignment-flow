import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

