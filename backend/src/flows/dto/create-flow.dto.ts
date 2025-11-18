import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TriggerType } from '../schemas/flow.schema';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @IsOptional()
  @IsString()
  description?: string;
}

