import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

interface DailyRevenue {
  day: Date;
  revenueCents: bigint;
  orderCount: bigint;
}

interface DailyMessages {
  day: Date;
  inboundCount: bigint;
  outboundCount: bigint;
  aiCount: bigint;
}

interface HeatmapCell {
  hour: number;
  dayOfWeek: number;
  count: bigint;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(AnalyticsService.name) private readonly logger: PinoLogger,
  ) {}

  async getDashboardTiles(workspaceId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(todayStart);
    monthStart.setDate(1);

    const [
      todayRevResult,
      weekRevResult,
      monthRevResult,
      totalMessages,
      aiMessages,
      openConversations,
      totalOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { workspaceId, createdAt: { gte: todayStart }, status: { not: 'cancelled' } },
        _sum: { totalCents: true },
      }),
      this.prisma.order.aggregate({
        where: { workspaceId, createdAt: { gte: weekStart }, status: { not: 'cancelled' } },
        _sum: { totalCents: true },
      }),
      this.prisma.order.aggregate({
        where: { workspaceId, createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
        _sum: { totalCents: true },
      }),
      this.prisma.message.count({ where: { workspaceId } }),
      this.prisma.message.count({ where: { workspaceId, aiGenerated: true } }),
      this.prisma.conversation.count({ where: { workspaceId, status: 'open' } }),
      this.prisma.order.count({ where: { workspaceId } }),
    ]);

    const outboundTotal = await this.prisma.message.count({
      where: { workspaceId, direction: 'outbound' },
    });

    return {
      todayRevenueCents: Number(todayRevResult._sum.totalCents ?? 0),
      weekRevenueCents: Number(weekRevResult._sum.totalCents ?? 0),
      monthRevenueCents: Number(monthRevResult._sum.totalCents ?? 0),
      totalMessages,
      aiReplyRate: outboundTotal > 0 ? Math.round((aiMessages / outboundTotal) * 100) : 0,
      openConversations,
      totalOrders,
    };
  }

  async getDailyRevenue(workspaceId: string, days = 30) {
    const rows = await this.prisma.$queryRaw<DailyRevenue[]>`
      SELECT
        DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Karachi') AS day,
        COALESCE(SUM("totalCents"), 0) AS "revenueCents",
        COUNT(*) AS "orderCount"
      FROM orders
      WHERE "workspaceId" = ${workspaceId}::uuid
        AND "createdAt" >= NOW() - INTERVAL '1 day' * ${days}
        AND status != 'cancelled'
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      revenueCents: Number(r.revenueCents),
      orderCount: Number(r.orderCount),
    }));
  }

  async getMessageVolume(workspaceId: string, days = 14) {
    const rows = await this.prisma.$queryRaw<DailyMessages[]>`
      SELECT
        DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Karachi') AS day,
        COUNT(*) FILTER (WHERE direction = 'inbound') AS "inboundCount",
        COUNT(*) FILTER (WHERE direction = 'outbound') AS "outboundCount",
        COUNT(*) FILTER (WHERE "aiGenerated" = true) AS "aiCount"
      FROM messages
      WHERE "workspaceId" = ${workspaceId}::uuid
        AND "createdAt" >= NOW() - INTERVAL '1 day' * ${days}
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      inboundCount: Number(r.inboundCount),
      outboundCount: Number(r.outboundCount),
      aiCount: Number(r.aiCount),
    }));
  }

  async getHeatmap(workspaceId: string) {
    const rows = await this.prisma.$queryRaw<HeatmapCell[]>`
      SELECT
        EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Karachi')::int AS hour,
        EXTRACT(DOW FROM "createdAt" AT TIME ZONE 'Asia/Karachi')::int AS "dayOfWeek",
        COUNT(*)::bigint AS count
      FROM messages
      WHERE "workspaceId" = ${workspaceId}::uuid
        AND direction = 'inbound'
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    return rows.map((r) => ({
      hour: r.hour,
      dayOfWeek: r.dayOfWeek,
      count: Number(r.count),
    }));
  }
}
