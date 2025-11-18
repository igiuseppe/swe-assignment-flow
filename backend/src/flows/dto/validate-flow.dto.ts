import { IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TriggerType } from '../schemas/flow.schema';
import { FlowNodeDto, FlowEdgeDto } from './update-flow.dto';

export class ValidateFlowDto {
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowNodeDto)
  nodes: FlowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowEdgeDto)
  edges: FlowEdgeDto[];
}

