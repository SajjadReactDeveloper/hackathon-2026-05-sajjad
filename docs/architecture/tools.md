# docs/architecture/tools.md — LLM Tool Registry

The chatbot grounds every fact in real DB data via 8 typed tool calls. The LLM cannot hallucinate prices, stock, or order status — it has to invoke a function to get them.

## Where the code lives

- Tool schemas (Zod): `packages/types/src/tools.ts`
- Tool implementations: `apps/api/src/ai/tools/*.tools.ts`
- Registry: `apps/api/src/ai/tools/tool-registry.ts`

## Architecture

```
AIReplyService.generate
 → builds messages (system + memory + user turn)
 → ToolRegistry.getSchemas() → JSON-schema array (zod-to-json-schema)
 → Groq client.chat.completions.create({ messages, tools, tool_choice: 'auto' })
 → loop while response.tool_calls && iterations < 3:
     for call: ToolRegistry.execute(call.name, call.arguments, { workspaceId, contactId })
       → typed Zod validation on args
       → workspace context AUTO-INJECTED — LLM never passes workspaceId
       → result returned to model as tool_result message
     continue inference
 → break with final assistant message + toolCallsTrace
```

## The 8 tools

| Name | Purpose | Args (Zod) | Returns |
|---|---|---|---|
| `search_products` | Fuzzy match products by name / SKU for current workspace | `{ query: string, limit?: number = 5 }` | `[{ sku, name, priceCents, stock, imageUrl }]` |
| `get_product` | Full details for a specific SKU | `{ sku: string }` | `Product` |
| `check_stock` | Availability for a SKU | `{ sku: string }` | `{ available: boolean, count: number }` |
| `get_customer_orders` | Recent orders for the CURRENT contact (`contactId` auto-injected, never from LLM) | `{ limit?: number = 5 }` | `Order[]` |
| `get_order_status` | Order detail by order number | `{ orderNumber: string }` | `OrderDetail` |
| `search_knowledge_base` | RAG over uploaded docs (pgvector) | `{ query: string, k?: number = 3 }` | `[{ chunk, sourceDocName, score }]` |
| `get_delivery_info` | Delivery cost + ETA for a city | `{ city: string }` | `{ available, etaDays, costCents }` |
| `escalate_to_human` | Toggle `conversation.aiEnabled = false` so seller takes over | `{ reason: string }` | `{ ok: true }` |

## Hard rules

- **The LLM never passes `workspaceId` or `contactId`.** `ToolRegistry.execute` injects them from the calling context. Schemas omit these fields.
- **Tool args are Zod-validated.** Malformed calls fail fast with a typed error returned to the model so it can self-correct.
- **Tools are pure-ish read functions** except `escalate_to_human`. No tool creates orders, sends messages, or mutates auth state.
- **Tool descriptions matter for routing.** Use "USE THIS WHEN..." patterns in the description; the model routes on prose.
- **Tool execution timeout: 5s per call** (DB queries should be sub-second; pgvector retrieval may approach 2s on warm cache).

## Adding a new tool (4 steps)

1. Define Zod schema in `packages/types/src/tools.ts` (no `workspaceId` / `contactId` fields).
2. Implement handler in `apps/api/src/ai/tools/<domain>.tools.ts` accepting `(args, { workspaceId, contactId, prisma, logger })`.
3. Register in `tool-registry.ts` with name + description + handler.
4. Add a one-line example to the system prompt in `packages/ai/src/prompts.ts` so the model learns to invoke it.

## Tracing & debug

Every outbound `Message` row stores `toolCallsTrace` in metadata: array of `{ name, args, result, latencyMs }`. Visible in the Inbox detail view and in Sentry breadcrumbs. Use this to debug "why did the AI say price X" — the trace shows exactly which tool returned X.
