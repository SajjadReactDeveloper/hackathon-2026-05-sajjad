import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '@repo/types';
import { MessagesService } from './messages.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationsService } from '../conversations/conversations.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { decrypt } from '../common/crypto';
import { ValidationError } from '../common/errors';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().min(1).max(4096),
});

@Controller('messages')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly whatsappService: WhatsAppService,
    private readonly conversationsService: ConversationsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Get('conversation/:conversationId')
  list(
    @WorkspaceId() workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(PaginationSchema)) pagination: { page: number; limit: number },
  ) {
    return this.messagesService.listForConversation(
      workspaceId,
      conversationId,
      pagination.page,
      pagination.limit,
    );
  }

  @Post('send')
  async send(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(SendMessageSchema)) body: { conversationId: string; text: string },
  ) {
    const workspace = await this.workspacesService.getById(workspaceId);
    if (!workspace.phoneNumberId || !workspace.accessTokenEnc) {
      throw new ValidationError('WhatsApp not configured. Add phone number ID and access token in Settings.');
    }

    const conversation = await this.conversationsService.getById(workspaceId, body.conversationId);
    const contact = conversation.contact as { waPhone: string };

    const accessToken = decrypt(workspace.accessTokenEnc);

    await this.whatsappService.sendText(
      workspace.phoneNumberId,
      accessToken,
      contact.waPhone,
      body.text,
    );

    const waMessageId = `manual_${randomUUID()}`;
    const message = await this.messagesService.recordOutbound({
      workspaceId,
      conversationId: body.conversationId,
      contactId: (conversation.contact as { id: string }).id,
      waMessageId,
      type: 'text',
      textBody: body.text,
      aiGenerated: false,
    });

    await this.conversationsService.updateLastMessage(body.conversationId, body.text);

    return message;
  }
}
