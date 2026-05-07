import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { KbModule } from '../kb/kb.module';

@Module({
  imports: [KbModule],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
