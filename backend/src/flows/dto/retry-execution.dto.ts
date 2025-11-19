import { IsArray, IsOptional, IsString } from 'class-validator';

export class RetryExecutionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nodeIds?: string[];
}

