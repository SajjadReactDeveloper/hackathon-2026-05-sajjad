import { Module } from '@nestjs/common';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';
import { RagService } from './rag.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [KbController],
  providers: [KbService, RagService],
  exports: [KbService, RagService],
})
export class KbModule {}
