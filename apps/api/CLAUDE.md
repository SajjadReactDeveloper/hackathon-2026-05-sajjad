# apps/api — NestJS API Rules

## Stack
NestJS 11, TypeScript strict, Prisma via `@repo/db`, pnpm. Deployed on Render Starter.

## Layer rules (non-negotiable)

- **Controller** = parse Zod + `@UseGuards(SupabaseAuthGuard, WorkspaceGuard)` + call service + return. Nothing else.
- **Service** = business logic + Prisma. First arg is always `workspaceId: string`.
- **Route never queries DB**. Never `this.prisma.*` in a controller.
- **No SQL strings** — all DB via `PrismaService`. Raw SQL only in `*Service.$queryRaw` (analytics views), always parameterized.

## Auth

- `SupabaseAuthGuard` verifies HS256 JWT with `SUPABASE_JWT_SECRET`. Extracts `sub` (supabaseUserId) and `email`.
- `WorkspaceGuard` resolves the workspace for the route and injects `workspaceId` via `@WorkspaceId()` decorator.
- Never read `workspaceId` from request body in a service.

## Errors

Throw only typed errors from `src/common/errors.ts`:
- `AppError` (generic)
- `NotFoundError`
- `ValidationError`
- `ExternalAPIError`
`AllExceptionsFilter` maps these to HTTP responses. Never `throw new Error('string')`.

## Logging

Inject `PinoLogger` via `@InjectPinoLogger(ClassName.name)`. No `console.log` anywhere. Redactor strips `access_token`, `Authorization`, `password`, `phone` (last 6).

## WhatsApp tokens

`Workspace.accessTokenEnc` is AES-256-GCM encrypted. Decrypt only inside `WhatsAppService` request methods using `src/common/crypto.ts`. Never log the decrypted value.

## Pipeline

`PipelineService` is intentionally long (~300 lines). Do not split unless it exceeds 300 lines.

## Adding modules

Use `/add-service` skill — it enforces the layer rules above.

## Commands

```bash
pnpm dev                    # nest start --watch
pnpm build                  # nest build → dist/
pnpm typecheck              # tsc --noEmit
pnpm test                   # jest unit tests
pnpm test:e2e               # supertest e2e
```
