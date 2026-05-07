import type { PrismaService } from '../../prisma/prisma.service';
import type { ToolRegistry, WorkspaceContext } from './tool-registry';
import { SearchKnowledgeBaseArgsSchema } from '@repo/types';
import { getOpenAIClient } from '../openai.client';

export function registerKbTools(registry: ToolRegistry, prisma: PrismaService): void {
  registry.register({
    name: 'search_knowledge_base',
    description: 'USE THIS WHEN: customer asks about return policy, warranty, delivery times, sizing, FAQs, or anything business-specific that might be in uploaded documents.',
    schema: SearchKnowledgeBaseArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { query } = SearchKnowledgeBaseArgsSchema.parse(args);

      let embedding: number[];
      try {
        const openai = getOpenAIClient();
        const res = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        embedding = res.data[0].embedding;
      } catch {
        return { error: 'Knowledge base search unavailable' };
      }

      const results = await prisma.$queryRaw<Array<{ content: string; similarity: number }>>`
        SELECT content, 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
        FROM kb_chunks
        WHERE "workspaceId" = ${ctx.workspaceId}::uuid
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
        LIMIT 3
      `;

      if (!results.length) return { found: false, message: 'No relevant documents found' };
      return { found: true, chunks: results.map((r) => ({ text: r.content, relevance: r.similarity })) };
    },
  });
}
