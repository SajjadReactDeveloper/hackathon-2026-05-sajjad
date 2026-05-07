import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { getGroqClient } from '../ai/groq.client';
import { z } from 'zod';

const AnalysisSchema = z.object({
  reason: z.string(),
  suggestion: z.string(),
});

const BUYING_INTENT_PATTERNS = [
  /price|rate|kitna|cost|khareed|buy|order|chahiye|lena|send/i,
  /available|stock|hai|product|item|suit|kameez|dress|shirt/i,
  /deliver|bhej|address|COD|payment|advance/i,
];

@Injectable()
export class LostSaleService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(LostSaleService.name) private readonly logger: PinoLogger,
  ) {}

  async detectStale(workspaceId: string): Promise<number> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const staleConversations = await this.prisma.conversation.findMany({
      where: {
        workspaceId,
        lastMessageAt: { lt: threeDaysAgo },
        lostSaleStatus: 'not_lost',
        status: { not: 'resolved' },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { textBody: true, direction: true },
        },
        orders: { take: 1 },
      },
    });

    let flagged = 0;
    for (const conv of staleConversations) {
      const hasOrder = conv.orders.length > 0;
      if (hasOrder) continue;

      const hasIntent = conv.messages.some((m) =>
        m.textBody && BUYING_INTENT_PATTERNS.some((p) => p.test(m.textBody!)),
      );

      if (hasIntent) {
        await this.prisma.conversation.update({
          where: { id: conv.id },
          data: { lostSaleStatus: 'pending_analysis' },
        });
        flagged++;
      }
    }

    this.logger.info({ workspaceId, flagged }, 'Lost sale detection completed');
    return flagged;
  }

  async analyzeReason(workspaceId: string, conversationId: string): Promise<{ reason: string; suggestion: string }> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
          select: { direction: true, textBody: true, createdAt: true },
        },
      },
    });

    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    const transcript = conversation.messages
      .filter((m) => m.textBody)
      .map((m) => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.textBody}`)
      .join('\n');

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a sales analyst for a Pakistani e-commerce business. Analyze why a customer conversation ended without an order.
Return JSON with:
- reason: concise explanation (1-2 sentences) why the sale was lost
- suggestion: specific recovery action for the seller (1-2 sentences)

Focus on practical, actionable insights.`,
        },
        {
          role: 'user',
          content: `Conversation thread:\n${transcript}\n\nWhy did this customer not complete a purchase?`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message.content ?? '{}';
    let result = { reason: 'Conversation went stale without completing a purchase.', suggestion: 'Follow up with a personalized offer.' };

    try {
      const parsed = AnalysisSchema.safeParse(JSON.parse(content));
      if (parsed.success) result = parsed.data;
    } catch {
      // use defaults
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lostSaleStatus: 'analyzed',
        lostSaleReason: result.reason,
        lostSaleSuggestion: result.suggestion,
        lostSaleAnalyzedAt: new Date(),
      },
    });

    this.logger.info({ conversationId }, 'Lost sale analyzed');
    return result;
  }

  async recover(workspaceId: string, conversationId: string): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, workspaceId },
      data: { lostSaleStatus: 'recovered' },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.conversation.findMany({
      where: {
        workspaceId,
        lostSaleStatus: { in: ['pending_analysis', 'analyzed', 'recovered'] },
      },
      include: {
        contact: { select: { id: true, waPhone: true, displayName: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }
}
