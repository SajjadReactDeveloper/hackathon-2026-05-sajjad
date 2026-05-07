import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { getOpenAIClient } from '../ai/openai.client';

interface RagChunk {
  id: string;
  content: string;
  documentId: string;
  similarity: number;
}

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(RagService.name) private readonly logger: PinoLogger,
  ) {}

  async embedText(text: string): Promise<number[]> {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0]?.embedding ?? [];
  }

  async retrieve(query: string, workspaceId: string, k = 3): Promise<string> {
    const embedding = await this.embedText(query);
    if (embedding.length === 0) return '';

    const vectorLiteral = `[${embedding.join(',')}]`;

    const chunks = await this.prisma.$queryRaw<RagChunk[]>`
      SELECT
        id,
        content,
        "documentId",
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM kb_chunks
      WHERE "workspaceId" = ${workspaceId}::uuid
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${k}
    `;

    if (chunks.length === 0) return '';

    this.logger.debug({ workspaceId, k: chunks.length, topSim: chunks[0]?.similarity }, 'RAG retrieved');

    return chunks.map((c) => c.content).join('\n\n---\n\n');
  }
}
