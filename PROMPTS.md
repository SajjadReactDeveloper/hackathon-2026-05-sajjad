# Prompt Log — Sajjad — FlowChat (WhatsApp Business Assistant)

> Live record of prompts I sent to Claude Code while building this. Updated continuously, not reconstructed at the end.
>
> **Why this exists** — hackathon scoring rubric §9 (Effective use of Claude Code, 25%) requires "top 5 worked + bottom 3 failed" prompts as a graded deliverable. Missing this = **−25 percentage-point penalty**.
>
> **Format** is the Workshop Pack §4 template. Append-only — don't edit prior entries; the failure-progression is part of what's being graded.

---

## Top 5 prompts that worked

### 1. Phase 2 design system rebuild — full app shell, sidebar, and all pages in one pass

**Context:** The initial Next.js scaffold had basic shadcn/ui. I needed a polished, branded UI with a dark sidebar, consistent card style, gradient tiles, and the same design tokens across every page. Rather than doing it page-by-page I tried one large prompt with a complete visual reference.

**Prompt:**

```
@apps/web/src/app/(app)/layout.tsx @apps/web/src/app/(app)/dashboard/page.tsx

CONSTRAINTS:
- Dark sidebar: background linear-gradient(180deg, #0a0f1e 0%, #0d1424 60%)
- Card shadow: 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)
- All page padding: px-7 pt-7 pb-7
- Page headers: text-[22px] font-bold text-slate-900 tracking-tight leading-none
- No emoji anywhere
- No console.log

Rebuild the app shell and dashboard with the Phase 2 design system shown in the screenshot.
The sidebar should have: FlowChat logo, full nav (Dashboard, Inbox, Orders, Contacts, Products,
Knowledge Base, Auto Rules, Flows, Lost Sales, Settings) with active-link highlighting,
user avatar + email at the bottom. Dashboard gets 6 gradient KPI tiles, Revenue chart,
Messages chart, Heatmap (real data from /analytics endpoints), QuickActions, AI Engine status.
Use Recharts for all charts. Use the design tokens above for every card/panel.
```

**Why it worked:** Pin the Files + CONSTRAINTS block prevented style drift. The explicit token values (`0a0f1e`, shadow string) gave Claude zero ambiguity — it didn't have to infer the design system, it just implemented it. Pattern 1 multi-loop style: I reviewed the diff after each file and accepted or rewound.

**Output quality:** 5/5
**Model used:** Sonnet
**Approx tokens / cost:** ~$0.80

---

### 2. Seed.ts UUID overhaul with deterministic `mid()` helper

**Context:** The seed was failing with Prisma `P2023` ("Inconsistent column data: A value is required but not set") because the seed data used short IDs like `'prod-001'`, `'c01'`, `'conv-001'` instead of UUIDs. Every upsert that tried to set or match `id` blew up.

**Prompt:**

```
@packages/db/prisma/seed.ts

CONSTRAINTS:
- Do NOT change any model schema or migration
- Do NOT change the upsert/create logic structure
- Only fix the ID values so they are valid UUIDs
- Products: remove the `id` field entirely (upsert key is workspaceId_sku)
- Contacts: rename `id` → `localId`; destructure it out before spread: const { localId: _lid, ...c } = contact
- KB docs, conversations, orders: replace short IDs with a mid(section, n) helper
- mid(section, n) generates: `a0000000-0000-0000-${section.toString().padStart(4,'0')}-${n.toString().padStart(12,'0')}`
- All references to c.id in conversation/order lookups must be updated to c.localId
- Order `num` field stays a string ('ORD-0001') but add integer `idx` field for numeric ops like modulo

Fix the seed so it runs without P2023 UUID errors.
```

**Why it worked:** Pin the Files + ultra-specific CONSTRAINTS block. I enumerated every transformation needed instead of saying "fix the UUID issue" — which would have caused Claude to take a different approach (like adding `@db.Uuid` to schema) rather than fixing the data. The `mid()` helper spec was precise enough that it got implemented exactly as needed.

**Output quality:** 4/5 (needed one follow-up to fix `o.num % 2` after `num` became a string)
**Model used:** Sonnet
**Approx tokens / cost:** ~$0.45

---

### 3. TopHeader client component with dynamic page titles and greeting

**Context:** I shared a screenshot of the header design. Needed a component that: shows a page-specific title + subtitle, a time-of-day greeting, a search bar, a notification bell with a green dot, and a user avatar. All in one 60px strip above the main content area. The page titles needed to be dynamic based on the current route.

**Prompt:**

```
create 1 small header like this and add in all pages
[screenshot attached]

CONSTRAINTS:
- 'use client' — needs usePathname() for page title detection
- Height exactly 60px, white background, border-b rgba(0,0,0,0.06)
- PAGE_META maps all 13 routes to { title, subtitle }
- greeting() returns Good morning/afternoon/evening based on hours
- Longest-match sort on pathname keys so /settings/ai matches before /settings
- Search bar hidden on mobile (sm:flex)
- Bell with green dot (w-2 h-2 absolute -top-0.5 -right-0.5)
- Avatar circle with initials (gradient green), name, role='Super Admin'
- Wire it into (app)/layout.tsx above the <main> tag
```

**Why it worked:** Screenshot reference + specific sizing/color constraints gave Claude a precise spec. The "longest-match sort" insight prevented a bug where `/settings/ai` would have matched `/settings` first. Pattern 2 design QA loop: I checked the output against the screenshot and confirmed the font sizes / spacing matched.

**Output quality:** 5/5
**Model used:** Sonnet
**Approx tokens / cost:** ~$0.30

---

### 4. Extract QuickActions to fix "Event handlers cannot be passed to Client Component props"

**Context:** The dashboard page was a Server Component. I'd written QuickActions inline with `onMouseEnter`/`onMouseLeave` on `<Link>` (which is a Client Component from next/link). This caused a Next.js build error at runtime: "Event handlers cannot be passed to Client Component props".

**Prompt:**

```
@apps/web/src/app/(app)/dashboard/page.tsx

CONSTRAINTS:
- Do NOT change any other section of the dashboard page
- Extract ONLY the Quick Actions section into a new file:
  apps/web/src/components/dashboard/quick-actions.tsx
- Mark it 'use client'
- Each ActionCard uses useState<boolean> for hover state (not onMouseEnter on Link)
- The colored box-shadow on hover uses the per-card `shadow` rgba string from ACTIONS array
- iconPath is a string (SVG d= attribute), NOT JSX, to avoid serialization issues
- Replace the inline block in dashboard/page.tsx with <QuickActions />
```

**Why it worked:** Pin the Files on exactly one file + narrow CONSTRAINTS block that listed the exact fix (useState instead of onMouseEnter on Link). Without this specificity Claude would have tried a different approach like converting the whole dashboard to a client component.

**Output quality:** 5/5
**Model used:** Sonnet
**Approx tokens / cost:** ~$0.20

---

### 5. Full NestJS module generation with add-service skill

**Context:** Needed to add 8+ NestJS modules (conversations, messages, orders, products, rules, flows, kb, lost-sales, analytics) with consistent patterns: `SupabaseAuthGuard + WorkspaceGuard` on controller, `PrismaService` injected in service, Zod validation pipe, no DB calls in controller.

**Prompt:**

```
/add-service conversations

Generate the full NestJS module for conversations with:
- ConversationsController: GET /conversations (list), GET /conversations/:id, PATCH /conversations/:id/read, PATCH /conversations/:id/ai-toggle
- ConversationsService: list(workspaceId, page, limit), get(workspaceId, id), markRead(workspaceId, id), toggleAI(workspaceId, id)
- All methods take workspaceId as first arg (injected by WorkspaceGuard, NOT from body)
- Service uses PrismaService, never raw SQL
- Controller has @UseGuards(SupabaseAuthGuard, WorkspaceGuard)
- ZodValidationPipe on all DTOs
Register in app.module.ts imports.
```

**Why it worked:** Using the custom `/add-service` skill (`.claude/skills/add-service/SKILL.md`) meant Claude loaded a project-specific template that encoded all the conventions — no need to repeat them in every prompt. The explicit method list gave it the exact API surface without over-engineering.

**Output quality:** 5/5
**Model used:** Sonnet
**Approx tokens / cost:** ~$0.35

---

## Bottom 3 prompts that wasted time

### 1. Seed data with short IDs caused cascading P2023 errors across 6 tables

**What I asked:**

```
@packages/db/prisma/seed.ts
Seed the database with realistic data: 5 products, 30 contacts, 3 flows, 5 rules,
2 KB docs, 20 conversations, 12 orders, 3 lost-sale conversations.
Use descriptive IDs like 'prod-001', 'c01', 'conv-001'.
```

**What went wrong:** Prisma's `id` fields are `@id @default(uuid())` — they require UUID format. Every `create`/`upsert` with `id: 'prod-001'` threw `P2023 Inconsistent column data`. Cascading failures: contacts failed → conversations failed (wrong FK format) → orders failed. Required a full audit of every ID in the file and a new `mid()` helper to generate stable deterministic UUIDs.

**What I should have done:** Should have used Pin the Files + CONSTRAINTS block specifying "all IDs must be valid UUID format — use crypto.randomUUID() or a deterministic helper." The descriptive-ID approach was fine for human readability but incompatible with Prisma's UUID enforcement. Pattern: Failing-Test-First — I should have run `pnpm db:seed` after the first 10 rows before generating the full 200-row seed.

---

### 2. onMouseEnter on server component caused runtime crash

**What I asked:**

```
@apps/web/src/app/(app)/dashboard/page.tsx
Add Quick Actions section: 4 cards (Inbox, Lost Sales, KB, Products) with colored hover shadows.
Each card gets onMouseEnter to change its boxShadow to the card's accent color.
```

**What went wrong:** Next.js App Router threw "Event handlers cannot be passed to Client Component props" because the Quick Actions were inside a Server Component but the hover handlers were being passed to `<Link>` (a Client Component). The build error blocked the entire page from rendering.

**What I should have done:** Before writing hover effects, check if the parent is a Server Component. If yes, either: (a) mark the whole section `'use client'`, or (b) extract it as a separate Client Component. The rule: **functions can only flow from Client Components to other Client Components**, never from Server to Client as props. Should have added `'use client'` boundary check to every interactive element prompt.

---

### 3. Missing PgBouncer parameter caused 42P05 on every Prisma write

**What I asked:**

```
Run the seed: pnpm --filter @repo/db db:seed
```
*(without first checking if the DATABASE_URL was PgBouncer-compatible)*

**What went wrong:** Supabase's pooler at port 6543 uses PgBouncer in transaction mode. Prisma uses prepared statements (`pg_prepare`) which conflict with PgBouncer transaction mode — causing `42P05 prepared statement "s0" already exists` on the first write. Every create/upsert in the seed failed silently or with cryptic errors until I traced back to the connection string.

**What I should have done:** Before running any Prisma operation against Supabase, verify the DATABASE_URL. If port is 6543 (pooler), append `?pgbouncer=true&connection_limit=1`. This is a known Prisma + Supabase gotcha — should be in the project CLAUDE.md as a "run this check first" step for any new dev environment.

---

## Workflow patterns I'll keep using

- **Always Pin the Files** (`@file1 @file2 — these are the only files to modify`) on every non-trivial prompt. Auto-discovery on this monorepo is unreliable.
- **CONSTRAINTS block at top** for any prompt touching >1 file or any design token. Prevents Claude from re-inferring the design system each time.
- **Pattern 1 multi-loop** for anything touching auth, money flow, or the WhatsApp pipeline. Catch cross-tenant leaks in the audit loop, not in production.
- **Sub-agent Explore** for any >3 file reads before editing. Keeps main context clean on Day 2+.
- **`/add-service` skill** for every new NestJS module. Saves ~10 minutes per module and enforces conventions.
- **Failing-Test-First on seed and migrations** — run `pnpm db:seed` against the first 5 rows before generating 200 rows.

## Workflow patterns I'll stop

- Stopped using descriptive IDs in seed data (`'prod-001'`) — Prisma UUID fields don't accept them.
- Stopped letting Claude generate hover effects in Server Components — always check the parent boundary first.
- Stopped running `pnpm db:seed` before verifying the DATABASE_URL is PgBouncer-compatible.
- Stopped saying "fix it" when a build fails — switched to Pin the Files + CONSTRAINTS block with the exact fix spelled out.

---

## Full append-only log (raw material for the top-5 / bottom-3)

### 2026-05-06 14:00 — Day 0 monorepo bootstrap + CLAUDE.md
- Phase: Day 0
- Task: PLAN.md §Day 0 steps 1–7
- Model: Opus (plan mode)
- Plan mode? yes
- Sub-agent used? Plan
- Pattern invoked? Plan-Annotate-Reject
- Prompt: "Generate the full hackathon build plan for FlowChat (WhatsApp Business Assistant for Pakistani SMBs). Eight differentiators. Rubric-aware. Day-by-day. Demo script."
- Outcome: succeeded — produced the 200-line PLAN.md
- Approx tokens / cost: ~$2.00
- Notes: Used Opus for plan mode per CLAUDE.md rule. Returned to Sonnet for all implementation.

### 2026-05-06 16:00 — Prisma schema (all 17 models + views + pgvector)
- Phase: Day 0
- Task: PLAN.md §Database schema
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? Pin the Files + CONSTRAINTS block
- Prompt: "@packages/db/prisma/schema.prisma CONSTRAINTS: [full schema rules]. Generate all 17 models including ContactFact, KbDocument, KbChunk (with vector(1536)), AutoRule, Flow, LostSale columns on Conversation."
- Outcome: succeeded
- Approx tokens / cost: ~$0.60
- Notes: Had to regenerate after adding pgvector migration separately.

### 2026-05-07 09:00 — NestJS common infrastructure
- Phase: Day 1
- Task: PLAN.md §Day 1 foundation
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? Pin the Files
- Prompt: "Generate apps/api/src/common/{env,errors,logger,crypto,auth/supabase-auth.guard,auth/workspace.guard}.ts. Follow CLAUDE.md conventions. SupabaseAuthGuard verifies Supabase JWT using SUPABASE_JWT_SECRET. WorkspaceGuard injects workspaceId from x-workspace-id header."
- Outcome: succeeded
- Approx tokens / cost: ~$0.40

### 2026-05-07 10:30 — WhatsApp webhook controller + raw-body middleware
- Phase: Day 1
- Task: PLAN.md §Day 1 — WhatsApp webhook controller
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? CONSTRAINTS block
- Prompt: "CONSTRAINTS: raw-body middleware MUST run before JSON parser for /webhooks/whatsapp only. Verify signature with HMAC-SHA256 using APP_SECRET. GET handler returns hub.challenge. POST handler returns 200 immediately then async processes. Generate apps/api/src/whatsapp/{webhook.controller,whatsapp.service,verify,pipeline.service,whatsapp.module}.ts"
- Outcome: succeeded
- Approx tokens / cost: ~$0.50

### 2026-05-07 14:00 — Phase 2 app shell + full page set
- Phase: Day 1
- Task: All web pages
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? Pin the Files + CONSTRAINTS block + Screenshot
- Prompt: "create 1 small header like this and add in all pages [screenshot]"
- Outcome: succeeded — TopHeader created, all pages polished to Phase 2 design
- Approx tokens / cost: ~$0.80
- Notes: Needed one follow-up to extract QuickActions to fix server component event handler error.

### 2026-05-07 15:00 — QuickActions client component extraction
- Phase: Day 1
- Task: Fix onMouseEnter server component error
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? Pin the Files + CONSTRAINTS block
- Prompt: "Extract QuickActions to 'use client' component. Use useState for hover. iconPath as string not JSX."
- Outcome: succeeded
- Approx tokens / cost: ~$0.15

### 2026-05-07 16:30 — Seed.ts UUID overhaul
- Phase: Day 1
- Task: Fix P2023 UUID seed errors
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? Pin the Files + CONSTRAINTS block (very detailed)
- Prompt: See "Top 5 #2" above
- Outcome: succeeded after 2 iterations (second iteration fixed o.num → o.idx)
- Approx tokens / cost: ~$0.45

### 2026-05-07 17:00 — PgBouncer DATABASE_URL fix
- Phase: Day 1
- Task: Fix 42P05 prepared statement error
- Model: Sonnet
- Plan mode? no
- Sub-agent used? none
- Pattern invoked? none (direct fix)
- Prompt: "Append ?pgbouncer=true&connection_limit=1 to DATABASE_URL in packages/db/.env"
- Outcome: succeeded — seed ran to completion, all 12 orders seeded
- Approx tokens / cost: ~$0.05

---

_Last updated: 2026-05-07 (Day 1 complete)_
