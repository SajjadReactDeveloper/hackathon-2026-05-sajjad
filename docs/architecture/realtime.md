# docs/architecture/realtime.md — Supabase Realtime + RLS

Browser subscribes to Postgres row changes for sub-second Inbox updates without polling.

## Architecture

```
Web (Next.js, Vercel)
  ├─ Server fetches initial data via NestJS API (with Supabase JWT)
  ├─ Browser opens Realtime subscription via @supabase/supabase-js
  │   ├─ channel('messages').on('INSERT' | 'UPDATE', filter: 'conversation_id=eq.X')
  │   └─ channel('conversations').on('*', filter: 'workspace_id=eq.X')
  ├─ Realtime auth uses the same Supabase JWT — RLS gates row access
  └─ React state reconciles: append on INSERT, upsert on UPDATE
```

## Tables published

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages, conversations;
```

## RLS policies (Day 1 migration)

- `messages` SELECT: `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`
- `conversations` SELECT: same shape
- `contacts` SELECT: same shape
- `orders` SELECT: same shape

Service-layer enforcement is also kept (defense-in-depth — see `CLAUDE.md` "Open questions").

## Hard rules

- **Never disable RLS.** Realtime auth depends on it.
- **Test cross-workspace isolation:** sign in as workspace A in tab 1, fire a message; sign in as B in tab 2 must NOT see the message. Day 1 acceptance test.
- **Reconnect handling:** subscription error event → fall back to manual "Refresh" button.
- **Subscription filters use SQL eq syntax** (`workspace_id=eq.X`), not arbitrary expressions.

## TBD on Day 2

- Concrete React hook example (`useRealtimeMessages`)
- Subscription error UX
- RLS policy SQL listing as committed code (drizzle-style migration or raw SQL)
