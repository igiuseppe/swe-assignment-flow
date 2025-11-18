import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FlowsModule } from './flows/flows.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/flow-builder',
    ),
    FlowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
