# docs/architecture/deploy.md — Deploy & CI

Two deploys. One repo. Pushes to `main` deploy both.

## Targets

- **Vercel** — `apps/web` (Next.js 15). Auto-deploys on push to `main`. Preview URLs on every PR.
- **Render** — `apps/api` (NestJS). Render Starter (paid, no sleep — Adnan-approved). Auto-deploys on push to `main`.

## Render build

`apps/api/render.yaml`:

- Build: `pnpm install --frozen-lockfile && pnpm --filter @repo/db prisma generate && pnpm --filter api build`
- Start: `node apps/api/dist/main.js`
- Health: `/health` endpoint returns 200

## Vercel build

- Root: `apps/web`
- Build: `pnpm --filter web build`
- Output: `.next`

## CI workflow

`.github/workflows/ci.yml`:

- On PR: typecheck + test + build (both apps via turbo cache)
- On push to main: above + Vercel + Render auto-deploy webhooks fire

## Env vars

Source of truth: `.env.example` (annotated `# WEB ONLY` / `# API ONLY` / `# BOTH`). Sync before every deploy:

- Vercel dashboard → all `NEXT_PUBLIC_*` + web envs
- Render dashboard → all api envs (`DATABASE_URL`, `SUPABASE_JWT_SECRET`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `META_*`, `WHATSAPP_TOKEN_ENC_KEY`, `CORS_ALLOWED_ORIGINS`)

## TBD

- Render `render.yaml` committed
- Vercel build env config screenshot
- CI workflow YAML committed
- Domain attached (Vercel: `app.<domain>` for web; Render: `api.<domain>` for api) — only if time and Adnan approves a hackathon domain
