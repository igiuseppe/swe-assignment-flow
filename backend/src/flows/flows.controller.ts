import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FlowsService } from './flows.service';
import { FlowExecutionService } from './execution.service';
import { Execution, ExecutionDocument } from './schemas/execution.schema';
import { TriggerType } from './schemas/flow.schema';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { ValidateFlowDto } from './dto/validate-flow.dto';
import { RetryExecutionDto } from './dto/retry-execution.dto';
import { FireTriggerDto } from './dto/fire-trigger.dto';

@Controller('flows')
export class FlowsController {
  constructor(
    private readonly flowsService: FlowsService,
    private readonly executionService: FlowExecutionService,
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
  ) {}

  @Post()
  create(@Body() createFlowDto: CreateFlowDto) {
    return this.flowsService.create(createFlowDto);
  }

  @Get()
  findAll() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFlowDto: UpdateFlowDto) {
    return this.flowsService.update(id, updateFlowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.flowsService.remove(id);
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.flowsService.validate(id);
  }

  @Post('validate')
  validateData(@Body() validateFlowDto: ValidateFlowDto) {
    return this.flowsService.validateData(validateFlowDto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.flowsService.activate(id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.flowsService.deactivate(id);
  }

  @Post(':id/execute')
  async execute(
    @Param('id') id: string,
    @Body() triggerData: Record<string, any>,
  ) {
    const flow = await this.flowsService.findOne(id);
    return this.executionService.executeFlow(flow, triggerData || {});
  }

  @Get(':id/executions')
  async getExecutions(@Param('id') flowId: string) {
    // Convert string to ObjectId for proper query
    const flowObjectId = new Types.ObjectId(flowId);
    return this.executionModel
      .find({ flowId: flowObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  @Get('executions/:executionId')
  async getExecution(@Param('executionId') id: string) {
    return this.executionModel.findById(id).exec();
  }

  @Post('executions/:executionId/retry')
  async retryExecution(
    @Param('executionId') id: string,
    @Body() retryDto: RetryExecutionDto,
  ) {
    return this.executionService.retryExecution(id, retryDto.nodeIds);
  }

  @Post('trigger/:triggerType')
  async fireTrigger(
    @Param('triggerType') triggerType: TriggerType,
    @Body() fireTriggerDto: FireTriggerDto,
  ) {
    // Find all active flows with this trigger type
    const activeFlows = await this.flowsService.findActiveByTriggerType(triggerType);

    if (activeFlows.length === 0) {
      return {
        message: `No active flows found for trigger type: ${triggerType}`,
        executions: [],
        flowsTriggered: 0,
      };
    }

    // Execute all flows in parallel (non-blocking)
    const executionPromises = activeFlows.map(flow =>
      this.executionService.executeFlow(flow, fireTriggerDto.payload || {})
    );

    // Fire and forget - return immediately with execution IDs
    const executions = await Promise.all(executionPromises);

    return {
      message: `Triggered ${activeFlows.length} flow(s)`,
      triggerType,
      flowsTriggered: activeFlows.length,
      executions: executions.map(exec => ({
        executionId: exec._id,
        flowId: exec.flowId,
      })),
    };
  }
}

