import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { VoiceParserService } from '../ai/voice-parser.service';
import { getGroqClient } from '../ai/groq.client';
import { z } from 'zod';

const DataBlockSchema = z.object({
  type: z.enum(['stat', 'list', 'table']),
  title: z.string().optional(),
  value: z.string().optional(),
  items: z.array(z.string()).optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
});

const ChatbotResponseSchema = z.object({
  answer: z.string(),
  data: DataBlockSchema.optional(),
});

export type ChatbotResponse = z.infer<typeof ChatbotResponseSchema>;

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly voiceParser: VoiceParserService,
    @InjectPinoLogger(ChatbotService.name) private readonly logger: PinoLogger,
  ) {}

  async query(workspaceId: string, question: string): Promise<ChatbotResponse> {
    const [tiles, recentOrders, products] = await Promise.all([
      this.analytics.getDashboardTiles(workspaceId),
      this.prisma.order.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          contact: { select: { displayName: true, waPhone: true } },
          items: { select: { name: true, quantity: true, lineTotalCents: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { workspaceId, active: true },
        orderBy: { priceCents: 'desc' },
        take: 20,
        select: { name: true, priceCents: true, stock: true, sku: true },
      }),
    ]);

    const formatRs = (cents: number) =>
      `Rs. ${Math.round(cents / 100).toLocaleString('en-PK')}`;

    const orderLines = recentOrders
      .map(
        (o) =>
          `  ORD-${o.orderNumber}: ${(o.contact as { displayName?: string })?.displayName ?? 'Unknown'} | ${formatRs(Number(o.totalCents))} | ${o.status} | ${o.createdAt.toLocaleDateString('en-PK')}`,
      )
      .join('\n');

    const productLines = products
      .slice(0, 10)
      .map((p) => `  ${p.name} (${p.sku}): ${formatRs(Number(p.priceCents))}, Stock: ${p.stock}`)
      .join('\n');

    const dataContext = `
BUSINESS SNAPSHOT:
- Revenue today: ${formatRs(tiles.todayRevenueCents)}
- Revenue this week: ${formatRs(tiles.weekRevenueCents)}
- Revenue this month: ${formatRs(tiles.monthRevenueCents)}
- Total orders: ${tiles.totalOrders}
- Open conversations: ${tiles.openConversations}
- Total messages: ${tiles.totalMessages}
- AI auto-reply rate: ${tiles.aiReplyRate}%

RECENT ORDERS (last 10):
${orderLines || '  No orders yet'}

ACTIVE PRODUCTS (${products.length} total):
${productLines || '  No products yet'}
    `.trim();

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a smart business intelligence assistant for a Pakistani WhatsApp e-commerce seller ("Revenue Brain"). Answer questions about their business accurately and helpfully in PKR (Pakistani Rupees).

LANGUAGE RULE: Detect the language of the question — Urdu (nastaliq), English, or Roman Urdu — and reply in EXACTLY that same language.

RESPONSE FORMAT: Return a JSON object with this exact schema:
{
  "answer": "string — your main answer, 1-3 sentences",
  "data": {                // OPTIONAL — only include if meaningful visual data exists
    "type": "stat|list|table",
    "title": "string",
    "value": "string",       // for type="stat" only
    "items": ["string"],     // for type="list" only
    "headers": ["string"],   // for type="table" only
    "rows": [["string"]]     // for type="table" only
  }
}

EXAMPLES:
- "Aaj ki sale?" → type="stat", value="Rs. 45,000", title="Aaj ki Revenue"
- "Recent orders?" → type="table" with headers [Order, Customer, Amount, Status]
- "Top products?" → type="list" with product names and prices

Only answer business-related questions. For unrelated questions, politely decline.`,
        },
        {
          role: 'user',
          content: `${dataContext}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message.content ?? '{}';

    try {
      const raw = JSON.parse(content) as unknown;
      const parsed = ChatbotResponseSchema.safeParse(raw);
      if (parsed.success) {
        this.logger.debug({ workspaceId, question: question.slice(0, 50) }, 'Chatbot query answered');
        return parsed.data;
      }
    } catch {
      // fall through to plain text fallback
    }

    // If Groq returned plain text instead of JSON (shouldn't happen with json_object mode)
    this.logger.warn({ workspaceId, content: content.slice(0, 100) }, 'Chatbot response parse fallback');
    return {
      answer: content.length > 5 ? content : 'Mujhe is sawaal ka jawab nahi mila. Kripya dobara try karein.',
    };
  }

  async voiceQuery(workspaceId: string, audioBuffer: Buffer, mimeType: string): Promise<ChatbotResponse> {
    const transcript = await this.voiceParser.transcribe(audioBuffer, mimeType);
    this.logger.info({ workspaceId, transcriptLength: transcript.length }, 'Chatbot voice query transcribed');
    return this.query(workspaceId, transcript);
  }
}
