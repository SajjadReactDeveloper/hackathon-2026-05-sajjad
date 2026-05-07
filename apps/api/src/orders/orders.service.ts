import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { FraudScoreService } from '../ai/fraud-score.service';
import { NotFoundError } from '../common/errors';
import { OrderStatus } from '@repo/db';

export interface ParsedOrderItem {
  name: string;
  quantity: number;
  unitPriceCents?: number;
}

export interface CreateOrderDto {
  workspaceId: string;
  contactId: string;
  conversationId: string;
  sourceMessageId?: string;
  items: ParsedOrderItem[];
  deliveryAddress?: string;
  notes?: string;
  createdVia: 'voice_note' | 'image' | 'ai_parser' | 'manual';
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudScore: FraudScoreService,
    @InjectPinoLogger(OrdersService.name) private readonly logger: PinoLogger,
  ) {}

  async createFromParse(dto: CreateOrderDto) {
    const totalCents = BigInt(
      dto.items.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0),
    );

    const { score, signals } = await this.fraudScore.scoreOrder(
      dto.contactId,
      dto.workspaceId,
      totalCents,
      dto.deliveryAddress,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const count = await tx.order.count({ where: { workspaceId: dto.workspaceId } });
      return tx.order.create({
        data: {
          workspaceId: dto.workspaceId,
          contactId: dto.contactId,
          conversationId: dto.conversationId,
          sourceMessageId: dto.sourceMessageId,
          orderNumber: `ORD-${String(count + 1).padStart(4, '0')}`,
          status: 'pending',
          totalCents,
          currency: 'PKR',
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          createdVia: dto.createdVia,
          fraudScore: score,
          fraudSignals: signals,
          items: {
            create: dto.items.map((item) => ({
              workspaceId: dto.workspaceId,
              name: item.name,
              quantity: item.quantity,
              unitPriceCents: BigInt(item.unitPriceCents ?? 0),
              lineTotalCents: BigInt((item.unitPriceCents ?? 0) * item.quantity),
            })),
          },
        },
        include: { items: true },
      });
    });

    this.logger.info(
      { workspaceId: dto.workspaceId, orderId: order.id, fraudScore: score, createdVia: dto.createdVia },
      'Order created from parse',
    );

    return order;
  }

  async list(workspaceId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { workspaceId },
        include: {
          contact: { select: { id: true, waPhone: true, displayName: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit };
  }

  async getById(workspaceId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: {
        contact: { select: { id: true, waPhone: true, displayName: true } },
        items: true,
      },
    });
    if (!order) throw new NotFoundError('Order', id);
    return order;
  }

  async updateStatus(workspaceId: string, id: string, status: string) {
    const updated = await this.prisma.order.updateMany({
      where: { id, workspaceId },
      data: { status: status as OrderStatus },
    });
    if (updated.count === 0) throw new NotFoundError('Order', id);
    return this.getById(workspaceId, id);
  }
}
