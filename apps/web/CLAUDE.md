# apps/web — Next.js 16 App Router Rules

## Stack
Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui, pnpm. Deployed on Vercel.

## Route rules

- **Server Components by default.** Add `'use client'` only when you need state, effects, or browser APIs.
- **`src/app/(app)/` routes** are protected — `middleware.ts` redirects unauthenticated users to `/login`.
- **`src/app/(auth)/` routes** — public (login, signup, callback).
- **`src/app/(marketing)/` routes** — public landing page.
- **No direct fetch to Supabase** from Server Components — use `lib/api-client.ts` which attaches the JWT and calls the NestJS API.
- **Realtime subscriptions** in Client Components only — `createBrowserClient()` from `@supabase/ssr`.

## API client

`src/lib/api-client.ts` wraps `fetch` with `Authorization: Bearer <supabase-jwt>`. All NestJS calls go through here. Never call the NestJS API directly with a bare `fetch`.

## Auth

`src/middleware.ts` refreshes the Supabase session on every request and guards `/(app)` routes. Never implement auth in individual page components.

## AI / LLM

Never call Groq, OpenAI, or ElevenLabs from the browser. Server Components/API routes only. Keys stay server-side.

## UI conventions

- **shadcn/ui** for all primitives (Button, Card, Input, Dialog, etc.).
- **Tailwind v4** for utility classes.
- **Recharts** for all charts — no other chart library.
- **React-Flow** for the Flow Builder canvas only.
- Design tokens from `design-system/MASTER.md` are the source of truth.
- Do not exceed 2000px dimension limit on many-image requests (Playwright MCP).

## Logging

`src/lib/logger.ts` exports a `pino` logger. No `console.log` in committed code.

## Observability

PostHog initialized in root layout. Sentry initialized via `instrumentation.ts`. Both auto-capture errors.

## Commands

```bash
pnpm dev          # next dev
pnpm build        # next build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```
