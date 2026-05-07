import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { RagService } from './rag.service';
import { NotFoundError } from '../common/errors';
import { env } from '../common/env';
import { randomUUID } from 'crypto';

// reason: pdf-parse has no official ESM types; require is correct for CJS interop
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

@Injectable()
export class KbService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly rag: RagService,
    @InjectPinoLogger(KbService.name) private readonly logger: PinoLogger,
  ) {}

  async uploadDocument(workspaceId: string, buffer: Buffer, originalName: string): Promise<{ id: string; name: string }> {
    const path = `${workspaceId}/${randomUUID()}-${originalName}`;
    const storageUrl = await this.storage.upload(env.SUPABASE_STORAGE_BUCKET_KB, path, buffer, 'application/pdf');

    const doc = await this.prisma.kbDocument.create({
      data: {
        workspaceId,
        name: originalName,
        sourceUrl: storageUrl,
        status: 'processing',
      },
    });

    this.logger.info({ workspaceId, docId: doc.id, name: originalName }, 'KB document created, processing...');

    this.processDocument(doc.id, workspaceId, buffer).catch((err) => {
      this.logger.error({ err, docId: doc.id }, 'KB document processing failed');
      void this.prisma.kbDocument.update({
        where: { id: doc.id },
        data: { status: 'failed' },
      });
    });

    return { id: doc.id, name: originalName };
  }

  private async processDocument(docId: string, workspaceId: string, buffer: Buffer): Promise<void> {
    const parsed = await pdfParse(buffer);
    const chunks = this.chunkText(parsed.text);

    await this.prisma.kbDocument.update({
      where: { id: docId },
      data: { pageCount: parsed.numpages },
    });

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.rag.embedText(chunks[i] ?? '');
      const vectorLiteral = `[${embedding.join(',')}]`;

      await this.prisma.$executeRaw`
        INSERT INTO kb_chunks (id, "workspaceId", "documentId", "chunkIndex", content, embedding, "createdAt")
        VALUES (
          ${randomUUID()}::uuid,
          ${workspaceId}::uuid,
          ${docId}::uuid,
          ${i},
          ${chunks[i]},
          ${vectorLiteral}::vector,
          NOW()
        )
      `;
    }

    await this.prisma.kbDocument.update({
      where: { id: docId },
      data: { status: 'ready' },
    });

    this.logger.info({ docId, chunks: chunks.length }, 'KB document processed');
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 50) chunks.push(chunk);
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
  }

  async list(workspaceId: string) {
    return this.prisma.kbDocument.findMany({
      where: { workspaceId },
      select: { id: true, name: true, status: true, pageCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    const deleted = await this.prisma.kbDocument.deleteMany({
      where: { id, workspaceId },
    });
    if (deleted.count === 0) throw new NotFoundError('KbDocument', id);
  }
}
