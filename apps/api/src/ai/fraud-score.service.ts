import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FraudScoreResult {
  score: number;
  signals: string[];
}

@Injectable()
export class FraudScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async scoreOrder(
    contactId: string,
    workspaceId: string,
    totalCents: bigint,
    deliveryAddress?: string | null,
  ): Promise<FraudScoreResult> {
    const signals: string[] = [];
    let score = 0;

    const previousOrders = await this.prisma.order.count({
      where: { contactId, workspaceId },
    });

    if (previousOrders === 0) {
      score += 30;
      signals.push('New contact — no order history');
    }

    if (totalCents > 500_000n) { // > 5000 PKR
      score += 20;
      signals.push('High order value (> PKR 5,000)');
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 15) {
      score += 20;
      signals.push('Vague or missing delivery address');
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrders = await this.prisma.order.count({
      where: { contactId, workspaceId, createdAt: { gte: oneDayAgo } },
    });

    if (recentOrders >= 2) {
      score += 15;
      signals.push('Multiple orders in last 24 hours');
    }

    return { score: Math.min(score, 100), signals };
  }
}
