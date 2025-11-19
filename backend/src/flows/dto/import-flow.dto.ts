import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { TriggerType } from '../schemas/flow.schema';

export class ImportFlowDto {
  @IsString()
  name: string;

  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  nodes: any[];

  @IsArray()
  edges: any[];
}

