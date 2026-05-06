# docs/architecture/data-model.md — Entity Relationships

Source of truth: `packages/db/prisma/schema.prisma`. This doc explains the relationships and index strategy.

## Multi-tenant boundary

Every domain table has `workspaceId` + `@@index([workspaceId])`. Cascade-delete on Workspace removal. RLS policy joins `auth.uid() → workspace_members → workspaces.id` for cross-workspace isolation on Realtime (see `realtime.md`).

## Core entities

| Model | Purpose |
|---|---|
| `Workspace` | Tenant root. Stores Meta credentials (encrypted), AI config, voice clone status. |
| `User` / `WorkspaceMember` | Supabase user → Workspace via composite PK. |
| `Contact` | WhatsApp contact (1 per workspace + phone). LTV + tags + last-seen. |
| `ContactFact` | Extracted memory facts per contact (name, address, size, payment method, allergies). |
| `Conversation` | One thread per contact. Status, AI enabled flag, lost-sale columns. |
| `Message` | Every inbound/outbound. Idempotent on `waMessageId`. Has `detectedLanguage`, `aiGenerated`, `transcription`, `rawPayload`, `toolCallsTrace`. |
| `Order` / `OrderItem` | Created from voice / image / manual. Has `fraudScore` + `fraudSignals`. Per-workspace counter for `orderNumber`. |
| `Product` | sku + name + priceCents + imageUrl. Image used in AI replies. |
| `KbDocument` / `KbChunk` | Uploaded PDFs chunked + embedded into pgvector. |
| `AutoRule` | Regex matcher + action template; runs before AI in pipeline. |
| `Flow` | JSON graph for canvas (CRUD-only — no exec engine). |
| `AIConfig` (1:1 Workspace) | System prompt override, model, TTS provider/voice, business hours. |
| `AuditEvent` | Action log. |

## Index strategy

- Every tenant table: `@@index([workspaceId])`
- Hot lookups: `Message(conversationId, createdAt desc)`, `Conversation(workspaceId, status, lastMessageAt desc)`, `Contact(workspaceId, lastSeenAt desc)`
- Idempotency uniques: `Message.waMessageId`, `Order(workspaceId, orderNumber)`, `Contact(workspaceId, waPhone)`, `Product(workspaceId, sku)`
- pgvector: `KbChunk.embedding` with ivfflat (`lists=100`)

## Postgres views (analytics)

Read via `$queryRaw` only inside `AnalyticsService`:

- `v_daily_revenue` — workspace_id, day, revenue_cents, order_count
- `v_message_volume` — workspace_id, day, inbound_count, outbound_count, ai_count
- `v_top_contacts` — workspace_id, contact_id, message_count, ltv_cents
- `v_message_heatmap` — workspace_id, hour_of_day (0–23), day_of_week (0–6), count

## TBD on Day 1

- ER diagram (Mermaid)
- Sample seed data structure
- Migration history list
