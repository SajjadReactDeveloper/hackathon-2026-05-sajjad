import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { FraudScoreService } from '../ai/fraud-score.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, FraudScoreService],
  exports: [OrdersService],
})
export class OrdersModule {}
