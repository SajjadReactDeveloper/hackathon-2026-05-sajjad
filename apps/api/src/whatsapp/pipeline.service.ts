import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { AIReplyService } from '../ai/ai-reply.service';
import { VoiceParserService } from '../ai/voice-parser.service';
import { VoiceReplyService } from '../ai/voice-reply.service';
import { ImageOrderService } from '../ai/image-order.service';
import { OrdersService } from '../orders/orders.service';
import { RulesService } from '../rules/rules.service';
import { MemoryService } from '../memory/memory.service';
import { WhatsAppService } from './whatsapp.service';
import { decrypt } from '../common/crypto';
import type { Workspace } from '@repo/db';

interface InboundEvent {
  phoneNumberId: string;
  from: string;
  waMessageId: string;
  timestamp: number;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  contactName?: string;
}

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contacts: ContactsService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly aiReply: AIReplyService,
    private readonly voiceParser: VoiceParserService,
    private readonly voiceReply: VoiceReplyService,
    private readonly imageOrder: ImageOrderService,
    private readonly orders: OrdersService,
    private readonly rules: RulesService,
    private readonly memory: MemoryService,
    private readonly whatsapp: WhatsAppService,
    @InjectPinoLogger(PipelineService.name) private readonly logger: PinoLogger,
  ) {}

  async handle(event: InboundEvent): Promise<void> {
    const workspace = await this.resolveWorkspace(event.phoneNumberId);
    if (!workspace) {
      this.logger.warn({ phoneNumberId: event.phoneNumberId }, 'No workspace for phoneNumberId');
      return;
    }

    const accessToken = workspace.accessTokenEnc ? decrypt(workspace.accessTokenEnc) : '';
    const contact = await this.contacts.getOrCreateByPhone(
      workspace.id,
      event.from,
      event.contactName,
    );
    const conversation = await this.conversations.getOrCreateForContact(workspace.id, contact.id);
    await this.contacts.updateLastSeen(contact.id);

    const textBody = event.text?.body;
    const language = textBody ? this.aiReply.detectInputLanguage(textBody) : 'unknown';

    const inboundMsg = await this.messages.recordInbound({
      workspaceId: workspace.id,
      conversationId: conversation.id,
      contactId: contact.id,
      waMessageId: event.waMessageId,
      type: event.type as 'text' | 'audio' | 'image',
      textBody,
      detectedLanguage: language,
      rawPayload: event as unknown as Record<string, unknown>,
    });

    await this.conversations.updateLastMessage(
      conversation.id,
      textBody ?? `[${event.type}]`,
    );

    this.logger.info(
      { workspaceId: workspace.id, from: event.from, type: event.type, messageId: inboundMsg.id },
      'Inbound message recorded',
    );

    if (event.type === 'audio' && event.audio && accessToken) {
      await this.handleAudio(workspace, contact, conversation, inboundMsg.id, event, accessToken);
      return;
    }

    if (event.type === 'image' && event.image && accessToken) {
      await this.handleImage(workspace, contact, conversation, inboundMsg.id, event, accessToken);
      return;
    }

    if (event.type !== 'text' || !textBody) return;

    // Rule engine runs before AI — first matching rule may skip AI entirely
    const ruleResult = await this.rules.match(workspace.id, textBody);
    if (ruleResult.matched && ruleResult.rule) {
      if (ruleResult.action === 'skip_ai' && ruleResult.replyText && accessToken && workspace.phoneNumberId) {
        await this.whatsapp.sendText(workspace.phoneNumberId, accessToken, event.from, ruleResult.replyText);
        const outWaId = `rule_${ruleResult.rule.id}_${Date.now()}`;
        await this.messages.recordOutbound({
          workspaceId: workspace.id,
          conversationId: conversation.id,
          contactId: contact.id,
          waMessageId: outWaId,
          type: 'text',
          textBody: ruleResult.replyText,
          aiGenerated: false,
        });
        await this.conversations.updateLastMessage(conversation.id, ruleResult.replyText);
        this.logger.info({ ruleId: ruleResult.rule.id, name: ruleResult.rule.name }, 'Rule fired, AI skipped');
        return;
      }
      if (ruleResult.action === 'send_text' && ruleResult.replyText && accessToken && workspace.phoneNumberId) {
        await this.whatsapp.sendText(workspace.phoneNumberId, accessToken, event.from, ruleResult.replyText);
        const outWaId = `rule_${ruleResult.rule.id}_${Date.now()}`;
        await this.messages.recordOutbound({
          workspaceId: workspace.id,
          conversationId: conversation.id,
          contactId: contact.id,
          waMessageId: outWaId,
          type: 'text',
          textBody: ruleResult.replyText,
          aiGenerated: false,
        });
        await this.conversations.updateLastMessage(conversation.id, ruleResult.replyText);
        this.logger.info({ ruleId: ruleResult.rule.id, name: ruleResult.rule.name }, 'Rule send_text fired');
      }
    }

    const aiEnabled = await this.conversations.isAIEnabled(conversation.id);
    if (!aiEnabled) return;

    const aiConfig = await this.prisma.aIConfig.findUnique({
      where: { workspaceId: workspace.id },
    });
    if (!aiConfig?.autoReplyEnabled) return;

    if (!this.isWithinBusinessHours(aiConfig.businessHours as Record<string, unknown>)) return;

    const mem = await this.memory.composeForReply(conversation.id, contact.id, workspace.id, textBody);
    const result = await this.aiReply.generate(
      workspace.id,
      contact.id,
      textBody,
      mem,
      aiConfig.systemPromptOverride,
    );

    const outWaId = `ai_${Date.now()}_${workspace.id.slice(0, 8)}`;

    if (accessToken && workspace.phoneNumberId) {
      // Send text reply first (always — also serves as inbox record)
      await this.whatsapp.sendText(workspace.phoneNumberId, accessToken, event.from, result.text);

      // Send product images if search_products returned results with imageUrls
      for (const attachment of result.productAttachments) {
        try {
          await this.whatsapp.sendImage(
            workspace.phoneNumberId,
            accessToken,
            event.from,
            attachment.imageUrl,
            attachment.productName,
          );
        } catch (imgErr) {
          this.logger.warn({ imgErr, imageUrl: attachment.imageUrl }, 'Failed to send product image');
        }
      }

    }

    await this.messages.recordOutbound({
      workspaceId: workspace.id,
      conversationId: conversation.id,
      contactId: contact.id,
      waMessageId: outWaId,
      type: 'text',
      textBody: result.text,
      aiGenerated: true,
      aiModel: result.aiModel,
      aiLatencyMs: result.latencyMs,
      toolCallsTrace: result.toolCallsTrace,
    });

    await this.conversations.updateLastMessage(conversation.id, result.text);

    this.logger.info(
      {
        workspaceId: workspace.id,
        latencyMs: result.latencyMs,
        tools: result.toolCallsTrace.length,
        images: result.productAttachments.length,
      },
      'AI reply sent',
    );
  }

  private async handleAudio(
    workspace: Workspace,
    contact: { id: string },
    conversation: { id: string },
    sourceMessageId: string,
    event: InboundEvent,
    accessToken: string,
  ): Promise<void> {
    try {
      const mediaBuffer = await this.whatsapp.downloadMedia(event.audio!.id, accessToken);
      const transcript = await this.voiceParser.transcribe(mediaBuffer, event.audio!.mime_type);
      const replyLanguage = this.aiReply.detectInputLanguage(transcript);

      // Record transcription as a text message in the thread
      await this.messages.recordInbound({
        workspaceId: workspace.id,
        conversationId: conversation.id,
        contactId: contact.id,
        waMessageId: `${event.waMessageId}_transcription`,
        type: 'text',
        textBody: transcript,
        detectedLanguage: replyLanguage,
        rawPayload: {},
      }).catch(() => {}); // ignore duplicate on retry

      // Try to parse as an order — if items found, it's an order voice note
      const parsed = await this.voiceParser.parseToOrder(transcript);
      const isOrder = parsed.items.length > 0;

      let replyText: string;

      if (isOrder) {
        const order = await this.orders.createFromParse({
          workspaceId: workspace.id,
          contactId: contact.id,
          conversationId: conversation.id,
          sourceMessageId,
          items: parsed.items,
          deliveryAddress: parsed.deliveryAddress,
          notes: parsed.notes,
          createdVia: 'voice_note',
        });
        replyText = await this.aiReply.generateOrderConfirmation(
          order.orderNumber,
          order.totalCents,
          replyLanguage,
        );
        this.logger.info(
          { workspaceId: workspace.id, orderId: order.id, orderNumber: order.orderNumber },
          'Voice order processed',
        );
      } else {
        // General voice query (greeting, product question, FAQ etc.) — route through AI
        const mem = await this.memory.composeForReply(conversation.id, contact.id, workspace.id, transcript);
        const aiResult = await this.aiReply.generate(workspace.id, contact.id, transcript, mem);
        replyText = aiResult.text;

        // Send product images if the AI looked up products
        for (const attachment of aiResult.productAttachments) {
          try {
            await this.whatsapp.sendImage(
              workspace.phoneNumberId!,
              accessToken,
              event.from,
              attachment.imageUrl,
              attachment.productName,
            );
          } catch (imgErr) {
            this.logger.warn({ imgErr }, 'Failed to send product image in voice reply');
          }
        }
      }

      // Always reply with voice when input was a voice note
      const audioUrl = await this.voiceReply.synthesize(replyText, replyLanguage, workspace.id);

      await this.whatsapp.sendAudio(workspace.phoneNumberId!, accessToken, event.from, audioUrl);

      const outWaId = `voice_conf_${Date.now()}`;
      await this.messages.recordOutbound({
        workspaceId: workspace.id,
        conversationId: conversation.id,
        contactId: contact.id,
        waMessageId: outWaId,
        type: 'audio',
        textBody: replyText,
        mediaUrl: audioUrl,
        aiGenerated: true,
      });

      await this.conversations.updateLastMessage(conversation.id, replyText);
    } catch (err) {
      this.logger.error({ err, workspaceId: workspace.id }, 'Audio pipeline error');
    }
  }

  private async handleImage(
    workspace: Workspace,
    contact: { id: string },
    conversation: { id: string },
    sourceMessageId: string,
    event: InboundEvent,
    accessToken: string,
  ): Promise<void> {
    try {
      const mediaBuffer = await this.whatsapp.downloadMedia(event.image!.id, accessToken);
      // Supabase Storage: upload image temporarily to get a public/signed URL for GPT-4o-mini
      const imageBase64 = `data:${event.image!.mime_type};base64,${mediaBuffer.toString('base64')}`;

      const parsed = await this.imageOrder.parseImageToOrder(imageBase64);
      const caption = event.image?.caption ?? '';
      const replyLanguage = caption ? this.aiReply.detectInputLanguage(caption) : 'english';

      const order = await this.orders.createFromParse({
        workspaceId: workspace.id,
        contactId: contact.id,
        conversationId: conversation.id,
        sourceMessageId,
        items: parsed.items,
        notes: parsed.notes ?? caption,
        createdVia: 'image',
      });

      const confirmText = await this.aiReply.generateOrderConfirmation(
        order.orderNumber,
        order.totalCents,
        replyLanguage,
      );

      if (workspace.phoneNumberId) {
        await this.whatsapp.sendText(workspace.phoneNumberId, accessToken, event.from, confirmText);
      }

      const outWaId = `img_conf_${Date.now()}`;
      await this.messages.recordOutbound({
        workspaceId: workspace.id,
        conversationId: conversation.id,
        contactId: contact.id,
        waMessageId: outWaId,
        type: 'text',
        textBody: confirmText,
        aiGenerated: true,
      });

      await this.conversations.updateLastMessage(conversation.id, confirmText);

      this.logger.info(
        { workspaceId: workspace.id, orderId: order.id, orderNumber: order.orderNumber },
        'Image order processed',
      );
    } catch (err) {
      this.logger.error({ err, workspaceId: workspace.id }, 'Image pipeline error');
    }
  }

  private async resolveWorkspace(phoneNumberId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({ where: { phoneNumberId } });
  }

  private isWithinBusinessHours(config: Record<string, unknown>): boolean {
    if (!config?.enabled) return true;
    const now = new Date();
    const tz = (config.timezone as string) ?? 'Asia/Karachi';
    const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: tz });
    const [hours, minutes] = formatter.format(now).split(':').map(Number);
    const currentMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
    const [startH, startM] = ((config.start as string) ?? '09:00').split(':').map(Number);
    const [endH, endM] = ((config.end as string) ?? '21:00').split(':').map(Number);
    const startMinutes = (startH ?? 9) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 21) * 60 + (endM ?? 0);
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}
