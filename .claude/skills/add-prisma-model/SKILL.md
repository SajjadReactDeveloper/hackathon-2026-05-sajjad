# Skill: add-prisma-model — Add a Prisma Model

**Trigger:** User says "add a Prisma model for <ModelName>", "add the <X> table", or invokes `/add-prisma-model`.

## What this skill does

1. Inserts a new model block into `packages/db/prisma/schema.prisma`.
2. Runs `pnpm --filter @repo/db prisma migrate dev --name <migration-name>`.
3. Runs `pnpm --filter @repo/db prisma generate`.
4. Exports the new type from `packages/db/src/index.ts` if needed.

**User must run step 2–3 themselves** — Claude writes the schema block; user runs the commands (Claude doesn't wait on long processes).

## Model template (mandatory fields)

Every tenant-scoped model **must** include these fields:

```prisma
model <ModelName> {
  id          String   @id @default(uuid()) @db.Uuid
  workspaceId String   @db.Uuid
  // ... domain-specific fields ...
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@map("<model_names>")  // snake_case plural
}
```

## Hard rules

1. **`@@map` is always `snake_case` plural** — e.g. `OrderItem` → `order_items`.
2. **`workspaceId` always has `@db.Uuid` and a `@@index([workspaceId])`** — required for RLS + query performance.
3. **`onDelete: Cascade` on the Workspace relation** — tenant data is deleted when workspace is deleted.
4. **Money is `BigInt` cents** — never `Float` or `Decimal` for monetary amounts.
5. **Never add `@default(autoincrement())` for IDs** — always `@default(uuid())` with `@db.Uuid`.
6. **For models that need vector embeddings**, use `Unsupported("vector(1536)")` — DO NOT use a standard type.
7. **Never edit migration files by hand** — always generate with `prisma migrate dev`.
8. **Add to Workspace model** — new model needs a relation field added to the `Workspace` model too.

## Composite unique constraints

When a model has a per-workspace uniqueness requirement (e.g. `sku` per workspace, `waPhone` per workspace):
```prisma
@@unique([workspaceId, fieldName])
```

## After writing the schema block

Tell the user to run:
```bash
pnpm --filter @repo/db prisma migrate dev --name add-<model-name>
pnpm --filter @repo/db prisma generate
```

Then verify `pnpm typecheck` passes from the root.

## Example — adding a `Notification` model

```prisma
model Notification {
  id          String   @id @default(uuid()) @db.Uuid
  workspaceId String   @db.Uuid
  userId      String   @db.Uuid
  title       String
  body        String
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id])

  @@index([workspaceId])
  @@index([userId, read])
  @@map("notifications")
}
```

Then add to `Workspace` model:
```prisma
notifications Notification[]
```
