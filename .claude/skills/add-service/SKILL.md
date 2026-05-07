# Skill: add-service — Add a NestJS Domain Module

**Trigger:** User says "add a NestJS module", "add a service for <domain>", "create the <domain> module", or invokes `/add-service`.

## What this skill produces

For domain `<Name>` (e.g. `Orders`):

| File | Purpose |
|---|---|
| `apps/api/src/<name>/<name>.module.ts` | NestJS module wiring |
| `apps/api/src/<name>/<name>.controller.ts` | HTTP layer — Zod parse → call service → return |
| `apps/api/src/<name>/<name>.service.ts` | Business logic — Prisma only here |
| `apps/api/src/<name>/dto/<name>.dto.ts` | Zod schemas for request/response |
| `apps/api/src/<name>/<name>.e2e-spec.ts` (in `test/`) | supertest scaffold |
| (import into `apps/api/src/app.module.ts`) | Registers the module |

## Hard rules (enforced by this skill — never deviate)

1. **Controller never touches Prisma.** Route = parse Zod + call service + return DTO.
2. **Service always takes `workspaceId` as first arg** on every method — never read from request body inside service.
3. **Guards on every protected route:** `@UseGuards(SupabaseAuthGuard, WorkspaceGuard)` at class level.
4. **No SQL strings in service.** All DB access via `PrismaService` methods. Raw SQL only inside `$queryRaw` when truly needed (analytics views) — always parameterized.
5. **Typed errors only.** Throw `AppError`, `NotFoundError`, `ValidationError`, `ExternalAPIError` — never `new Error('string')`.
6. **Logger injected** — `@InjectPinoLogger(NameService.name)`.
7. **No `console.log`** anywhere.

## Template

### `<name>.module.ts`
```ts
import { Module } from '@nestjs/common';
import { <Name>Controller } from './<name>.controller';
import { <Name>Service } from './<name>.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [<Name>Controller],
  providers: [<Name>Service],
  exports: [<Name>Service],
})
export class <Name>Module {}
```

### `<name>.controller.ts`
```ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { <Name>Service } from './<name>.service';
import { Create<Name>Schema, type Create<Name>Dto } from './dto/<name>.dto';

@Controller('<names>')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class <Name>Controller {
  constructor(private readonly <name>Service: <Name>Service) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.<name>Service.list(workspaceId);
  }

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(Create<Name>Schema)) dto: Create<Name>Dto,
  ) {
    return this.<name>Service.create(workspaceId, dto);
  }
}
```

### `<name>.service.ts`
```ts
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../common/errors';
import type { Create<Name>Dto } from './dto/<name>.dto';

@Injectable()
export class <Name>Service {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(<Name>Service.name) private readonly logger: PinoLogger,
  ) {}

  async list(workspaceId: string) {
    return this.prisma.<name>.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, dto: Create<Name>Dto) {
    return this.prisma.<name>.create({
      data: { ...dto, workspaceId },
    });
  }

  async getById(workspaceId: string, id: string) {
    const item = await this.prisma.<name>.findFirst({
      where: { id, workspaceId },
    });
    if (!item) throw new NotFoundError('<Name>', id);
    return item;
  }
}
```

### `dto/<name>.dto.ts`
```ts
import { z } from 'zod';

export const Create<Name>Schema = z.object({
  name: z.string().min(1).max(100),
  // ... add domain-specific fields
});

export type Create<Name>Dto = z.infer<typeof Create<Name>Schema>;
```

## After generating files

1. Import `<Name>Module` in `apps/api/src/app.module.ts` imports array.
2. Run `pnpm typecheck` from root — zero errors required.
3. Verify controller has no direct `prisma.*` calls.
