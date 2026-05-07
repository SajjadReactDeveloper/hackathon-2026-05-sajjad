import type { PrismaService } from '../../prisma/prisma.service';
import type { ToolRegistry, WorkspaceContext } from './tool-registry';
import {
  SearchProductsArgsSchema,
  GetProductArgsSchema,
  CheckStockArgsSchema,
} from '@repo/types';

export function registerProductTools(registry: ToolRegistry, prisma: PrismaService): void {
  registry.register({
    name: 'search_products',
    description: 'USE THIS WHEN: customer asks about products, prices, availability, or wants to browse. Searches products by name, description, or SKU.',
    schema: SearchProductsArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { query, limit = 5 } = SearchProductsArgsSchema.parse(args);
      const products = await prisma.product.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          active: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, sku: true, name: true, description: true, priceCents: true, stock: true, imageUrl: true },
        take: limit,
      });
      return products.map((p) => ({
        ...p,
        priceRupees: Number(p.priceCents) / 100,
        priceCents: Number(p.priceCents),
      }));
    },
  });

  registry.register({
    name: 'get_product',
    description: 'USE THIS WHEN: you have a specific product ID and need full details.',
    schema: GetProductArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { productId } = GetProductArgsSchema.parse(args);
      const p = await prisma.product.findFirst({
        where: { id: productId, workspaceId: ctx.workspaceId, active: true },
      });
      if (!p) return { error: 'Product not found' };
      return { ...p, priceRupees: Number(p.priceCents) / 100, priceCents: Number(p.priceCents) };
    },
  });

  registry.register({
    name: 'check_stock',
    description: 'USE THIS WHEN: customer asks if a product is in stock or available.',
    schema: CheckStockArgsSchema,
    handler: async (args: unknown, ctx: WorkspaceContext) => {
      const { productId } = CheckStockArgsSchema.parse(args);
      const p = await prisma.product.findFirst({
        where: { id: productId, workspaceId: ctx.workspaceId },
        select: { name: true, stock: true, active: true },
      });
      if (!p) return { error: 'Product not found' };
      return { name: p.name, inStock: p.stock > 0 && p.active, stockCount: p.stock };
    },
  });
}
