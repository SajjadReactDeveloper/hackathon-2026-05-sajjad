# Skill: wire-tile — Add a Dashboard Tile or Chart

**Trigger:** User says "add a dashboard tile for <metric>", "wire the <X> tile", or invokes `/wire-tile`.

## What this skill produces

End-to-end: SQL view → service method → API endpoint → React component → PostHog event.

| Layer | File |
|---|---|
| DB view (if new) | `packages/db/prisma/migrations/<ts>_add_<name>_view/migration.sql` |
| Service method | `apps/api/src/analytics/analytics.service.ts` |
| Response Zod schema | `packages/types/src/api-contracts.ts` |
| Controller endpoint | `apps/api/src/analytics/analytics.controller.ts` |
| React tile component | `apps/web/src/components/dashboard/<TileName>.tsx` |
| Dashboard page import | `apps/web/src/app/(app)/dashboard/page.tsx` |

## Hard rules

1. **Service reads views only via `$queryRaw`** — never query OLTP tables in analytics methods.
2. **60-second in-memory cache** on analytics results — `AnalyticsService` has a simple `Map<key, {data, expiresAt}>` cache.
3. **Zod validates the API response** — define schema in `packages/types/src/api-contracts.ts`.
4. **PostHog `tile_viewed` event** fired on component mount with `{ tile: '<tileName>' }`.
5. **shadcn Card wrapper** around every tile — `<Card><CardHeader>...</CardHeader><CardContent>...</CardContent></Card>`.
6. **Recharts for charts** — `BarChart`, `LineChart`, or `AreaChart`. No other chart lib.
7. **Responsive by default** — wrap Recharts in `<ResponsiveContainer width="100%" height={300}>`.

## Template

### Service method
```ts
async get<TileName>(workspaceId: string): Promise<<TileNameData>[]> {
  const cacheKey = `<tile-name>:${workspaceId}`;
  const cached = this.cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data as <TileNameData>[];

  const rows = await this.prisma.$queryRaw<<TileNameData>[]>`
    SELECT ...
    FROM v_<tile_name>
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY ...
  `;

  this.cache.set(cacheKey, { data: rows, expiresAt: Date.now() + 60_000 });
  return rows;
}
```

### React tile component
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { usePostHog } from 'posthog-js/react';

export function <TileName>Tile() {
  const [data, setData] = useState([]);
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('tile_viewed', { tile: '<tile-name>' });
    // fetch from API
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle><Tile Display Name></CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

## After generating files

1. Add view SQL as a raw migration if the view is new: `pnpm --filter @repo/db prisma migrate dev --name add-<name>-view`.
2. Import the tile in `apps/web/src/app/(app)/dashboard/page.tsx`.
3. Run `pnpm typecheck` — zero errors.
4. Verify the endpoint returns data in dev with `curl`.
