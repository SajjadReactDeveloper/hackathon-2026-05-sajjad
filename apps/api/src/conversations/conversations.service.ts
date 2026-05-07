import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../common/errors';
import type { Conversation } from '@repo/db';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(ConversationsService.name) private readonly logger: PinoLogger,
  ) {}

  async getOrCreateForContact(workspaceId: string, contactId: string): Promise<Conversation> {
    const existing = await this.prisma.conversation.findFirst({
      where: { workspaceId, contactId, status: { not: 'resolved' } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    this.logger.info({ workspaceId, contactId }, 'Creating new conversation');
    return this.prisma.conversation.create({
      data: { workspaceId, contactId },
    });
  }

  async list(workspaceId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { workspaceId },
        include: {
          contact: { select: { id: true, waPhone: true, displayName: true, profileName: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit };
  }

  async getById(workspaceId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: {
        contact: { select: { id: true, waPhone: true, displayName: true, profileName: true, tags: true } },
      },
    });
    if (!conversation) throw new NotFoundError('Conversation', id);
    return conversation;
  }

  async markRead(workspaceId: string, id: string): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { id, workspaceId },
      data: { unreadCount: 0 },
    });
  }

  async toggleAI(workspaceId: string, id: string, enabled: boolean): Promise<Conversation> {
    const updated = await this.prisma.conversation.updateMany({
      where: { id, workspaceId },
      data: { aiEnabled: enabled },
    });
    if (updated.count === 0) throw new NotFoundError('Conversation', id);
    return this.getById(workspaceId, id);
  }

  async updateLastMessage(id: string, preview: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview.slice(0, 100),
        unreadCount: { increment: 1 },
      },
    });
  }

  async isAIEnabled(id: string): Promise<boolean> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      select: { aiEnabled: true },
    });
    return conv?.aiEnabled ?? false;
  }
}
