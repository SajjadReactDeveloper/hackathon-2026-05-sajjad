# docs/architecture/prompting.md — The §9 Playbook

Prompting patterns adapted to this project. Source: hackathon "Prompting Patterns That Ship" doc. Pattern references should appear in `PROMPTS.md` "Why it worked" / "What I should have done" entries — judges grade for whether you learned the patterns by name.

## Pattern 1 — Multi-Loop Coding (production-shaped features)

**Use for:** WhatsApp pipeline service · AI tool-calling loop · webhook signature verification · OrderService transaction · anything touching auth / money flow.

Template:

```
<task description with @file pins and CONSTRAINTS block>

Plan this properly, brainstorm well about architecture, engineering, security. Once you have a solid PRD plan, then start coding.

Once done coding, audit what you've coded and make improvements / fixes. Keep auditing and fixing in a loop until the audit comes 99%+ clear.

Then start QA testing with scripts (Vitest / supertest), fix the code if anything fails. Keep this loop until tests fully pass.

Next run end-to-end QA with Playwright MCP — not just functionality but UI/UX, every button, every flow. Fix anything you find, then re-run QA. Loop until QA fully passes.

Now take a final look as the engineer, security reviewer, product manager, CTO, and founder of this. If anything else is needed, plan and apply the loops. Only when all roles approve — deliver.
```

**Termination:** "99%+ clear" / "fully pass" / "QA comes back perfect" — Claude self-evaluates against these.

## Pattern 2 — Design QA Loop (UI work)

**Use for:** any user-facing UI — Inbox, Dashboard tiles, Orders detail, Settings forms, Lost Sales page, Onboarding flow. Day 3 polish primarily.

Mandatory in every prompt:

- **Stack design skills:** `/design-taste-frontend /frontend-design /ui-ux-pro-max` (do NOT include `/huashu-design` — license).
- **2000px warning:** *"Do not exceed the 2000px dimension limit for many-image requests. If you use sub-agents, tell them the same — otherwise Claude crashes."*
- **Playwright MCP** for screenshots — desktop AND mobile separately.

Template:

```
You are the senior product designer of FlowChat — a WhatsApp business cockpit for Pakistani SMB sellers.

Take a screenshot of <URL> on desktop AND mobile separately (Playwright MCP). Analyze the entire page — header, content, footer. Make sure everything is designed at a tier-1 design firm grade. Make sure consistency across pages: sidebar, top bar, fonts, colors, spacing.

Apply design tokens from @design-system/MASTER.md.

Do not exceed the 2000px dimension limit for many-image requests. If you use sub-agents, tell them the same — otherwise Claude crashes.

Use these skills: /design-taste-frontend /frontend-design /ui-ux-pro-max

Keep improving until production-ready. Run UI QA → fix → UI QA → fix loop until QA comes back perfect.
```

## Pattern 3 — Take-It-Home Loop (Saturday afternoon)

**Use for:** Day 3 afternoon — launch and step away, come back to a deployed URL.

Template:

```
What I need: keep working until you can deliver a fully working URL with the demo path tested end-to-end. Follow this process:

1. Brainstorm what's done, what's left toward v1.0.
2. Build a plan covering the remaining items.
3. Code accordingly.
4. Audit → fix → audit → fix loop until audit finds nothing to fix.
5. Run all tests (unit + e2e). If anything fails, fix it. Loop until everything passes.
6. End-to-end QA (Playwright MCP, real browser flows — signup → onboarding → inbox demo path → orders → dashboard). Loop until QA fully passes.

Once everything works smoothly, no bugs, ready for demo: deliver the URL with brief instructions.

CONSTRAINTS:
- Sonnet only. Do not escalate to Opus.
- Stop and tell me if you need >$15 in a single run.
- Do not exceed the 2000px dimension limit for many-image requests.
```

**Cost guard:** if Claude burns >$15 in one Pattern 3 run, `/clear` and re-launch with tighter scope ("loops 4 and 5 only, skip step 6").

## Smaller patterns (daily use)

| Pattern | When | Template |
|---|---|---|
| **Interview-Me-First** | Starting an ambiguous feature | "I want to build X. Before you write any code, ask me 5–10 questions about implementation, edge cases, and tradeoffs. Then wait." |
| **Pin the Files** | Any non-trivial edit | "@file1 @file2 @file3 — these are the only files to modify. Do not edit anything else." |
| **CONSTRAINTS block** | Top of any non-trivial prompt | "CONSTRAINTS (must follow, hard errors): never write SQL outside `*Service.$queryRaw`; never bypass `WorkspaceGuard`; never `console.log`; ..." |
| **Failing-Test-First** | Webhook signature, JWT verify, money-flow | "Strict TDD. Write a FAILING test for X. Run it. Confirm it fails for the right reason. Show me the failure. Wait for approval before implementing." |
| **Plan-Annotate-Reject** | Plan-mode iteration | After plan: paste back annotated inline (`// no, use Prisma here`). "Address all notes. Don't implement yet." Loop. |
| **Negative Space** | After feature lands | "What edge cases am I missing? Network failures, empty inputs, race conditions, auth boundaries, partial saves. List top 5 + how each manifests." |
| **Show Your Work** | Risky change | "Before changes, summarize what you'll do and which files. Wait for approval." |

## Anti-patterns (do not do)

- "Make this better" — no target
- "Fix the bug" — no context, stack, expected vs actual
- Opus by default
- One giant prompt for a complex feature → break into Pattern 1 phases
- Trusting tests-pass without reading the diff and running tests against deliberately-broken code
- "No, do it differently" — use `/rewind` so the bad attempt isn't in context

## Project-specific reminders

- Always pass `workspaceId` to services explicitly; never read from request body inside service.
- For UI work: `design-system/MASTER.md` is the source of truth for tokens.
- For DB work: invoke `.claude/skills/add-prisma-model/`.
- For new NestJS module: invoke `.claude/skills/add-service/`.
- For new dashboard tile: invoke `.claude/skills/wire-tile/`.
- For Pakistani business cockpit aesthetic: data-dense, neutral palette, Urdu glyph quality matters — verify with native speaker before demo.
