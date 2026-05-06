# docs/architecture/auth.md — Auth Flow

Single source of truth: Supabase Auth. Web has the session; NestJS verifies the JWT.

## Token flow

1. User signs in on web (Google OAuth or email/password) via `@supabase/ssr`.
2. Supabase returns access token (HS256, signed with `SUPABASE_JWT_SECRET`).
3. Web's `lib/api-client.ts` reads the session and attaches `Authorization: Bearer <jwt>` to every NestJS call.
4. NestJS `SupabaseAuthGuard` (in `apps/api/src/common/auth/`) verifies the JWT:
   - HS256 signature against `process.env.SUPABASE_JWT_SECRET`
   - `aud === 'authenticated'`
   - `exp` not expired
5. Guard injects `CurrentUser { supabaseUserId, email }` decorator value.
6. `WorkspaceGuard` then resolves `workspaceId` from `WorkspaceMember` join — rejects 403 if user not a member of the requested workspace.

## Hard rules

- Use `SUPABASE_JWT_SECRET` (NOT the anon key) for JWT verification.
- Never read `workspaceId` from request body inside a service — only from `WorkspaceContext` injected by `WorkspaceGuard`.
- Never decode the JWT manually outside the guard. Use `jose` library.
- Onboarding creates the first `Workspace` + `WorkspaceMember(role='owner')` row in a transaction.

## Files

- `apps/web/src/lib/supabase/{server,browser,middleware}.ts` — Supabase client (per environment)
- `apps/web/src/middleware.ts` — session refresh + route guards
- `apps/web/src/lib/api-client.ts` — JWT-attaching fetch wrapper
- `apps/api/src/common/auth/supabase-auth.guard.ts` — JWT verification
- `apps/api/src/common/auth/workspace.guard.ts` — workspace membership check
- `apps/api/src/common/auth/current-user.decorator.ts` — `CurrentUser` value

## TBD on Day 1

- Worked example of guard flow with code link
- RLS policy listing (see `realtime.md`)
- Logout / token-refresh edge case
- Webhook authentication: webhook routes are EXEMPT from `SupabaseAuthGuard` — they auth via Meta signature instead. Mark with `@Public()` decorator.
