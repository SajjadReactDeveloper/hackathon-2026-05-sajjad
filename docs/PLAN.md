# WhatsApp Business Assistant — Hackathon Build Plan (rev 3, final)

## Context

ChainGPT internal Claude Code hackathon. Solo dev (Sajjad). **Setup day today (Tue May 6, 2026). Build days Thu May 7 → Sat May 9. Demo Mon May 11. Winners Fri May 15.**

We're building **FlowChat** — a WhatsApp Business platform for Pakistani SMB e-commerce sellers — that turns the chaos of WhatsApp orders into a real business cockpit (the in-app dashboard is branded "Revenue Brain"). Eight differentiators do the work:

1. **Language-mirrored AI replies.** Urdu → Urdu. English → English. Roman Urdu → Roman Urdu. **Voice → voice.**
2. **Three-layer memory.** Short-term (last 20 msgs), customer-facts (extracted async), KB / RAG (PDF upload → pgvector retrieval).
3. **Voice-note → Order.** Whisper STT → Groq structured parse → real order row + audio confirmation reply.
4. **Image-note → Order.** Customer photo → GPT-4o-mini Vision → structured items → order.
5. **Voice cloning.** ElevenLabs clones the seller's voice; AI replies in *their* Urdu, not a generic TTS voice.
6. **COD fraud scoring** + **Revenue Brain dashboard** (tiles, charts, heatmap) backed by SQL views.
7. **"Why Lost Sale?" AI.** Detects stale conversations with buying intent and no order, runs Groq over the thread, returns a structured reason + recovery suggestion. Dashboard tile + dedicated page.
8. **Tool-calling AI** — the LLM cannot hallucinate facts. When the customer asks about price/stock/order/policy, the model calls a typed function (`search_products`, `check_stock`, `get_customer_orders`, `search_knowledge_base`, …) that queries our DB or RAG, and grounds the reply in the result. This is what makes the chatbot "demo-perfect" on tested paths — it structurally cannot make up data.

Plus **Auto Rules** (regex matcher running before AI in the pipeline) and a **Flow Builder** canvas (visual, demo-credible — execution engine is P3 future work).

Repo: <https://github.com/sajjad-chaingpt/whatsapp-business-assistant>. Greenfield.

### Why this plan is shaped this way

The hackathon scoring rubric is non-symmetric. **§9 "Effective use of Claude Code" is 25%** (the biggest weight and the first tie-breaker). **§2 Functionality (15%)** is the second tie-breaker — judges *will* try to break the app on a fresh account. There is a **−25 percentage-point penalty** for missing `CLAUDE.md` (committed before any code) or `PROMPTS.md` (top 5 worked + bottom 3 failed) by EOD May 9.

Therefore:
- **One golden path that works flawlessly** > many half-finished features. Our golden path is the language-mirrored, memory-aware, voice/image-in voice-out demo.
- **Discipline artifacts** (`CLAUDE.md` / `SPEC.md` / `PROMPTS.md` / `.claude/skills/`) are first-class deliverables, not afterthoughts.
- Web only. Mobile (Expo) is dropped.
- **Polish window shrinks 6h → 1.5h** as the cost of the expanded feature set. We accept this trade and protect the demo path: the polish hours go to demo-path edge cases only (Inbox, Orders, Dashboard, Settings/AI). Stub pages (Contacts, Products, Broadcasts, KB list, Flow Builder canvas) get visible-but-shallow treatment.

## Locked Decisions (rev 3)

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Two apps share Prisma client + Zod schemas + AI prompts |
| Frontend | **Next.js 15 App Router (TS strict) on Vercel** | User's stack |
| Backend | **NestJS on Render Starter ($7/mo, no sleep)** | Rev-2 decision; cold-start risk eliminates the free tier for demo timing |
| UI | shadcn/ui + Tailwind + Recharts + React-Flow | shadcn for primitives, Recharts for charts/heatmap, React-Flow for Flow Builder canvas |
| DB | Supabase Postgres + **pgvector extension** | RAG embeddings live in the same DB as the rest |
| **Realtime** | **Supabase Realtime** (browser client subscribes to `messages` + `conversations` row changes) | Inbox/threads update sub-second without polling. Writes still go through NestJS. |
| **RLS** | **Enabled on `messages`, `conversations`, `contacts`, `orders`** — `auth.uid()` → workspace_members → workspace match | Required by Realtime auth; also a defense-in-depth layer over service-layer enforcement |
| ORM | **Prisma** | Schema in `packages/db/prisma/schema.prisma`; client shared via `packages/db` |
| Auth | Supabase Auth on web (Google + email/password); NestJS verifies Supabase JWT via guard | Single source of identity |
| WhatsApp | Real Meta WhatsApp Cloud API. Webhook on **NestJS** (Render — no 60s timeout) |
| Chat LLM | Groq — Llama 3.3 70B Versatile (with **tool calling** enabled) | Strong Urdu/Roman Urdu; supports OpenAI-compatible function calling |
| **Tool registry** | `ToolRegistry` in `apps/api/src/ai/tools/` — 8 tools (products / orders / KB / delivery / escalate). Schemas in `packages/types/src/tools.ts` (Zod → JSON-schema via `zod-to-json-schema`). Workspace context auto-injected; LLM never passes `workspaceId`. | Grounds replies in real DB data; structurally prevents fact hallucination |
| **Meta token storage** | `Workspace.accessTokenEnc` AES-256-GCM encrypted at rest with `WHATSAPP_TOKEN_ENC_KEY` env (32 bytes). Helper in `apps/api/src/common/crypto.ts`. | Multi-tenant, can't leak even if DB dump leaks |
| Voice STT | OpenAI Whisper (`whisper-1`) | User has paid keys |
| Voice TTS — default | OpenAI TTS (`tts-1`, voice `alloy`/`nova`) | User has paid keys |
| Voice TTS — cloned | **ElevenLabs Multilingual v2** (when seller has uploaded a clone sample) | Best Urdu cloned-voice quality |
| Vision LLM | **OpenAI GPT-4o-mini** | For image-to-order; better quality than free vision options |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) | For RAG over uploaded docs |
| PDF parse | `pdf-parse` (Node) | Real document upload path |
| Validation | Zod | Every API boundary; shared schemas via `packages/types` |
| Logger | `pino` (web), `nestjs-pino` (api) — structured JSON | No `console.log` |
| Observability | Sentry (web + api with source maps) + PostHog (web) | Rubric §8 calls these out |
| CI/CD | GitHub Actions (turbo cache) + Vercel auto-deploy + Render auto-deploy | Push `main` → both deploys |

**Default model: Sonnet.** Opus only for plan-mode/architecture or after Sonnet fails twice. **$75/day soft cap, $100/day hard cap.** Extended thinking ≤ 5,000 tokens.

## Architecture

### Service shape

```
┌─────────────────┐  Supabase JWT   ┌───────────────────┐  Prisma  ┌─────────────┐
│  Next.js (Web)  │ ──────────────▶ │  NestJS (API)     │ ───────▶ │  Postgres   │
│  Vercel         │                 │  Render Starter   │          │  + pgvector │
└─────────────────┘                 └───────────────────┘          │  Supabase   │
                                            ▲                       └─────────────┘
                                  Meta WA   │                              ▲
                              webhook POST  │                              │
                                            │                       Storage (TTS, PDFs, product imgs)
                                     ┌──────┴──────┐
                                     │ Meta Cloud  │
                                     │   API       │
                                     └─────────────┘
                                            │
                              External: Groq, OpenAI, ElevenLabs
```

Web is dumb (Server/Client components → `lib/api-client.ts` attaches Supabase JWT). NestJS owns *all* business logic: auth guard verifies JWT, controllers parse with Zod, services do the work, Prisma talks to DB. Routes never query DB directly.

### Folder layout (monorepo)

```
whatsapp-business-assistant/
├── CLAUDE.md                          # Day 0 — commit FIRST, alone
├── SPEC.md                            # Locked decisions, scope, P1/P2/P3
├── PROMPTS.md                         # Top 5 worked + bottom 3 failed (live doc)
├── README.md
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example                       # WEB ONLY / API ONLY / BOTH comments
├── .github/workflows/ci.yml
├── .claude/skills/
│   ├── add-service/SKILL.md           # NestJS module + controller + service + tests
│   ├── add-prisma-model/SKILL.md      # model + migrate + regen
│   └── wire-tile/SKILL.md             # E2E: API endpoint → web tile + chart + PostHog
├── packages/
│   ├── db/
│   │   ├── prisma/{schema.prisma,migrations,seed.ts}
│   │   ├── src/index.ts               # prisma singleton + generated types
│   │   └── package.json
│   ├── types/
│   │   ├── src/{api-contracts,whatsapp,ai,index}.ts
│   │   └── package.json
│   ├── ai/
│   │   ├── src/{prompts,language-detect,index}.ts
│   │   └── package.json
│   └── tsconfig/{base,nextjs,nestjs}.json
└── apps/
    ├── web/                                 # Next.js 15 → Vercel
    │   ├── src/
    │   │   ├── app/
    │   │   │   ├── (marketing)/page.tsx
    │   │   │   ├── (auth)/{login,signup}/page.tsx + callback/route.ts
    │   │   │   └── (app)/
    │   │   │       ├── layout.tsx                 # sidebar, auth guard
    │   │   │       ├── onboarding/page.tsx
    │   │   │       ├── dashboard/page.tsx         # tiles + charts + heatmap (REAL)
    │   │   │       ├── inbox/{page,[id]}/page.tsx
    │   │   │       ├── orders/{page,[id]}/page.tsx
    │   │   │       ├── contacts/page.tsx          # stub w/ seeded
    │   │   │       ├── products/{page,new}/page.tsx  # add real, with image upload
    │   │   │       ├── broadcasts/page.tsx        # stub
    │   │   │       ├── knowledge-base/page.tsx    # REAL — PDF upload + list
    │   │   │       ├── flows/page.tsx             # React-Flow canvas, seeded flows
    │   │   │       ├── rules/page.tsx             # REAL rules table
    │   │   │       ├── analytics/page.tsx         # stub
    │   │   │       ├── lost-sales/page.tsx        # REAL — list + reasons + recover
    │   │   │       └── settings/{business,ai,whatsapp,voice}/page.tsx  # voice tab REAL (clone upload)
    │   │   ├── components/{ui,inbox,dashboard,orders,shell,heatmap,flows,kb}/
    │   │   ├── lib/
    │   │   │   ├── env.ts
    │   │   │   ├── api-client.ts                  # JWT-attaching fetch wrapper
    │   │   │   ├── supabase/{server,browser,middleware}.ts
    │   │   │   ├── auth.ts
    │   │   │   ├── analytics/posthog.ts
    │   │   │   └── logger.ts
    │   │   └── middleware.ts                      # session refresh + route guards
    │   └── (next.config.ts, package.json, tsconfig.json)
    └── api/                                       # NestJS → Render
        ├── src/
        │   ├── main.ts                            # CORS allowlist, helmet, raw-body for webhook
        │   ├── app.module.ts
        │   ├── common/
        │   │   ├── auth/{supabase-auth.guard,workspace.guard,current-user.decorator}.ts
        │   │   ├── filters/all-exceptions.filter.ts
        │   │   ├── interceptors/logging.interceptor.ts
        │   │   ├── pipes/zod-validation.pipe.ts
        │   │   ├── errors.ts
        │   │   ├── env.ts                         # Zod-parsed; fails fast
        │   │   └── logger.ts                      # nestjs-pino
        │   ├── prisma/prisma.service.ts
        │   ├── workspaces/{controller,service,module}.ts
        │   ├── contacts/{controller,service,module}.ts
        │   ├── conversations/{controller,service,module}.ts
        │   ├── messages/{controller,service,module}.ts
        │   ├── orders/{controller,service,module}.ts
        │   ├── products/{controller,service,module}.ts          # incl. image upload to Storage
        │   ├── analytics/{controller,service,module}.ts          # incl. heatmap query
        │   ├── rules/{controller,service,module}.ts              # REAL: CRUD + matcher used by pipeline
        │   ├── flows/{controller,service,module}.ts              # CRUD only — no exec engine
        │   ├── lost-sales/{controller,service,module}.ts          # detectStale + analyzeReason + recover
        │   ├── kb/                                                # REAL RAG
        │   │   ├── kb.controller.ts                               # POST /kb/upload (PDF), GET /kb
        │   │   ├── kb.service.ts                                  # parse + chunk + embed + persist
        │   │   ├── rag.service.ts                                 # similarity search; injected into AI prompt
        │   │   └── kb.module.ts
        │   ├── memory/
        │   │   ├── contact-facts.service.ts                       # extract + upsert facts (async)
        │   │   ├── memory.service.ts                              # composes layers for AI
        │   │   └── memory.module.ts
        │   ├── ai/
        │   │   ├── ai-reply.service.ts                            # ★ language detect + tool-calling loop + reply
        │   │   ├── tools/
        │   │   │   ├── tool-registry.ts                           # name → handler map, workspace context injection
        │   │   │   ├── product.tools.ts                           # search_products, get_product, check_stock
        │   │   │   ├── order.tools.ts                             # get_customer_orders, get_order_status
        │   │   │   ├── kb.tools.ts                                # search_knowledge_base
        │   │   │   ├── delivery.tools.ts                          # get_delivery_info
        │   │   │   └── escalate.tools.ts                          # escalate_to_human
        │   │   ├── voice-parser.service.ts                        # ★ Whisper + Groq parse
        │   │   ├── voice-reply.service.ts                         # ★ TTS path (OpenAI default, ElevenLabs if clone)
        │   │   ├── image-order.service.ts                         # ★ Vision LLM → structured order
        │   │   ├── voice-clone.service.ts                         # ★ ElevenLabs clone create + lookup
        │   │   ├── fraud-score.service.ts                         # rules-based COD scorer
        │   │   ├── lost-sale.service.ts                           # detection + reason extraction
        │   │   ├── groq.client.ts
        │   │   ├── openai.client.ts
        │   │   ├── elevenlabs.client.ts
        │   │   └── ai.module.ts
        │   ├── whatsapp/
        │   │   ├── webhook.controller.ts                          # GET verify + POST receive
        │   │   ├── whatsapp.service.ts                            # Meta: sendText, sendAudio, sendImage, downloadMedia
        │   │   ├── verify.ts                                      # signature HMAC-SHA256 raw body
        │   │   ├── pipeline.service.ts                            # ★ orchestrator (the demo's brain)
        │   │   └── whatsapp.module.ts
        │   └── storage/supabase-storage.service.ts                # signed URLs, uploads
        ├── test/{webhook,voice-to-order,image-to-order,rule-engine}.e2e-spec.ts
        ├── render.yaml
        ├── nest-cli.json
        └── (package.json, tsconfig.json)
```

### Database schema (Prisma)

All tenant-scoped models include `workspaceId String @db.Uuid` + relation + `@@index([workspaceId])`. All have `id String @id @default(uuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. Tables map to `snake_case` plural via `@@map`.

Models:
- **Workspace** — name, phoneNumberId, wabaId, timezone='Asia/Karachi', locale='ur-PK', onboardingCompleted, accessTokenEnc (encrypted Meta long-lived token), voiceCloneStatus enum('none'|'training'|'ready'), voiceCloneId? (ElevenLabs voice id)
- **User** — supabaseUserId @unique, email, fullName
- **WorkspaceMember** — composite PK (workspaceId, userId), role enum
- **Contact** — waPhone, displayName, profileName, tags String[], lastSeenAt, lifetimeValueCents BigInt, orderCount. Unique(workspaceId, waPhone)
- **ContactFact** — contactId (cascade), factType enum('name'|'address'|'preference'|'size'|'allergy'|'payment_method'|'other'), value, confidence float, sourceMessageId. Index (contactId, factType). **NEW**
- **Conversation** — contactId, status enum, assignedUserId, lastMessageAt, lastMessagePreview, unreadCount, aiEnabled, **lostSaleStatus enum('not_lost'|'pending_analysis'|'analyzed'|'recovered') default 'not_lost'**, **lostSaleReason text?**, **lostSaleSuggestion text?**, **lostSaleAnalyzedAt timestamp?** (lost-sale columns NEW)
- **Message** — conversationId, contactId, direction enum, waMessageId @unique, type enum, textBody, mediaUrl, mediaMimeType, transcription, detectedLanguage enum('urdu'|'english'|'roman_urdu'|'unknown'), aiGenerated, aiModel, aiLatencyMs, status enum, error, rawPayload Json
- **Order** — contactId, conversationId, sourceMessageId, orderNumber (per-workspace counter), status enum, totalCents BigInt, currency='PKR', deliveryAddress, notes, createdVia enum('manual'|'voice_note'|'image'|'ai_parser'|'flow'), **fraudScore Int (0-100)**, **fraudSignals Json**. Unique(workspaceId, orderNumber). **fraud columns NEW**
- **OrderItem** — orderId (cascade), productId?, name, quantity, unitPriceCents BigInt, lineTotalCents BigInt
- **Product** — sku, name, description, **imageUrl**, priceCents BigInt, stock, active. Unique(workspaceId, sku). **imageUrl emphasized — used for image-out**
- **KbDocument** — name, sourceUrl (Supabase Storage), pageCount, status enum('processing'|'ready'|'failed'). **NEW**
- **KbChunk** — documentId (cascade), chunkIndex, content (text), embedding `Unsupported("vector(1536)")`. Index on (workspaceId), pgvector ivfflat index on embedding. **NEW**
- **AutoRule** — name, triggerPattern (regex), matchScope enum('text'|'transcription'|'any'), replyTemplate, action enum('send_text'|'tag_contact'|'skip_ai'), enabled, priority Int. **NEW (real)**
- **Flow** — name, description, graph Json (nodes + edges from React-Flow), isActive. **NEW (CRUD only)**
- **AIConfig** (1:1) — systemPromptOverride?, model='llama-3.3-70b-versatile', autoReplyEnabled, businessHours Json, ttsEnabled, ttsProvider enum('openai'|'elevenlabs'), ttsVoice='alloy'
- **AuditEvent** — userId?, action, entityType, entityId, metadata Json

**Postgres views** (raw SQL migration; only services consume via Prisma `$queryRaw`):
- `v_daily_revenue` (workspace_id, day, revenue_cents, order_count)
- `v_message_volume` (workspace_id, day, inbound_count, outbound_count, ai_count)
- `v_top_contacts` (workspace_id, contact_id, message_count, ltv_cents)
- `v_message_heatmap` (workspace_id, hour_of_day 0-23, day_of_week 0-6, count) — **NEW for Heatmap**

### Service responsibilities (NestJS)

| Service | Owns |
|---|---|
| `WorkspacesService` | create, getForUser, completeOnboarding, updateAIConfig, updateBusinessInfo |
| `WhatsAppService` | sendText, sendAudio, sendImage, sendTemplate, downloadMedia (bearer auth), verifyWebhookSignature, parseWebhookEvent |
| `MessagesService` | recordInbound (idempotent on waMessageId), recordOutbound, markStatus, listForConversation |
| `ConversationsService` | getOrCreateForContact, list, get, markRead, toggleAI |
| `ContactsService` | getOrCreateByPhone, list, get, getCustomer360 (joins orders + facts + msg counts + LTV) |
| `ContactFactsService` | extractFromConversation (async after AI reply — Groq returns JSON facts), upsert |
| `MemoryService` | composeForReply(conversationId) → returns `{recentMessages, customerFacts, kbContext, recentOrders}` for AI prompt |
| `KbService` | uploadDocument (PDF → Storage → parse → chunk → embed → persist), list, delete |
| `RagService` | retrieve(query, workspaceId, k=3) → vector similarity search via `$queryRaw` |
| `AIReplyService` | **detectInputLanguage**, **generate(conversationId, opts)** — composes memory, picks per-language system prompt, **runs tool-calling loop with `ToolRegistry` (max 3 iterations, hard timeout 15s)**, returns `{text, attachments?: [{productId, type:'image'}], toolCallsTrace}` |
| `ToolRegistry` | `register(toolDef)`, `getSchemas()` (for Groq), `execute(name, args, workspaceContext)` — runs the matching service method, wraps errors as Zod-typed tool responses, NEVER lets LLM pass `workspaceId` |
| `VoiceParserService` | transcribe (Whisper), parseToOrder (Groq structured output, Zod) |
| `VoiceReplyService` | synthesize(text, language, workspaceId) — if Roman Urdu, transliterate via Groq; if `voiceCloneStatus='ready'`, ElevenLabs; else OpenAI TTS. Upload Storage. Returns signed URL. |
| `ImageOrderService` | parseImageToOrder(imageUrl) — GPT-4o-mini Vision with Zod schema |
| `VoiceCloneService` | createClone(audioSampleUrl) → ElevenLabs API → save voiceCloneId, set status='ready' |
| `FraudScoreService` | scoreOrder(order, contact) → returns `{score: 0-100, signals: string[]}`. Rules: new contact +30, value > 5000 PKR +20, vague address +20, multiple orders 24h +15, baseline COD +0 |
| `LostSaleService` | `detectStale(workspaceId)` → finds conversations matching: lastMessageAt > 3 days ago + product/price intent in thread + no order ever. Marks `lostSaleStatus='pending_analysis'`. `analyzeReason(conversationId)` → Groq reads the thread, returns `{reason: string, suggestion: string}` validated by Zod, persists. `recover(conversationId)` → marks status='recovered' (manual flag) |
| `RuleEngineService` | match(workspaceId, message) → first matching rule (by priority). If matches `skip_ai`, fire its template; pipeline skips AI |
| `FlowService` | CRUD on flows (graph JSON only — no execution engine, P3) |
| `OrdersService` | createFromVoiceParse, createFromImageParse, list, get, updateStatus. Calls FraudScoreService on create. |
| `AnalyticsService` | getDashboardTiles, getDailyRevenue, getMessageVolume, getHeatmap. Reads only views, in-memory 60s cache |
| `WhatsAppPipelineService` | The conductor. **The demo's brain.** |

### Pipeline flow (the spine of the demo)

```
Meta POST /webhooks/whatsapp
  → verify signature (raw body)
  → MessagesService.recordInbound (idempotent)
  → resolve contact + conversation
  
  → RuleEngineService.match(message)
     if matched && action='skip_ai':
       → fire rule template (sendText)
       → MessagesService.recordOutbound
       → STOP
  
  → AIReplyService.detectInputLanguage(message) → urdu | english | roman_urdu | voice
  
  branch on message.type:
  
    'audio':
      → VoiceParserService.transcribe(media)
      → VoiceParserService.parseToOrder(transcript)
      → OrdersService.createFromVoiceParse(parsed)  // FraudScoreService runs inside
      → AIReplyService.generateOrderConfirmation(order, lang)
      → VoiceReplyService.synthesize(replyText, lang, workspaceId)
      → WhatsAppService.sendAudio(to, signedUrl)
      → MessagesService.recordOutbound
    
    'image':
      → ImageOrderService.parseImageToOrder(media)
      → OrdersService.createFromImageParse(parsed)
      → AIReplyService.generateOrderConfirmation(order, lang)
      → WhatsAppService.sendText(to, replyText)
      → MessagesService.recordOutbound
    
    'text' (with autoReplyEnabled && businessHoursOk):
      → MemoryService.composeForReply(conversationId) → {recent, facts, lastOrders}  // KB now via tool, not always-injected
      → AIReplyService.generate(conversationId, replyLanguage=detected, memory)
        ↳ Loop (max 3 iterations):
            Groq inference with system prompt + memory + tool schemas
            if response.tool_calls:
              for each call: ToolRegistry.execute(name, args, {workspaceId, contactId})
              append tool results to messages
              continue loop
            else:
              break with final text reply (+ attachments if any)
      → if reply has product attachments:
           → WhatsAppService.sendImage(to, productImageUrl, captionText)
        else:
           → WhatsAppService.sendText(to, replyText)
      → MessagesService.recordOutbound (incl. toolCallsTrace in metadata for debugging)
      → ContactFactsService.extractFromConversation (fire-and-forget)
```

## Day-by-day Execution Timeline (rev 3, final)

### Day 0 — Tue May 6 (today, ~5 hrs setup)

1. Monorepo bootstrap: `pnpm init -w`, `pnpm-workspace.yaml`, `turbo.json`, root `package.json` scripts.
2. Scaffold `apps/web` (`create-next-app@latest`, TS strict, Tailwind, App Router) and `apps/api` (`nest new`).
3. Scaffold `packages/{db,types,ai,tsconfig}`. `pnpm dlx prisma init` inside `packages/db`.
4. Write **`CLAUDE.md`** end-to-end: monorepo layout, conventions, never-dos, service-layer rule, schema rules, file paths to load-bearing files, demo-day reference, "no SQL strings outside `$queryRaw` inside services," env handling, two-strikes rule, the pipeline flow.
5. Write **`SPEC.md`**: locked decisions (rev 3), full P1/P2/P3 scope, demo script, success metrics.
6. Initialize **`PROMPTS.md`** with the empty template.
7. **Single first commit** containing only `CLAUDE.md` + `SPEC.md` + `PROMPTS.md`. Push. Verify `git log --reverse | head -1` shows it.
8. Provision: Supabase project (enable pgvector extension), Render Starter ($7/mo), Vercel project (link `apps/web`), Sentry projects (web + api), PostHog. ElevenLabs account (free tier OK for dev; verify Urdu support). Collect every env into `.env.example` with `# WEB ONLY` / `# API ONLY` / `# BOTH` comments.
9. Write skills: `.claude/skills/add-service/SKILL.md` (NestJS module template) + `.claude/skills/add-prisma-model/SKILL.md`.
10. CI: `.github/workflows/ci.yml` with turbo cache → typecheck/test/build both apps.

### Day 1 — Thu May 7 (foundation, ~10 hrs)

- `packages/db`: full Prisma schema (all 17 models), first migration (incl. raw SQL for views + pgvector + ivfflat index on `kb_chunks.embedding` + **RLS policies on `messages`, `conversations`, `contacts`, `orders` + `ALTER PUBLICATION supabase_realtime ADD TABLE messages, conversations;`**), `seed.ts`, generate client.
- `apps/api`: bootstrap NestJS — env, logger, errors, `AllExceptionsFilter`, `ZodValidationPipe`, `SupabaseAuthGuard`, `WorkspaceGuard`, `PrismaService`.
- `apps/api`: `WorkspacesController` (POST `/workspaces`, GET `/workspaces/me`).
- `apps/api`: WhatsApp webhook controller — GET verify + POST receive. **Raw-body middleware MUST run before JSON parser for the webhook route only.**
- `apps/api`: `WhatsAppService.{sendText, sendAudio, sendImage, downloadMedia}` and verify each from a script.
- Deploy `apps/api` to Render → point Meta webhook at `https://<render-url>/webhooks/whatsapp`.
- `apps/web`: Supabase Auth (Google + email/password), middleware route guard with `@supabase/ssr`, `lib/api-client.ts` that attaches the JWT.
- `apps/web`: Onboarding page → POST `/workspaces`.
- `apps/web`: App shell with sidebar + every route scaffolded (incl. Flows, Rules, KB, Voice settings).
- Sentry initialized in both apps (with source maps in CI).
- **EOD acceptance:** real WA message → Render webhook 200 → row in DB; auth flow works on Vercel preview; web → API call returns workspace.

### Day 2 — Fri May 8 (the magic, ~17 hrs — brutal day)

**Morning block (5h):**
- Inbox UI: conversation list + thread (`apps/web`). **Initial fetch via NestJS API; subsequent updates via Supabase Realtime subscriptions on `messages` (filtered by `conversation_id`) and `conversations` (filtered by `workspace_id`).** Append-on-insert + upsert-on-update reconciliation in React state. No polling.
- Composer with Send → POST `/messages/send` → `WhatsAppService.sendText` → `MessagesService.recordOutbound`.
- `AIReplyService`: `detectInputLanguage` heuristic (Urdu unicode range `؀-ۿ` → urdu; common Roman Urdu tokens → roman_urdu; else english).
- Per-language system prompts in `packages/ai/prompts.ts` (3-shot each).

**Mid-day block (8h — was 6h, +2h for tool calling):**
- `MemoryService.composeForReply` (recent 20 + facts + last 5 orders). KB moves to a tool, not always-injected.
- `ContactFactsService.extractFromConversation` (async after each AI reply: Groq prompt asks for JSON facts).
- **`ToolRegistry` + 8 tool definitions** in `apps/api/src/ai/tools/`. Zod schemas in `packages/types/src/tools.ts`. JSON-schema generation via `zod-to-json-schema`. Each tool calls an existing service method with workspace context auto-injected.
- **`AIReplyService.generate` becomes a tool-calling loop** (max 3 iterations, 15s hard timeout). Persist `toolCallsTrace` on the outbound message for debugging + demo proof.
- `RuleEngineService` + `RulesController`. Pipeline calls it BEFORE AI.
- `FraudScoreService` (rules-based 0-100 score + signals array).
- Auto-reply pipeline wired end-to-end (`WhatsAppPipelineService.handleText`).

**Afternoon block (6h):**
- `VoiceParserService`: `downloadMedia` (Meta bearer auth) → Whisper → Groq structured parse with Zod.
- `OrdersService.createFromVoiceParse` + `createFromImageParse` + Orders pages (table + detail with fraud badge).
- `VoiceReplyService` (the new piece):
  - If reply language is `roman_urdu`, ask Groq to transliterate to Urdu script in same call.
  - OpenAI TTS (`tts-1`, voice `alloy`) → mp3 buffer.
  - Upload to Supabase Storage bucket `tts/` → signed URL valid 7 days.
  - `WhatsAppService.sendAudio(to, signedUrl)` via Meta Graph (`type=audio`, `audio.link`).
- `ImageOrderService` (GPT-4o-mini Vision + Zod schema). Wire into pipeline for `type=image`.
- Product image-out: `AIReplyService` returns `attachments` array; pipeline calls `WhatsAppService.sendImage(productImageUrl, caption)`.
- `AnalyticsService.{getDashboardTiles,getDailyRevenue,getMessageVolume,getHeatmap}` + Dashboard tiles + 2 Recharts charts + **Heatmap component** (real).
- `LostSaleService` (~1.5h): detection heuristic + Groq `analyzeReason` prompt + `lost-sales` controller + Zod schema. **No UI yet — Day 3.**

- **EOD demo dry-run:**
  - Send Urdu text → Urdu text reply, with memory ("Salaam Ahmad bhai, aap ki last order DHA bhej di thi")
  - Send English text → English reply
  - Send Roman Urdu voice note → mp3 audio reply in Urdu, audible. Order ORD-N created. Fraud score visible.
  - Send product image → order created with parsed items
  - Ask "kameez ka kya rate?" → AI replies with price + sends product image
  - Trigger a rule ("if 'address' → ask for full address with city + landmark") → rule fires before AI

### Day 3 — Sat May 9 (RAG + voice clone + stubs + freeze, ~13 hrs)

**Morning (8h):**
- **Real RAG pipeline (5h):**
  - `KbService.uploadDocument`: PDF → Supabase Storage → `pdf-parse` → chunk (~500 tokens, 50 overlap) → OpenAI `text-embedding-3-small` → insert `KbDocument` + `KbChunk[]`.
  - `RagService.retrieve(query, workspaceId, k=3)`: embed query → `$queryRaw` cosine similarity (`<=>` operator with pgvector) → top K chunks.
  - `MemoryService.composeForReply` now calls `RagService` and includes top-3 chunks under `## Reference info:`.
  - `apps/web`: KB page — upload PDF, list documents with status, delete.
- **Voice cloning (3h):**
  - `VoiceCloneService.createClone(audioSampleUrl)` → ElevenLabs API → store `voiceCloneId` + set status='ready'.
  - `apps/web`: Settings/Voice page — record/upload 60s sample, "Train clone" button, status indicator.
  - `VoiceReplyService`: if `workspace.voiceCloneStatus='ready' && config.ttsProvider='elevenlabs'`, use ElevenLabs voice, else OpenAI.

**Mid-day (5h):**
- **Lost Sales page (1.5h):** `/lost-sales` table — conversation, reason, suggestion, recover button, scan-now trigger. Dashboard tile: "Lost Sales (30d)" with count + click-through.
- Real **Auto Rules** page — table + add/edit form, toggle.
- **Flow Builder** page — React-Flow canvas, 2-3 seeded sample flows (`After-hours auto-reply`, `Voice → confirm order`, `Out of stock`). Drag/zoom works. Save button toasts "Coming soon" — but on demo, judge sees real canvas.
- Stub pages with seeded data: Contacts + Customer 360, Products grid (with image upload form — real), Broadcasts (placeholder), Analytics (extra charts).
- Settings (business info, AI config form including TTS provider/voice toggle).
- **Settings/WhatsApp page (REAL, ~1.5h):** form for `phoneNumberId`, `wabaId`, `accessToken` (write-only, masked after save), `webhookVerifyToken`, `appSecret`. Server encrypts `accessToken` with AES-256-GCM via `crypto.ts` helper. **"Test connection"** button → calls `WhatsAppService.sendText` to seller's own number → confirms. Page also displays the webhook URL + verify token to paste into Meta Business Manager.
- `seed.ts` populates ~30 contacts, ~80 messages (mixed languages), ~12 orders, 5 products with images, 5 auto-rules, 3 flows, 2 KB documents w/ embeddings, **3 stale lost-sale conversations with pre-analyzed reasons.**
- Write the third skill: `.claude/skills/wire-tile/SKILL.md`.

**Polish window (~0h — effectively absorbed by Lost Sales addition. Demo-path edge cases get spot-fixes only as bugs surface during rehearsal):**
- Update `PROMPTS.md` with real top-5 / bottom-3.
- Empty / loading / error states on **Inbox, Orders, Dashboard, Settings/AI** only.
- Mobile responsive sweep on demo path only (sidebar collapse).
- 4 e2e tests in `apps/api`: webhook, voice-to-order, image-to-order, rule-engine.
- Sentry test error + PostHog test event; verify both dashboards.
- **§9 self-score** (1–10 each). If §9 < 7 → write 4th skill / tighten CLAUDE.md / expand PROMPTS.md instead of UI polish.
- Record 60s **fallback demo video**.
- Final commit, tag `v1.0-demo`, freeze.

**9pm Sat May 9 deadline:** code freeze.

### Sun-Mon May 10–11 — demo prep only

Submission Notion docs (PM brief, Architecture overview, Technical decisions). Demo rehearsal x3. **Zero code unless catastrophic.**

## Custom Skills

### `.claude/skills/add-service/SKILL.md`
**Trigger:** "Add a NestJS module / domain service."
**Effect:** Generates `<name>/{controller,service,module,dto}.ts` + e2e test scaffold + adds module to `app.module.ts`. Controller has `SupabaseAuthGuard + WorkspaceGuard`. Service injects `PrismaService` + logger. Refuses DB calls in controller. No SQL strings outside `$queryRaw` inside services.

### `.claude/skills/add-prisma-model/SKILL.md`
**Trigger:** Adding a model to `packages/db/prisma/schema.prisma`.
**Effect:** Inserts model with `id`/`workspaceId`/`createdAt`/`updatedAt`, the Workspace relation with `onDelete: Cascade`, `@@index([workspaceId])`, `@@map` snake_case-plural. Runs `pnpm prisma migrate dev` + `pnpm prisma generate`.

### `.claude/skills/wire-tile/SKILL.md`
**Trigger:** Adding a dashboard tile or chart.
**Effect:** Generates `AnalyticsService` method (`$queryRaw` against view) → Zod response in `packages/types` → `AnalyticsController` endpoint → React component (shadcn Card + Recharts) in `apps/web` → PostHog `tile_viewed` event.

## Demo Script (5 minutes — Workshop Pack §7 mandatory structure)

**0:00–0:30 Hook.** "Pakistani SMB sellers do millions on WhatsApp. They drown in messages, lose orders to voice notes, get COD-frauded, and the customer waits because no one replies in their language. Meet FlowChat."

**0:30–2:30 Live demo (3 user actions, end-to-end, no slides).**

Phone on screen-mirror. Three user actions, real app, real data:

1. **Multi-modal in / out + tool grounding (60s).** Send Urdu-script text *"بھائی 2 لان سوٹ چاہیے، نیلا اور سرخ"* → AI calls `search_products` → reply in Urdu with real DB price + product image attached. Open the message metadata to show the tool-call trace — *the AI doesn't guess, it queries*. Then send English *"Do you deliver to Lahore?"* → English reply. Then Roman Urdu voice note *"Salaam, mujhe teen kameez chahiye, do white aur ek black, address hai DHA Phase 5 Karachi"* → transcription appears → cut to `/orders` → ORD-0013 with parsed items + address + **fraud score badge GREEN (12/100)** → AI confirmation lands on phone as a voice note in seller's cloned voice. Play it for the room. Final: send a product photo of 3 dresses → order created with parsed items.

2. **Lost-sale recovery (30s).** Open `/lost-sales` → click a stale conversation → AI-extracted reason: *"Customer left after asking about delivery time — 7-day delivery felt too long. Suggestion: offer same-day Karachi delivery."* → click **Recover** → follow-up message sent.

3. **Real-time + dashboard (30s).** Open `/inbox` in two tabs (same workspace). Send a fresh WhatsApp text from the phone → both tabs update within 1s without refresh — Supabase Realtime + RLS. Cut to `/dashboard` — Revenue Brain tiles + 9–11pm heatmap, all from SQL views.

**2:30–3:30 Architecture (1-paragraph version).** One slide: Next.js (Vercel) ↔ NestJS (Render) ↔ Supabase + Meta. "Strict service layer, Prisma types end-to-end, Zod every boundary, JWT-verified API, 3-layer memory (recent + customer-facts + RAG via the `search_knowledge_base` tool), 8 LLM tools so the AI can't hallucinate facts, Sentry + PostHog live, RLS on every domain table, multi-tenant from day one. ~30 NestJS modules, ~17 Prisma models, 4 e2e tests green."

**3:30–4:30 How I used Claude Code (the §9 beat — 25%).** Open repo:

- `git log --reverse | head -1` — `CLAUDE.md` first commit, alone, before any code.
- `PROMPTS.md` — read **one prompt that worked** (highlighting which pattern: e.g. "Pattern 1 multi-loop on the WhatsApp pipeline service caught a cross-tenant leak in the audit loop that tests would have missed"), **one that failed** (with the specific lesson), **one workflow I'll keep** ("`/clear` between unrelated tasks — 30% cost cut on Day 2").
- `.claude/skills/` — three project skills. Live-run `add-service` if time permits ("adding a new NestJS module is one prompt now").

**4:30–5:00 Cost.** Pull up `COST.md`. Total spend across the 3 build days. **$/feature** math (e.g., "voice-to-order + voice-out cost ~$8 in Claude Code time"). One surprise — the cheapest output that worked, or the most expensive prompt and what made it expensive. Close on the FlowChat tagline.

**Common demo failures to avoid (per Workshop Pack §7):**
- No slides before the demo. Demo first, slide last.
- Don't say "this part isn't working but normally..." — don't demo broken paths.
- No reading code on screen. Architecture is a sentence, not a tour.
- Don't run over 5:00 — practice the timing once on May 11 morning before the meeting.

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Render Starter must be paid Day 0** ($7/mo) | Locked in | Decided. Free tier sleep would torpedo demo timing. |
| pnpm + Prisma client generation order on Render build | High | `render.yaml` build: `pnpm install --frozen-lockfile && pnpm --filter @repo/db prisma generate && pnpm --filter api build`. Test on Render Day 0. |
| CORS between Vercel and Render | Medium | Explicit `CORS_ALLOWED_ORIGINS` env (production + `*.vercel.app` for previews). |
| Supabase JWT verify mismatch | Medium | Use `SUPABASE_JWT_SECRET` (NOT anon key); HS256; verify `aud === 'authenticated'`. Test Day 1 morning. |
| Meta webhook signature verify fails | High | Day 1 morning. Raw-body middleware MUST run before JSON parser for the webhook route. Keep `rawPayload` jsonb for debugging. |
| Meta media download auth fails | High | Day 2 morning. Test one real voice note E2E *before* building the parser. |
| Groq Roman Urdu output is mediocre | Medium | Hand-craft system prompt + 3-shot examples per language. Test 10 sample inputs. Have backup canned responses. |
| TTS Roman Urdu pronunciation wrong | High | Always transliterate Roman Urdu → Urdu script via Groq before TTS. Verify with judge sample text Day 2 evening. |
| TTS audio not accepted by Meta | Medium | Meta accepts mp3/ogg/m4a/amr. OpenAI TTS outputs mp3 → fine. ElevenLabs outputs mp3 → fine. Verify on first send. |
| **ElevenLabs Urdu cloning quality** | Medium | Multilingual v2 supports Urdu. If clone is bad, fall back to default ElevenLabs voice or stay on OpenAI. Decision Day 3 morning. |
| **GPT-4o-mini Vision misreads product photo** | Medium | Use a clean reference photo for demo. Have backup of "if uncertain, ask user to clarify." |
| **pgvector ivfflat index probe count tuning** | Low | Default `lists=100`, `probes=10` is fine for <10k chunks. Hackathon scale is fine. |
| **PDF parse fails on scanned PDFs** | Medium | Demo PDFs must be text-based, not scanned images. Note this in SPEC.md. |
| Rule engine false-positives skip AI when shouldn't | Medium | Default rules are conservative — only fire on very specific patterns. Always have AI as fallback if no rule matches. |
| Voice parser hallucinates non-inventory items | Medium | Don't validate against `Product` for demo — accept free-text. P2 future work. |
| **Tool-calling loop runs away** (model keeps calling tools) | Medium (new) | Hard cap: max 3 iterations + 15s wall-clock timeout. If exceeded, fall back to canned "Mein abhi confirm nahi kar sakta, thori der mein reply karta hu." |
| **Groq tool-call routing picks the wrong tool** | Medium (new) | Crisp tool descriptions ("USE THIS WHEN…"); 2-3 example tool calls in system prompt. Mark tool args as Zod-required so malformed calls fail fast. |
| **Meta access token leaks via logs/Sentry** | High (new) | `accessTokenEnc` AES-encrypted at rest. Logger redactor strips `access_token` and `Authorization` headers. Sentry `beforeSend` scrubs known fields. |
| **WhatsApp test-connection button uses an unsaved token** | Low (new) | Only POST/save flow accepts new token; test button sends to current persisted (encrypted) token. Decrypt only inside `WhatsAppService`. |
| **RLS policy bug leaks cross-workspace data via Realtime** | High (new) | Day 1 task: write RLS policies + a deliberate cross-workspace test (sign in as A, try to subscribe to B's conversation). Must fail. Use `select (auth.jwt() ->> 'sub')::uuid` joined to `workspace_members`. |
| **Supabase Realtime drops connection / lags during demo** | Medium (new) | Inbox component falls back to manual refresh button if subscription error event fires. Test reconnect during dev. |
| **Forgetting `CLAUDE.md` before code = −25 pp** | Catastrophic | Day 0 today. Single commit, three docs, before `package.json`. |
| **Forgetting `PROMPTS.md` = −25 pp** | High | Update continuously from Day 1. |
| Multi-tenant leak | Medium | Service methods take `workspaceId` as first arg always. Lint check. |
| Last-minute env var missing | Medium | `lib/env.ts` and `common/env.ts` Zod-parse on boot — fails fast. Verify Day 2 evening on both Render + Vercel dashboards. |
| Two-deploy env-var sync drift | Medium | `.env.example` exhaustive with `# WEB ONLY` / `# API ONLY` / `# BOTH` comments. |
| **Polish window is now ~0h** (consumed by Lost Sales) | Critical | Code-as-you-go quality matters more than ever. No final cleanup pass. Demo-path bugs caught during 3 Sun rehearsals; stub pages stay rough. |
| Demo network at venue is bad | Medium | 60s MP4 fallback. Same flow seeded so it's replayable from DB even if WA fails. |

## Critical Files to Create First (ordered)

1. `CLAUDE.md` — **commit alone, before anything else**
2. `SPEC.md`
3. `PROMPTS.md` (empty template)
4. `.claude/skills/add-service/SKILL.md`
5. `.claude/skills/add-prisma-model/SKILL.md`
6. `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `.env.example`
7. `packages/db/prisma/schema.prisma` + first migration (incl. pgvector + view SQL) + `packages/db/src/index.ts`
8. `packages/types/src/{api-contracts,whatsapp,ai,index}.ts`
9. `apps/api/src/common/{env,errors,logger,auth/supabase-auth.guard}.ts` + `prisma/prisma.service.ts`
10. `apps/api/src/whatsapp/webhook.controller.ts` (de-risk Meta integration early)
11. `apps/api/render.yaml`
12. `apps/web/src/lib/{env,supabase/server,supabase/middleware,api-client,auth}.ts`
13. `apps/web/src/middleware.ts` + `apps/web/src/app/(auth)/callback/route.ts`
14. `.github/workflows/ci.yml`

## Verification

### Continuous (every commit)
- `pnpm typecheck` — TS strict, zero errors across both apps + packages.
- `pnpm test` — Jest e2e on `apps/api` services pass.
- CI on every PR: typecheck + test + build for both apps via turbo.
- Vercel preview + Render deploy both succeed.

### Day 1 EOD acceptance
- `curl https://<render>/webhooks/whatsapp?hub.mode=subscribe&...` → 200 + challenge.
- Real WA message → Render logs show signature verified → row in `messages`.
- Manually invoke `WhatsAppService.sendText` from a script → message reaches phone.
- Sign in with Google on Vercel preview → onboarding → POST `/workspaces` succeeds.

### Day 2 EOD acceptance (the dry-run)
- Open `/inbox` in two browser tabs (same workspace). Send a message from another phone. **Both tabs show the new message + AI reply within 1 second** without page refresh. Sign in as a different workspace in tab 3 — does NOT see the message.
- Send Urdu text → Urdu reply within 10s, with memory of past order if any.
- **Ask "kameez ka kya rate aur stock?" → Inbox shows AI reply with REAL price + REAL stock count (via `search_products` + `check_stock` tool calls). The outbound message metadata has the tool call trace.**
- **Ask "meri pichli order ka status?" → AI calls `get_customer_orders` → replies with real order number + status.**
- **Ask "return policy kya hai?" (after uploading the policy PDF) → AI calls `search_knowledge_base` → quotes the policy doc.**
- Send English text → English reply.
- Send Roman Urdu voice → row in `messages` with `transcription` + `detectedLanguage='roman_urdu'` → row in `orders` with fraud score → mp3 audio reply on phone, audible Urdu.
- Send product photo → order created with parsed items.
- Ask "kameez ka kya price?" → reply with text + product image attachment lands.
- Trigger an auto rule → rule fires, AI does NOT also reply.
- Open `/dashboard` → tiles + charts + heatmap render.

### Day 3 polish acceptance
- Sign up fresh Google account → onboarding → empty dashboard renders without errors.
- Submit empty forms on demo path → Zod errors as toasts, no 500s.
- Disconnect Wi-Fi mid-demo → graceful error UI.
- Sentry shows test error from each app; PostHog shows test event.
- 4 e2e tests pass: webhook, voice-to-order, image-to-order, rule-engine.
- `git log --reverse | head -1` shows `CLAUDE.md` commit first.
- `PROMPTS.md` ≥5 worked + ≥3 failed entries with real prompts and outcomes.
- `.claude/skills/` has 3 skill folders.
- KB upload a sample PDF → status reaches 'ready' within 30s → asking a related question retrieves it correctly.
- Voice clone: upload sample → train completes → next voice reply uses cloned voice.
- Heatmap renders with seeded data showing 9-11pm peak.

### Demo rehearsal (Sun May 10)
- Run the 4-minute demo live, end-to-end, **3 times**, on a fresh browser session each time. Time it.

## Self-Score Checkpoint (Sat May 9 morning)

```
1.  Idea & utility (8%)                    /10
2.  Functionality (15%)                    /10
3.  Code quality (10%)                     /10
4.  Architecture (6%)                      /10
5.  Database quality (5%)                  /10
6.  UI/UX (10%)                            /10
7.  Performance (5%)                       /10
8.  Observability (8%)                     /10
9.  Effective use of Claude Code (25%)     /10  ← biggest weight + tie-breaker
10. Submission & demo (8%)                 /10
```

**Decision rule:** if §9 < 7 → don't touch UI in the polish window. Write a 4th skill / tighten `CLAUDE.md` / expand `PROMPTS.md`. Each /10 in §9 = 2.5 weighted pts vs 1 elsewhere.

## Out of Scope (P3 — explicit non-goals)

- AI confirmation calls (Twilio Voice + ElevenLabs outbound) — too risky on demo day
- Real CSV product upload — visual stub only
- Flow execution engine — Flows are CRUD + canvas only
- Mobile (Expo) app — dropped
- (removed — Realtime is in scope as of rev 3.1)

All listed in SPEC.md as "future work" — turning weakness into a roadmap.
