import { IsObject, IsOptional } from 'class-validator';

export class FireTriggerDto {
  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;
}

