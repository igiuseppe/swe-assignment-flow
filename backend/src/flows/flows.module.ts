import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { Flow, FlowSchema } from './schemas/flow.schema';
import { FlowValidatorService } from './flow-validator.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Flow.name, schema: FlowSchema }]),
  ],
  controllers: [FlowsController],
  providers: [FlowsService, FlowValidatorService],
  exports: [FlowsService],
})
export class FlowsModule {}

