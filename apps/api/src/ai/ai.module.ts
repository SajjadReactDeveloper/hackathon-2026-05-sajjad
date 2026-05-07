import { Module } from '@nestjs/common';
import { AIReplyService } from './ai-reply.service';
import { VoiceParserService } from './voice-parser.service';
import { VoiceReplyService } from './voice-reply.service';
import { ImageOrderService } from './image-order.service';
import { FraudScoreService } from './fraud-score.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [AIReplyService, VoiceParserService, VoiceReplyService, ImageOrderService, FraudScoreService],
  exports: [AIReplyService, VoiceParserService, VoiceReplyService, ImageOrderService, FraudScoreService],
})
export class AIModule {}
