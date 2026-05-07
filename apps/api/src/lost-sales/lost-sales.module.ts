import { Module } from '@nestjs/common';
import { LostSalesController } from './lost-sales.controller';
import { LostSaleService } from './lost-sale.service';

@Module({
  controllers: [LostSalesController],
  providers: [LostSaleService],
  exports: [LostSaleService],
})
export class LostSalesModule {}
