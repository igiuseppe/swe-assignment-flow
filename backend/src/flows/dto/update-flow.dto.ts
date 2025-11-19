import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NodeType, NodeCategory, TriggerType } from '../schemas/flow.schema';

export class PositionDto {
  @IsOptional()
  x: number;

  @IsOptional()
  y: number;
}

export class FlowNodeDto {
  @IsString()
  id: string;

  @IsEnum(NodeType)
  type: NodeType;

  @IsEnum(NodeCategory)
  category: NodeCategory;

  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @IsOptional()
  config?: Record<string, any>;
}

export class FlowEdgeDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowNodeDto)
  nodes?: FlowNodeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowEdgeDto)
  edges?: FlowEdgeDto[];
}

