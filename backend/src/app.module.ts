import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FlowsModule } from './flows/flows.module';
import { MockServicesModule } from './mock-services/mock-services.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/flow-builder',
    ),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    FlowsModule,
    MockServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
