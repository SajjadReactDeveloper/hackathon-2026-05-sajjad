import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AnalyticsModule, AIModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
