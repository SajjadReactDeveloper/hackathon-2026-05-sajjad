import { Controller, Post, Body, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ChatbotService } from './chatbot.service';
import { ValidationError } from '../common/errors';
import { z } from 'zod';

const QuerySchema = z.object({
  question: z.string().min(1).max(500),
});

@Controller('chatbot')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('query')
  query(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(QuerySchema)) body: { question: string },
  ) {
    return this.chatbotService.query(workspaceId, body.question);
  }

  @Post('voice-query')
  @UseInterceptors(FileInterceptor('file'))
  async voiceQuery(
    @WorkspaceId() workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new ValidationError('No audio file provided');
    return this.chatbotService.voiceQuery(workspaceId, file.buffer, file.mimetype);
  }
}
