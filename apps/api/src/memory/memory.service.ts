import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../kb/rag.service';

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    // reason: optional to avoid circular dep if KbModule not yet imported; safe to inject via forwardRef in module
    @Optional() private readonly rag?: RagService,
  ) {}

  async composeForReply(
    conversationId: string,
    contactId: string,
    workspaceId: string,
    userMessage?: string,
  ) {
    const [recentMessages, facts, orders] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { direction: true, textBody: true, transcription: true, type: true },
      }),
      this.prisma.contactFact.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.order.findMany({
        where: { workspaceId, contactId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
    ]);

    let kbContext = '';
    if (this.rag && userMessage) {
      try {
        kbContext = await this.rag.retrieve(userMessage, workspaceId, 3);
      } catch {
        // RAG is best-effort; don't fail the whole reply
      }
    }

    const recentForPrompt = recentMessages
      .reverse()
      .map((m) => ({
        role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.textBody ?? m.transcription ?? `[${m.type} message]`,
      }));

    const factsSummary = facts.length
      ? facts.map((f) => `${f.factType}: ${f.value}`).join(', ')
      : '';

    const ordersSummary = orders.length
      ? orders
          .map(
            (o) =>
              `${o.orderNumber} (${o.status}) — ${o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} — ${Number(o.totalCents) / 100} PKR`,
          )
          .join('\n')
      : '';

    return {
      recentMessages: recentForPrompt,
      customerFacts: factsSummary,
      recentOrders: ordersSummary,
      kbContext,
    };
  }
}
