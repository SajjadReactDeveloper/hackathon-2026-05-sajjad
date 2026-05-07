import { Controller, Get, Post, Param, Query, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '@repo/types';
import { MessagesService } from './messages.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationsService } from '../conversations/conversations.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
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
    private readonly storage: SupabaseStorageService,
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

  @Post('send-image')
  @UseInterceptors(FileInterceptor('file'))
  async sendImage(
    @WorkspaceId() workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
    @Body('caption') caption: string | undefined,
  ) {
    const bodyParsed = z
      .object({ conversationId: z.string().uuid(), caption: z.string().max(1024).optional() })
      .safeParse({ conversationId, caption });
    if (!bodyParsed.success) throw new ValidationError('Invalid request body');
    if (!file) throw new ValidationError('No image file provided');

    const workspace = await this.workspacesService.getById(workspaceId);
    if (!workspace.phoneNumberId || !workspace.accessTokenEnc) {
      throw new ValidationError('WhatsApp not configured. Add phone number ID and access token in Settings.');
    }

    const conversation = await this.conversationsService.getById(workspaceId, bodyParsed.data.conversationId);
    const contact = conversation.contact as { id: string; waPhone: string };
    const accessToken = decrypt(workspace.accessTokenEnc);

    const ext = file.mimetype.includes('png') ? 'png' : 'jpg';
    const storagePath = `inbox/${workspaceId}/${randomUUID()}.${ext}`;
    const signedUrl = await this.storage.uploadAndSign('products', storagePath, file.buffer, file.mimetype);

    await this.whatsappService.sendImage(
      workspace.phoneNumberId,
      accessToken,
      contact.waPhone,
      signedUrl,
      bodyParsed.data.caption,
    );

    const waMessageId = `manual_img_${randomUUID()}`;
    const message = await this.messagesService.recordOutbound({
      workspaceId,
      conversationId: bodyParsed.data.conversationId,
      contactId: contact.id,
      waMessageId,
      type: 'image',
      textBody: bodyParsed.data.caption,
      mediaUrl: signedUrl,
      aiGenerated: false,
    });

    await this.conversationsService.updateLastMessage(bodyParsed.data.conversationId, '[Image]');
    return message;
  }

  @Post('send-voice')
  @UseInterceptors(FileInterceptor('file'))
  async sendVoice(
    @WorkspaceId() workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
  ) {
    const bodyParsed = z.object({ conversationId: z.string().uuid() }).safeParse({ conversationId });
    if (!bodyParsed.success) throw new ValidationError('Invalid request body');
    if (!file) throw new ValidationError('No audio file provided');

    const workspace = await this.workspacesService.getById(workspaceId);
    if (!workspace.phoneNumberId || !workspace.accessTokenEnc) {
      throw new ValidationError('WhatsApp not configured. Add phone number ID and access token in Settings.');
    }

    const conversation = await this.conversationsService.getById(workspaceId, bodyParsed.data.conversationId);
    const contact = conversation.contact as { id: string; waPhone: string };
    const accessToken = decrypt(workspace.accessTokenEnc);

    const ext = file.mimetype.includes('ogg') ? 'ogg' : 'mp3';
    const storagePath = `inbox/${workspaceId}/${randomUUID()}.${ext}`;
    const signedUrl = await this.storage.uploadAndSign('tts', storagePath, file.buffer, file.mimetype);

    await this.whatsappService.sendAudio(workspace.phoneNumberId, accessToken, contact.waPhone, signedUrl);

    const waMessageId = `manual_audio_${randomUUID()}`;
    const message = await this.messagesService.recordOutbound({
      workspaceId,
      conversationId: bodyParsed.data.conversationId,
      contactId: contact.id,
      waMessageId,
      type: 'audio',
      mediaUrl: signedUrl,
      aiGenerated: false,
    });

    await this.conversationsService.updateLastMessage(bodyParsed.data.conversationId, '[Voice message]');
    return message;
  }
}
