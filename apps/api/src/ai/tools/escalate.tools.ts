import type { PrismaService } from '../../prisma/prisma.service';
import type { ToolRegistry, WorkspaceContext } from './tool-registry';
import { EscalateToHumanArgsSchema } from '@repo/types';

export function registerEscalateTools(registry: ToolRegistry, prisma: PrismaService): void {
  registry.register({
    name: 'escalate_to_human',
    description: 'USE THIS WHEN: customer is angry, issue is complex, or requires a human decision. Marks the conversation for human review.',
    schema: EscalateToHumanArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { reason } = EscalateToHumanArgsSchema.parse(args);
      await prisma.conversation.updateMany({
        where: { workspaceId: ctx.workspaceId, contactId: ctx.contactId, status: 'open' },
        data: { aiEnabled: false },
      });
      return { escalated: true, reason, message: 'Conversation handed off to human agent' };
    },
  });
}
