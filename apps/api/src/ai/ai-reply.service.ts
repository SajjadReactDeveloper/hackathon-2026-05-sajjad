import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { getGroqClient } from './groq.client';
import { ToolRegistry } from './tools/tool-registry';
import { registerProductTools } from './tools/product.tools';
import { registerOrderTools } from './tools/order.tools';
import { registerKbTools } from './tools/kb.tools';
import { registerDeliveryTools } from './tools/delivery.tools';
import { registerEscalateTools } from './tools/escalate.tools';
import { detectLanguage, getSystemPrompt, ORDER_CONFIRMATION_TEMPLATES } from '@repo/ai';
import type { DetectedLanguage } from '@repo/types';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import type Groq from 'groq-sdk';

const MAX_TOOL_ITERATIONS = 3;
const TOOL_TIMEOUT_MS = 15_000;

export interface ProductAttachment {
  imageUrl: string;
  productName: string;
}

interface ReplyResult {
  text: string;
  detectedLanguage: DetectedLanguage;
  toolCallsTrace: unknown[];
  aiModel: string;
  latencyMs: number;
  productAttachments: ProductAttachment[];
}

interface MemoryContext {
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  customerFacts: string;
  recentOrders: string;
  kbContext?: string;
}

@Injectable()
export class AIReplyService {
  private registry: ToolRegistry;

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(AIReplyService.name) private readonly logger: PinoLogger,
  ) {
    this.registry = new ToolRegistry();
    registerProductTools(this.registry, this.prisma);
    registerOrderTools(this.registry, this.prisma);
    registerKbTools(this.registry, this.prisma);
    registerDeliveryTools(this.registry);
    registerEscalateTools(this.registry, this.prisma);
  }

  detectInputLanguage(text: string): DetectedLanguage {
    return detectLanguage(text);
  }

  async generate(
    workspaceId: string,
    contactId: string,
    userMessage: string,
    memory: MemoryContext,
    systemPromptOverride?: string | null,
  ): Promise<ReplyResult> {
    const start = Date.now();
    const language = detectLanguage(userMessage);
    const model = 'llama-3.3-70b-versatile';
    const groq = getGroqClient();

    const systemPrompt = systemPromptOverride ?? getSystemPrompt(language);
    const contextBlock = this.buildContextBlock(memory);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: `${systemPrompt}\n\n${contextBlock}` },
      ...memory.recentMessages,
      { role: 'user', content: userMessage },
    ];

    const toolCallsTrace: unknown[] = [];
    const productAttachments: ProductAttachment[] = [];
    const ctx = { workspaceId, contactId };
    let finalText = '';

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tool loop timeout')), TOOL_TIMEOUT_MS),
    );

    try {
      finalText = await Promise.race([
        this.runToolLoop(groq, model, messages, toolCallsTrace, productAttachments, ctx),
        timeoutPromise,
      ]);
    } catch (err) {
      this.logger.warn({ err, workspaceId }, 'AI reply fallback triggered');
      finalText =
        language === 'urdu'
          ? 'معذرت، ابھی جواب دینے میں دشواری ہو رہی ہے۔ تھوڑی دیر میں دوبارہ کوشش کریں۔'
          : language === 'roman_urdu'
            ? 'Maazrat, abhi jawab dene mein mushkil ho rahi hai. Thori der mein dobara koshish karen.'
            : 'Sorry, I am having trouble responding right now. Please try again shortly.';
    }

    return {
      text: finalText,
      detectedLanguage: language,
      toolCallsTrace,
      aiModel: model,
      latencyMs: Date.now() - start,
      productAttachments,
    };
  }

  async generateOrderConfirmation(
    orderNumber: string,
    totalCents: bigint,
    language: DetectedLanguage,
  ): Promise<string> {
    const template =
      ORDER_CONFIRMATION_TEMPLATES[language] ?? ORDER_CONFIRMATION_TEMPLATES.english;
    return template
      .replace('{orderNumber}', orderNumber)
      .replace('{total}', (Number(totalCents) / 100).toLocaleString('en-PK'));
  }

  private async runToolLoop(
    groq: Groq,
    model: string,
    messages: ChatCompletionMessageParam[],
    trace: unknown[],
    attachments: ProductAttachment[],
    ctx: { workspaceId: string; contactId: string },
  ): Promise<string> {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await groq.chat.completions.create({
        model,
        messages,
        tools: this.registry.getGroqTools(),
        tool_choice: 'auto',
        max_tokens: 800,
        temperature: 0.4,
      });

      const choice = response.choices[0];
      if (!choice) throw new Error('Empty response from Groq');

      if (!choice.message.tool_calls?.length) {
        return choice.message.content ?? '';
      }

      messages.push({
        role: 'assistant',
        content: choice.message.content ?? '',
        tool_calls: choice.message.tool_calls,
      });

      for (const call of choice.message.tool_calls) {
        let parsedArgs: unknown;
        try {
          parsedArgs = JSON.parse(call.function.arguments);
        } catch {
          parsedArgs = {};
        }
        const result = await this.registry.execute(call.function.name, parsedArgs, ctx);
        trace.push({ tool: call.function.name, args: parsedArgs, result });

        // Capture product images from search_products results for image-out
        if (call.function.name === 'search_products' && Array.isArray(result)) {
          for (const p of result as Array<{ imageUrl?: string; name?: string }>) {
            if (p.imageUrl && attachments.length < 3) {
              attachments.push({ imageUrl: p.imageUrl, productName: p.name ?? '' });
            }
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    const final = await groq.chat.completions.create({
      model,
      messages,
      max_tokens: 600,
      temperature: 0.4,
    });
    return final.choices[0]?.message.content ?? '';
  }

  private buildContextBlock(memory: MemoryContext): string {
    const parts: string[] = [];
    if (memory.customerFacts) parts.push(`## Customer facts:\n${memory.customerFacts}`);
    if (memory.recentOrders) parts.push(`## Recent orders:\n${memory.recentOrders}`);
    if (memory.kbContext) parts.push(`## Reference info (from knowledge base):\n${memory.kbContext}`);
    return parts.join('\n\n');
  }
}
