import type { PrismaService } from '../../prisma/prisma.service';
import type { ToolRegistry, WorkspaceContext } from './tool-registry';
import { GetCustomerOrdersArgsSchema, GetOrderStatusArgsSchema } from '@repo/types';

export function registerOrderTools(registry: ToolRegistry, prisma: PrismaService): void {
  registry.register({
    name: 'get_customer_orders',
    description: "USE THIS WHEN: customer asks about their previous orders or order history.",
    schema: GetCustomerOrdersArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { limit = 5 } = GetCustomerOrdersArgsSchema.parse(args);
      const orders = await prisma.order.findMany({
        where: { workspaceId: ctx.workspaceId, contactId: ctx.contactId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { items: true },
      });
      return orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        totalRupees: Number(o.totalCents) / 100,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          priceRupees: Number(i.unitPriceCents) / 100,
        })),
      }));
    },
  });

  registry.register({
    name: 'get_order_status',
    description: 'USE THIS WHEN: customer asks about a specific order number.',
    schema: GetOrderStatusArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { orderNumber } = GetOrderStatusArgsSchema.parse(args);
      const order = await prisma.order.findFirst({
        where: { workspaceId: ctx.workspaceId, orderNumber },
        include: { items: true },
      });
      if (!order) return { error: `Order ${orderNumber} not found` };
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        totalRupees: Number(order.totalCents) / 100,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      };
    },
  });
}
