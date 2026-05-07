import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '@repo/types';
import { ConversationsService } from './conversations.service';
import { z } from 'zod';

const ToggleAISchema = z.object({ enabled: z.boolean() });

@Controller('conversations')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @Query(new ZodValidationPipe(PaginationSchema)) pagination: { page: number; limit: number },
  ) {
    return this.conversationsService.list(workspaceId, pagination.page, pagination.limit);
  }

  @Get(':id')
  getById(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.conversationsService.getById(workspaceId, id);
  }

  @Post(':id/read')
  markRead(@WorkspaceId() workspaceId: string, @Param('id') id: string): Promise<void> {
    return this.conversationsService.markRead(workspaceId, id);
  }

  @Patch(':id/ai')
  toggleAI(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ToggleAISchema)) body: { enabled: boolean },
  ) {
    return this.conversationsService.toggleAI(workspaceId, id, body.enabled);
  }
}
