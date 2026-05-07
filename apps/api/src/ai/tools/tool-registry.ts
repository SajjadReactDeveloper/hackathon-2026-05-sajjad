import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

export interface WorkspaceContext {
  workspaceId: string;
  contactId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  // reason: zod v3.25 changed internal ZodType shape; structural duck-type bridges packages/types Zod v3.24 schemas
  schema: { parse: (data: unknown) => unknown };
  handler: (args: unknown, ctx: WorkspaceContext) => Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(def: ToolDefinition): void {
    this.tools.set(def.name, def);
  }

  getGroqTools(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        // reason: double-cast bridges Zod v3.24 schema (packages/types) with zod-to-json-schema peer on v3.25
        parameters: zodToJsonSchema(t.schema as unknown as Parameters<typeof zodToJsonSchema>[0], {
          target: 'openApi3',
        }) as Record<string, unknown>,
      },
    }));
  }

  async execute(name: string, args: unknown, ctx: WorkspaceContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) return { error: `Unknown tool: ${name}` };
    try {
      return await tool.handler(args, ctx);
    } catch (err) {
      return { error: String(err) };
    }
  }
}
