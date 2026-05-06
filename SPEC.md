# FlowChat — WhatsApp Business Assistant

## What it is (1 sentence)

A WhatsApp Business platform for Pakistani SMB e-commerce sellers that turns inbound text / voice / image messages into orders, replies in the customer's language (Urdu / English / Roman Urdu) using the seller's cloned voice for audio, and surfaces revenue analytics + lost-sale recovery from the message stream.

## Track

[ ] Internal Tool   [ ] Fintech Mini-App   [ ] Crypto/Web3   [x] Free-form

## Target user (1 sentence)

A Pakistani SMB seller (clothing / accessories / home goods) doing 5–50 orders/day on WhatsApp — native Urdu speaker, drowning in messages, losing orders to voice notes, getting COD-frauded.

## The user's job-to-be-done (1 sentence)

Reply to every customer in their language within seconds, capture orders from voice and photos automatically, and never miss a high-intent buyer.

## Must-have features (3–5, no more)

1. **Real-time WhatsApp inbox with auto-reply pipeline** — Real Meta WhatsApp Cloud API webhook (signed verify, idempotent message recording), Supabase Realtime inbox (sub-second updates with RLS multi-tenancy), composer for outbound text/audio/image, regex-based Auto Rules engine that runs before AI. **Acceptance:** real WA message hits webhook → row in DB → appears in browser tab within 1s on the right workspace and never on the wrong one; rule "if 'address' → ask for full address" fires before AI on a matching inbound.

2. **Language-mirrored AI replies grounded in business data** — Groq Llama 3.3 70B with tool calling (8 functions: `search_products`, `get_product`, `check_stock`, `get_customer_orders`, `get_order_status`, `search_knowledge_base`, `get_delivery_info`, `escalate_to_human`); 3-layer memory (last 20 messages + extracted customer facts + KB/RAG); per-language system prompts; voice replies in cloned seller voice (ElevenLabs) with OpenAI TTS fallback. **Acceptance:** Urdu text → Urdu reply; English text → English reply; Roman Urdu voice note → cloned-voice Urdu audio reply within 15s; "kameez ka kya rate?" causes a `search_products` tool call and quotes the real DB price (not a hallucinated one) — tool trace is visible on the outbound message.

3. **Voice & image → Order pipeline with COD fraud scoring** — Inbound voice note → Whisper STT → Groq structured parse → real `Order` row + items; inbound product image → GPT-4o-mini Vision → structured items → order; rules-based 0–100 fraud score on every order create (new contact / high value / vague address / multi-order). **Acceptance:** voice "teen kameez chahiye, do white aur ek black, address DHA Phase 5" creates order with 3 items + parsed address + score badge; image of products creates order with parsed items.

4. **Knowledge Base + real RAG** — PDF upload → `pdf-parse` → chunk → OpenAI `text-embedding-3-small` → pgvector ivfflat index; surfaced to the AI as the `search_knowledge_base` tool, not always-injected. **Acceptance:** seller uploads return-policy PDF; status reaches "ready" within 30s; customer asks "return policy kya hai?" → AI calls `search_knowledge_base` → reply quotes the doc.

5. **Revenue Brain dashboard + "Why Lost Sale?" AI** — Tiles (revenue, AI reply rate, new contacts, message volume), Recharts charts, hour-of-day × day-of-week heatmap — all from Postgres views; Lost Sale detection on stale conversations with Groq-extracted `{reason, suggestion}` and a one-click recover action. **Acceptance:** dashboard renders non-zero tiles + heatmap on seeded data; `/lost-sales` lists 3 stale conversations with AI-extracted reasons; clicking Recover sends a follow-up.

## Nice-to-have (won't block demo)

- Demo-credible Flow Builder canvas (React-Flow with seeded sample flows; save = stub)
- Contacts table + Customer 360 panel (real schema, seeded data)
- Products grid (real add product + image upload; seeded list)
- Broadcasts page (placeholder list)
- Analytics page (extra charts)
- Mobile (Expo) companion app — only if Day 3 self-score on §9 ≥ 7

## Tech stack

- Backend: NestJS (TypeScript strict) on **Render Starter** (paid — Adnan-approved). Prisma ORM. Zod at every API boundary. nestjs-pino structured logging. Sentry + source maps.
- DB: Supabase **Postgres + pgvector** extension. RLS enforced on `messages`/`conversations`/`contacts`/`orders` (Realtime auth requirement + defense-in-depth).
- Frontend: **Next.js 15 App Router** (TS strict) on Vercel. shadcn/ui + Tailwind + Recharts + React-Flow. Supabase Realtime browser subscriptions for the inbox. Sentry + PostHog instrumentation.
- Auth: **Supabase Auth** (Google + email/password) on web; NestJS `SupabaseAuthGuard` verifies JWT (HS256, `SUPABASE_JWT_SECRET`).
- Platform-specific feature: **Real Meta WhatsApp Cloud API** — webhook verify token + HMAC-SHA256 signature against raw body, send text/audio/image via Graph API, media download with bearer auth. Workspace stores its own credentials with the access token AES-256-GCM-encrypted at rest.

## Architecture (5 lines max)

Next.js 15 (Vercel) calls NestJS (Render) over HTTPS with the Supabase JWT in `Authorization`. NestJS owns all business logic — controllers parse with Zod, services do the work, Prisma writes to Postgres. Inbound Meta webhooks hit `WebhookController` → `PipelineService` routes by message type (text / audio / image) through `AIReplyService` (Groq + tool-calling loop) or `VoiceParserService` / `ImageOrderService`, then replies via Meta Graph API. Browser subscribes to Postgres row changes on `messages` + `conversations` via Supabase Realtime; RLS policies enforce multi-tenant isolation. Background jobs: `ContactFactsService` extracts customer memory after each AI reply; `LostSaleService` scans stale conversations and persists reasons.

## Out of scope

- AI confirmation calls (Twilio Voice + ElevenLabs outbound) — too risky on demo day.
- Real CSV product upload — visual stub only.
- Flow execution engine — Flows are CRUD + canvas only, no runtime interpreter.
- Mobile (Expo) app — dropped from demo path.

## Risks I see

- **Meta webhook signature verification.** Raw-body middleware MUST run before JSON parser for the webhook route only. Verify Day 1 morning with a real WhatsApp send to the business number; keep `rawPayload` jsonb for debugging.
- **Supabase RLS leak via Realtime.** Misconfigured policy could broadcast cross-workspace messages. Defensive test on Day 1: sign in as workspace A in tab 1, send a message; sign in as B in tab 2, must NOT see the message.
- **Polish window ≈ 0 hours after scope additions.** §2 (Functionality, 15%) bugs surface only during 3 Sunday rehearsals — no final cleanup pass. Mitigation: `/clear` between unrelated work, code-as-you-go quality, fallback 60s demo MP4 recorded Saturday.

## How I'll demo it (3 lines)

1. Live phone on screen-mirror: send Urdu text → AI reply with product image; English text → English reply; Roman Urdu voice note → cloned-voice Urdu audio reply lands within 15s; show new Order ORD-0013 with parsed items + COD fraud score.
2. Open `/dashboard` for tiles + 9–11pm heatmap, `/lost-sales` for an AI-extracted "delivery felt too long → offer same-day" reason, click Recover.
3. Open repo: `git log --reverse | head -1` shows `CLAUDE.md` first commit; `PROMPTS.md` top-5 / bottom-3 + `.claude/skills/` × 3; live-run `add-service` skill.
