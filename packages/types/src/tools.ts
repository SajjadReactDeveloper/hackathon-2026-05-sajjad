import { z } from 'zod';

export const SearchProductsArgsSchema = z.object({
  query: z.string().describe('Search term for product name, description, or SKU'),
  limit: z.number().int().min(1).max(10).default(5).optional(),
});

export const GetProductArgsSchema = z.object({
  productId: z.string().describe('Product UUID'),
});

export const CheckStockArgsSchema = z.object({
  productId: z.string().describe('Product UUID'),
});

export const GetCustomerOrdersArgsSchema = z.object({
  limit: z.number().int().min(1).max(10).default(5).optional(),
});

export const GetOrderStatusArgsSchema = z.object({
  orderNumber: z.string().describe('Order number like ORD-0042'),
});

export const SearchKnowledgeBaseArgsSchema = z.object({
  query: z.string().describe('Question or topic to look up in knowledge base documents'),
});

export const GetDeliveryInfoArgsSchema = z.object({
  city: z.string().optional().describe('City name to check delivery availability'),
});

export const EscalateToHumanArgsSchema = z.object({
  reason: z.string().describe('Why the conversation needs human attention'),
});

export type SearchProductsArgs = z.infer<typeof SearchProductsArgsSchema>;
export type GetProductArgs = z.infer<typeof GetProductArgsSchema>;
export type CheckStockArgs = z.infer<typeof CheckStockArgsSchema>;
export type GetCustomerOrdersArgs = z.infer<typeof GetCustomerOrdersArgsSchema>;
export type GetOrderStatusArgs = z.infer<typeof GetOrderStatusArgsSchema>;
export type SearchKnowledgeBaseArgs = z.infer<typeof SearchKnowledgeBaseArgsSchema>;
export type GetDeliveryInfoArgs = z.infer<typeof GetDeliveryInfoArgsSchema>;
export type EscalateToHumanArgs = z.infer<typeof EscalateToHumanArgsSchema>;
