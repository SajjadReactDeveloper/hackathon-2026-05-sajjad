import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import type { Message, MessageDirection, MessageType, DetectedLanguage } from '@repo/db';

interface RecordInboundDto {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  waMessageId: string;
  type: MessageType;
  textBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  transcription?: string;
  detectedLanguage?: DetectedLanguage;
  rawPayload?: Record<string, unknown>;
}

interface RecordOutboundDto {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  waMessageId: string;
  type: MessageType;
  textBody?: string;
  mediaUrl?: string;
  aiGenerated?: boolean;
  aiModel?: string;
  aiLatencyMs?: number;
  toolCallsTrace?: unknown;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(MessagesService.name) private readonly logger: PinoLogger,
  ) {}

  async recordInbound(dto: RecordInboundDto): Promise<Message> {
    return this.prisma.message.upsert({
      where: { waMessageId: dto.waMessageId },
      update: {},
      create: {
        workspaceId: dto.workspaceId,
        conversationId: dto.conversationId,
        contactId: dto.contactId,
        direction: 'inbound' as MessageDirection,
        waMessageId: dto.waMessageId,
        type: dto.type,
        textBody: dto.textBody,
        mediaUrl: dto.mediaUrl,
        mediaMimeType: dto.mediaMimeType,
        transcription: dto.transcription,
        detectedLanguage: dto.detectedLanguage ?? 'unknown',
        rawPayload: dto.rawPayload as never,
      },
    });
  }

  async recordOutbound(dto: RecordOutboundDto): Promise<Message> {
    return this.prisma.message.create({
      data: {
        workspaceId: dto.workspaceId,
        conversationId: dto.conversationId,
        contactId: dto.contactId,
        direction: 'outbound' as MessageDirection,
        waMessageId: dto.waMessageId,
        type: dto.type,
        textBody: dto.textBody,
        mediaUrl: dto.mediaUrl,
        aiGenerated: dto.aiGenerated ?? false,
        aiModel: dto.aiModel,
        aiLatencyMs: dto.aiLatencyMs,
        toolCallsTrace: dto.toolCallsTrace as never,
      },
    });
  }

  async listForConversation(
    workspaceId: string,
    conversationId: string,
    page: number,
    limit: number,
  ) {
    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { workspaceId, conversationId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { workspaceId, conversationId } }),
    ]);
    return { items, total, page, limit };
  }

  async markStatus(waMessageId: string, status: 'delivered' | 'read' | 'failed'): Promise<void> {
    await this.prisma.message.updateMany({
      where: { waMessageId },
      data: { status },
    });
  }
}
