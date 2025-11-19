import { Module } from '@nestjs/common';
import { MockServicesController } from './mock-services.controller';
import { MockServicesService } from './mock-services.service';

@Module({
  controllers: [MockServicesController],
  providers: [MockServicesService],
  exports: [MockServicesService],
})
export class MockServicesModule {}

