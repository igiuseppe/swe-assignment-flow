import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { Flow, FlowSchema } from './schemas/flow.schema';
import { Execution, ExecutionSchema } from './schemas/execution.schema';
import { FlowValidatorService } from './flow-validator.service';
import { FlowExecutionService } from './execution.service';
import { DelayProcessor } from './delay.processor';
import { MockServicesModule } from '../mock-services/mock-services.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Flow.name, schema: FlowSchema },
      { name: Execution.name, schema: ExecutionSchema },
    ]),
    BullModule.registerQueue({
      name: 'flow-delays',
    }),
    MockServicesModule,
  ],
  controllers: [FlowsController],
  providers: [FlowsService, FlowValidatorService, FlowExecutionService, DelayProcessor],
  exports: [FlowsService, FlowExecutionService],
})
export class FlowsModule {}

